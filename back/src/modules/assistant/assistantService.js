import OpenAI from 'openai';
import { FunctionCallingConfigMode, GoogleGenAI, Type } from '@google/genai';
import { assistantToolDefinitions, executeAssistantTool } from './assistantTools.js';
import { createConversationId, logAssistantMessage, logAssistantToolCall } from './assistantModel.js';

const model = process.env.OPENAI_MODEL || 'gpt-5';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const assistantProvider = String(process.env.ASSISTANT_PROVIDER || 'openai').toLowerCase();
const maxContextMessages = Number(process.env.ASSISTANT_MAX_CONTEXT_MESSAGES || 12);
const maxToolRounds = Number(process.env.ASSISTANT_MAX_TOOL_ROUNDS || 3);

const assistantSystemPrompt = `
You are Rentify AI Concierge for a car rental marketplace.
Use tools when you need live Rentify data about reservations, vehicles, listings, or the authenticated user.
Never claim you performed a booking, cancellation, payment, profile edit, upload, approval, or any other write action.
If the user asks for a write action, explain that Phase 1 is read-only and give concise next-step guidance.
Only use data returned by tools for account-specific claims.
Keep answers practical, concise, and friendly.
When showing profile data, never mention ids, image URLs, raw timestamps, or internal fields.
When showing reservations or vehicles, summarize the most useful fields in short grouped bullets.
If a user says "it" or asks for a price without a clear vehicle/listing id from context, ask which numbered vehicle they mean instead of searching and showing unrelated vehicles.
For rental price estimates, rental dates are inclusive. If a user asks for N days starting on a date, call calculateReservationPrice with durationDays=N and do not invent an endDate.
`.trim();

const normalizeContext = (context = []) => (
  context
    .filter((message) => ['user', 'assistant'].includes(message.role) && message.content)
    .slice(-maxContextMessages)
    .map((message) => ({ role: message.role, content: message.content }))
);

const parseResponseText = (completion) => (
  completion.choices?.[0]?.message?.content?.trim?.() || ''
);

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return new GoogleGenAI({ apiKey });
};

const buildInitialMessages = ({ context, message, user }) => [
  { role: 'system', content: assistantSystemPrompt },
  {
    role: 'system',
    content: `Authenticated Rentify user context: id=${user.id}; role=${user.role || 'unknown'}. Tool calls must use this user context automatically.`,
  },
  ...normalizeContext(context),
  { role: 'user', content: message },
];

const compactListing = (listing) => {
  const carName = listing.car
    ? `${listing.car.brand || ''} ${listing.car.model || ''}`.trim()
    : '';

  return {
    id: listing.id,
    listingTitle: listing.title,
    carName: carName || listing.title || 'Vehicle',
    city: listing.city,
    country: listing.country,
    pricePerDay: listing.pricePerDay,
    car: listing.car ? {
      id: listing.car.id,
      brand: listing.car.brand,
      model: listing.car.model,
      year: listing.car.year,
      transmission: listing.car.transmission,
      fuelType: listing.car.fuelType,
      seats: listing.car.seats,
      image: listing.car.images?.[0]?.imageUrl || null,
    } : null,
  };
};

const createToolResultPreview = ({ name, data }) => {
  if (name === 'getReservations') {
    return {
      type: 'reservations',
      title: 'Reservations',
      items: (data || []).slice(0, 5).map((item) => ({
        id: item.id,
        title: item.listing?.title || `${item.listing?.car?.brand || ''} ${item.listing?.car?.model || ''}`.trim(),
        city: item.listing?.city,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        totalPrice: item.totalPrice,
      })),
    };
  }

  if (name === 'searchVehicles') {
    return {
      type: 'vehicles',
      title: 'Vehicles',
      items: (data.items || []).slice(0, 5).map(compactListing),
    };
  }

  if (name === 'getFavorites') {
    return {
      type: 'vehicles',
      title: 'Favorite vehicles',
      items: (data.items || []).slice(0, 5).map(compactListing),
    };
  }

  if (name === 'getUserProfile') {
    return {
      type: 'profile',
      title: 'Profile',
      profile: {
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email,
        phone: data.phone,
        role: data.role,
        accountStatus: data.accountStatus,
        verificationStatus: data.verificationStatus,
        reservations: data.stats?.client?.reservations,
        favorites: data.stats?.client?.favorites,
        reviews: data.stats?.client?.reviews,
      },
    };
  }

  if (name === 'calculateReservationPrice') {
    return {
      type: 'price',
      title: 'Price estimate',
      estimate: data,
    };
  }

  if (name === 'getPaymentStatus') {
    return {
      type: 'payment',
      title: 'Payment status',
      payment: data,
    };
  }

  if (name === 'getListingAvailability') {
    return {
      type: 'availability',
      title: 'Availability',
      availability: data,
    };
  }

  if (name === 'getVehicleReviews') {
    return {
      type: 'reviews',
      title: 'Reviews',
      reviews: data,
    };
  }

  if (name === 'getMyReviews') {
    return {
      type: 'myReviews',
      title: 'Reviews you left',
      reviews: data,
    };
  }

  return {
    type: 'raw',
    title: name,
    data,
  };
};

