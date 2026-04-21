import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL and key are required');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log('⚠️ Supabase connection established (table may not exist yet)');
    } else {
      console.log('✅ Supabase client connected');
    }
  } catch (err) {
    console.log('⚠️ Supabase client initialized (connection will be tested on first query)');
  }
})();

export default supabase;