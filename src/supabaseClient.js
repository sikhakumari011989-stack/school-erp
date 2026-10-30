import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://lkcnausuvgdiwnsppakp.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrY25hdXN1dmdkaXduc3BwYWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMDMwMjcsImV4cCI6MjEwNjg3OTAyN30.QFmG6waeGtrK0dgGtzt0R6E9pSmvAL6Q9-XCnMyEWrw';

let client = null;
try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
} catch (err) {
  console.warn('[Supabase Fallback]: Running in offline demo mode.', err);
}

export const supabase = client;
export default client;