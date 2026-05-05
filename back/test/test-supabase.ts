import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testSupabaseConnection() {
  const { supabase } = await import('../src/config/supabase');

  console.log('Running query: SELECT * FROM users');

  const { data, error } = await supabase.from('users').select('*');

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  console.log('Query succeeded. Rows from users:');
  console.log(data);
}

testSupabaseConnection().catch((err) => {
  console.error('Unexpected error while testing Supabase:', err);
  process.exit(1);
});
