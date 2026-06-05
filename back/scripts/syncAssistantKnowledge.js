import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const TABLE = process.env.ASSISTANT_KNOWLEDGE_TABLE || 'assistant_knowledge_documents';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 1536);
const BATCH_SIZE = Number(process.env.KNOWLEDGE_EMBED_BATCH_SIZE || 24);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    includeVehicles: true,
    dryRun: false,
    vehicleLimit: Number(process.env.KNOWLEDGE_VEHICLE_LIMIT || 500),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--skip-vehicles') parsed.includeVehicles = false;
    if (arg === '--dry-run') parsed.dryRun = true;
    if (arg === '--vehicle-limit') parsed.vehicleLimit = Number(args[++index]);
  }

  return parsed;
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required');
  return new GoogleGenAI({ apiKey });
};

const getContentHash = (row) => crypto
  .createHash('sha256')
  .update([
    row.metadata?.category || row.source || 'faq',
    row.title || 'Untitled knowledge document',
    row.content || '',
    JSON.stringify(row.metadata || {}),
    EMBEDDING_MODEL,
  ].join('\n'))
  .digest('hex');

const fetchManualKnowledgeRows = async (supabase) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, source, source_id, title, content, metadata, embedding_content_hash')

  if (error) throw error;

  return (data || [])
    .filter((row) => row.metadata?.source !== 'vehicle')
    .filter((row) => row.embedding_content_hash !== getContentHash(row));
};

const fetchVehicleKnowledge = async (supabase, limit) => {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      id,
      title,
      description,
      city,
      country,
      price_per_day,
      price_per_week,
      price_per_month,
      pickup_address,
      delivery_fee,
      available_from,
      available_to,
      is_active,
      cars!inner (
        id,
        brand,
        model,
        year,
        color,
        fuel_type,
        transmission,
        mileage,
        seats,
        description
      )
    `)
    .eq('is_active', true)
    .limit(limit);

  if (error) throw error;

  return (data || []).map((listing) => {
    const car = listing.cars;
    const vehicleName = [car?.brand, car?.model, car?.year].filter(Boolean).join(' ');

    return {
      source: 'vehicle_information',
      source_id: listing.id,
      category: 'vehicle_information',
      title: listing.title || vehicleName || 'Vehicle listing',
      content: `
Vehicle listing: ${listing.title || vehicleName || 'Vehicle'}.
Location: ${[listing.city, listing.country].filter(Boolean).join(', ') || 'Not specified'}.
Availability window: ${listing.available_from || 'not specified'} to ${listing.available_to || 'not specified'}.
Pricing: ${listing.price_per_day || 'not specified'} per day, ${listing.price_per_week || 'not specified'} per week, ${listing.price_per_month || 'not specified'} per month.
Pickup address: ${listing.pickup_address || 'not specified'}.
Delivery fee: ${listing.delivery_fee ?? 0}.
Vehicle details: ${vehicleName || 'Not specified'}, color ${car?.color || 'not specified'}, fuel ${car?.fuel_type || 'not specified'}, transmission ${car?.transmission || 'not specified'}, seats ${car?.seats || 'not specified'}, mileage ${car?.mileage || 'not specified'}.
Listing description: ${listing.description || 'No listing description provided'}.
Vehicle description: ${car?.description || 'No vehicle description provided'}.
      `,
      metadata: {
        tags: ['vehicle', 'listing', listing.city, listing.country, car?.brand, car?.fuel_type, car?.transmission].filter(Boolean),
        source: 'vehicle',
        listingId: listing.id,
        carId: car?.id,
        city: listing.city,
        country: listing.country,
        pricePerDay: listing.price_per_day,
        availableFrom: listing.available_from,
        availableTo: listing.available_to,
      },
    };
  });
};

const getEmbeddingValues = (embedding) => embedding?.values || embedding?.embedding?.values || embedding?.embedding || [];

const embedRows = async (gemini, rows) => {
  const embedded = [];

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const input = batch.map((row) => [
      `Title: ${row.title || 'Untitled knowledge document'}`,
      `Category: ${row.metadata?.category || row.source || row.category || 'faq'}`,
      `Tags: ${(row.metadata?.tags || []).join(', ')}`,
      row.content || '',
    ].join('\n'));

    const response = await gemini.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: input,
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const embeddings = response.embeddings || [];
    if (embeddings.length !== batch.length) {
      throw new Error(`Gemini returned ${embeddings.length} embeddings for ${batch.length} inputs`);
    }

    embeddings.forEach((item, batchIndex) => {
      const values = getEmbeddingValues(item);
      if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Gemini embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${values?.length || 0}`);
      }

      embedded.push({
        ...batch[batchIndex],
        embedding: values,
        embedding_content_hash: getContentHash(batch[batchIndex]),
      });
    });

    console.log(`Embedded ${Math.min(index + batch.length, rows.length)}/${rows.length} chunks`);
  }

  return embedded;
};

const deleteSource = async (supabase, source) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('metadata->>source', source);

  if (error) throw error;
};

const upsertRows = async (supabase, rows) => {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE).map((row) => ({
      id: row.id,
      source: row.source || row.category || 'faq',
      source_id: row.source_id || null,
      title: row.title || 'Untitled knowledge document',
      content: row.content || '',
      metadata: row.metadata || {},
      embedding: row.embedding,
      embedding_content_hash: row.embedding_content_hash,
    }));

    const updateRows = batch.filter((row) => row.id);
    const insertRows = batch.filter((row) => !row.id);

    for (const row of updateRows) {
      const { id, ...updates } = row;
      const { error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    }

    if (insertRows.length) {
      const { error } = await supabase
        .from(TABLE)
        .insert(insertRows);

      if (error) throw error;
    }

    console.log(`Upserted ${Math.min(index + batch.length, rows.length)}/${rows.length} chunks`);
  }
};

const main = async () => {
  const args = parseArgs();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const gemini = args.dryRun ? null : getGeminiClient();

  const manualRows = await fetchManualKnowledgeRows(supabase);
  const vehicleRows = args.includeVehicles
    ? await fetchVehicleKnowledge(supabase, args.vehicleLimit)
    : [];
  const rows = [...manualRows, ...vehicleRows];

  console.log(`Prepared ${rows.length} knowledge rows (${manualRows.length} manual, ${vehicleRows.length} vehicles)`);

  if (args.dryRun) {
    console.log('Dry run complete. No embeddings were created and Supabase was not modified.');
    return;
  }

  if (args.includeVehicles) await deleteSource(supabase, 'vehicle');

  const embeddedRows = await embedRows(gemini, rows);
  await upsertRows(supabase, embeddedRows);
  console.log(`Done. Stored ${embeddedRows.length} rows in ${TABLE}.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
