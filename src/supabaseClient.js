import { createClient } from '@supabase/supabase-js';

const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const procEnv = typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env ? globalThis.process.env : {};

const supabaseUrl =
  metaEnv.VITE_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  procEnv.SUPABASE_URL ||
  'https://lkcnausuvgdiwnsppakp.supabase.co';

const supabaseAnonKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.SUPABASE_ANON_KEY ||
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