const selectDisplayToolResults = (results = []) => {
  const priorityTypes = ['price', 'payment', 'profile', 'myReviews', 'reservations', 'availability', 'reviews'];
  const firstPriority = priorityTypes.find((type) => results.some((result) => result.type === type));

  if (firstPriority) {
    return results.filter((result) => result.type === firstPriority);
  }

  return results;
};

const executeAuditedTool = async ({ name, rawArguments, user, conversationId }) => {
  const startedAt = Date.now();
  try {
    const data = await executeAssistantTool({ name, rawArguments, user });
    await logAssistantToolCall({
      conversationId,
      userId: user.id,
      toolName: name,
      input: rawArguments || {},
      success: true,
      latencyMs: Date.now() - startedAt,
    }).catch((error) => console.error('[assistant] failed to log tool call', error.message));

    return {
      data,
      preview: createToolResultPreview({ name, data }),
    };
  } catch (error) {
    await logAssistantToolCall({
      conversationId,
      userId: user.id,
      toolName: name,
      input: rawArguments || {},
      success: false,
      latencyMs: Date.now() - startedAt,
      error: error.message || 'Tool failed',
    }).catch((logError) => console.error('[assistant] failed to log tool call', logError.message));
    throw error;
  }
};

const toGeminiRole = (role) => (role === 'assistant' ? 'model' : 'user');

const buildGeminiContents = ({ context, message, user }) => [
  {
    role: 'user',
    parts: [{ text: `Authenticated Rentify user context: id=${user.id}; role=${user.role || 'unknown'}.` }],
  },
  ...normalizeContext(context).map((item) => ({
    role: toGeminiRole(item.role),
    parts: [{ text: item.content }],
  })),
  { role: 'user', parts: [{ text: message }] },
];

const toGeminiSchemaType = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'string') return Type.STRING;
  if (normalized === 'number') return Type.NUMBER;
  if (normalized === 'integer') return Type.INTEGER;
  if (normalized === 'boolean') return Type.BOOLEAN;
  if (normalized === 'array') return Type.ARRAY;
  if (normalized === 'object') return Type.OBJECT;
  return undefined;
};

const toGeminiSchema = (schema = {}) => {
  const type = toGeminiSchemaType(schema.type);
  const converted = {};

  if (type) converted.type = type;
  if (schema.description) converted.description = schema.description;
  if (schema.required) converted.required = schema.required;
  if (schema.enum) converted.enum = schema.enum;

  if (schema.properties) {
    converted.properties = Object.entries(schema.properties).reduce((acc, [key, value]) => {
      acc[key] = toGeminiSchema(value);
      return acc;
    }, {});
  }

  if (schema.items) converted.items = toGeminiSchema(schema.items);
  return converted;
};

const geminiToolDeclarations = assistantToolDefinitions.map((tool) => ({
  name: tool.function.name,
  description: tool.function.description,
  parameters: toGeminiSchema({
    type: 'object',
    ...(tool.function.parameters || {}),
  }),
}));

const inferMockTool = (message) => {
  const text = String(message || '').toLowerCase();

  if (text.includes('reservation') || text.includes('booking') || text.includes('trip')) {
    return { name: 'getReservations', args: {} };
  }

  if (text.includes('my review') || text.includes('reviews i left') || text.includes('reviews left')) {
    return { name: 'getMyReviews', args: { limit: 5 } };
  }

  if (text.includes('profile') || text.includes('account') || text.includes('me')) {
    return { name: 'getUserProfile', args: {} };
  }

  if (text.includes('detail') || text.includes('vehicle id') || text.includes('listing id')) {
    const idMatch = text.match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
    if (idMatch) return { name: 'getVehicleDetails', args: { vehicleId: idMatch[0] } };
  }

  const filters = {};
  const cityMatch = text.match(/\b(?:in|at)\s+([a-zA-ZÀ-ÿ '-]{2,40})/);
  const maxPriceMatch = text.match(/(?:under|below|less than|max)\s+(\d+)/);
  const seatsMatch = text.match(/(\d+)\s+seats?/);

  if (cityMatch) filters.city = cityMatch[1].trim();
  if (maxPriceMatch) filters.maxPrice = Number(maxPriceMatch[1]);
  if (seatsMatch) filters.seats = Number(seatsMatch[1]);
  if (text.includes('automatic')) filters.transmission = 'automatic';
  if (text.includes('manual')) filters.transmission = 'manual';
  if (text.includes('hybrid')) filters.fuelType = 'hybrid';
  if (text.includes('electric')) filters.fuelType = 'electric';
  if (text.includes('diesel')) filters.fuelType = 'diesel';
  if (text.includes('petrol') || text.includes('gasoline')) filters.fuelType = 'petrol';

  return { name: 'searchVehicles', args: { ...filters, limit: 5 } };
};

const summarizeMockResult = ({ toolName, result }) => {
  if (toolName === 'getReservations') {
    if (!result.length) return 'I did not find any reservations for your account.';

    const lines = result.slice(0, 5).map((reservation) => {
      const car = reservation.listing?.car;
      const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : reservation.listing?.title || 'vehicle';
      return `- ${carName}: ${reservation.startDate} to ${reservation.endDate}, status ${reservation.status}, total ${reservation.totalPrice}`;
    });

    return `Here are your latest reservations:\n${lines.join('\n')}`;
  }

  if (toolName === 'getUserProfile') {
    return `Your profile is ${result.firstName || ''} ${result.lastName || ''} (${result.email}), role ${result.role}. You have ${result.stats?.client?.reservations ?? 0} reservation(s).`;
  }

  if (toolName === 'getMyReviews') {
    if (!result.items?.length) return 'I did not find reviews you have left yet.';
    const lines = result.items.slice(0, 5).map((review) => {
      const carName = review.vehicle ? `${review.vehicle.brand || ''} ${review.vehicle.model || ''}`.trim() : review.listing?.title || 'vehicle';
      return `- ${review.rating}/5 for ${carName}: ${review.comment || 'No comment'}`;
    });
    return `Here are reviews you left:\n${lines.join('\n')}`;
  }

  if (toolName === 'getVehicleDetails') {
    const car = result.car;
    return `Vehicle details: ${result.title || `${car?.brand || ''} ${car?.model || ''}`.trim()} in ${result.city || 'unknown city'}, ${result.country || 'unknown country'}, ${result.pricePerDay} per day.`;
  }

  const items = result.items || [];
  if (!items.length) return 'I did not find matching active vehicles. Try a broader city, price, or transmission filter.';

  const lines = items.slice(0, 5).map((listing) => {
    const car = listing.car;
    const carName = car ? `${car.brand || ''} ${car.model || ''}`.trim() : listing.title;
    return `- ${carName}: ${listing.city}, ${listing.pricePerDay} per day, ${car?.transmission || 'transmission unknown'}`;
  });

  return `I found these active vehicles:\n${lines.join('\n')}`;
};

const runMockAssistantChat = async ({ user, message, conversationId }) => {
  const id = conversationId || createConversationId();

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat', provider: 'mock' },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  const tool = inferMockTool(message);
  const toolResult = await executeAuditedTool({
    name: tool.name,
    rawArguments: tool.args,
    user,
    conversationId: id,
  });

  const answer = `[Mock AI mode] ${summarizeMockResult({ toolName: tool.name, result: toolResult.data })}`;

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content: answer,
    metadata: { provider: 'mock', toolsUsed: [tool.name] },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [tool.name],
    toolResults: selectDisplayToolResults([toolResult.preview]),
  };
};

const runGeminiAssistantChat = async ({ user, message, context, conversationId }) => {
  const ai = getGeminiClient();
  const id = conversationId || createConversationId();
  const contents = buildGeminiContents({ context, message, user });

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat', provider: 'gemini' },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  let response;
  let toolRound = 0;
  const toolsUsed = [];
  const toolResults = [];

  while (toolRound <= maxToolRounds) {
    response = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config: {
        systemInstruction: assistantSystemPrompt,
        tools: [{ functionDeclarations: geminiToolDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
      },
    });

    const functionCalls = response.functionCalls || [];
    if (!functionCalls.length) break;

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent?.parts?.length) {
      contents.push(modelContent);
    } else {
      contents.push({
        role: 'model',
        parts: functionCalls.map((functionCall) => ({ functionCall })),
      });
    }

    if (toolRound === maxToolRounds) {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: functionCalls[0].name,
            response: { ok: false, error: 'Tool round limit reached' },
          },
        }],
      });
      break;
    }

    const toolResponseParts = [];
    for (const functionCall of functionCalls) {
      try {
        const toolResult = await executeAuditedTool({
          name: functionCall.name,
          rawArguments: functionCall.args || {},
          user,
          conversationId: id,
        });

        toolsUsed.push(functionCall.name);
        toolResults.push(toolResult.preview);
        toolResponseParts.push({
          functionResponse: {
            id: functionCall.id,
            name: functionCall.name,
            response: { ok: true, data: toolResult.data },
          },
        });
      } catch (error) {
        toolResponseParts.push({
          functionResponse: {
            id: functionCall.id,
            name: functionCall.name,
            response: { ok: false, error: error.message || 'Tool failed' },
          },
        });
      }
    }

    contents.push({ role: 'user', parts: toolResponseParts });
    toolRound += 1;
  }

  const answer = response?.text?.trim?.() || '';
  if (!answer) throw new Error('Gemini returned an empty response');

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content: answer,
    metadata: {
      provider: 'gemini',
      model: geminiModel,
      toolsUsed: [...new Set(toolsUsed)],
      usage: response?.usageMetadata || null,
    },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [...new Set(toolsUsed)],
    toolResults: selectDisplayToolResults(toolResults),
  };
};

export const runAssistantChat = async ({ user, message, context, conversationId }) => {
  if (assistantProvider === 'mock') {
    return runMockAssistantChat({ user, message, conversationId });
  }

  if (assistantProvider === 'gemini') {
    return runGeminiAssistantChat({ user, message, context, conversationId });
  }

  const openai = getOpenAIClient();
  const id = conversationId || createConversationId();
  const messages = buildInitialMessages({ context, message, user });

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'user',
    content: message,
    metadata: { source: 'assistant_chat' },
  }).catch((error) => console.error('[assistant] failed to log user message', error.message));

  let completion;
  let toolRound = 0;
  const toolsUsed = [];
  const toolResults = [];

  while (toolRound <= maxToolRounds) {
    completion = await openai.chat.completions.create({
      model,
      messages,
      tools: assistantToolDefinitions,
      tool_choice: 'auto',
    });

    const assistantMessage = completion.choices?.[0]?.message;
    if (!assistantMessage) throw new Error('Assistant did not return a response');

    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls || [];
    if (toolCalls.length === 0) break;

    if (toolRound === maxToolRounds) {
      messages.push({
        role: 'tool',
        tool_call_id: toolCalls[0].id,
        content: JSON.stringify({ error: 'Tool round limit reached' }),
      });
      break;
    }

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name;
      try {
        const toolResult = await executeAuditedTool({
          name,
          rawArguments: toolCall.function?.arguments,
          user,
          conversationId: id,
        });

        toolsUsed.push(name);
        toolResults.push(toolResult.preview);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ ok: true, data: toolResult.data }),
        });
      } catch (error) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ ok: false, error: error.message || 'Tool failed' }),
        });
      }
    }

    toolRound += 1;
  }

  const answer = parseResponseText(completion);
  if (!answer) throw new Error('Assistant returned an empty response');

  await logAssistantMessage({
    conversationId: id,
    userId: user.id,
    role: 'assistant',
    content: answer,
    metadata: {
      model,
      toolsUsed: [...new Set(toolsUsed)],
      usage: completion?.usage || null,
    },
  }).catch((error) => console.error('[assistant] failed to log assistant message', error.message));

  return {
    conversationId: id,
    message: {
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
    toolsUsed: [...new Set(toolsUsed)],
    toolResults: selectDisplayToolResults(toolResults),
  };
};
