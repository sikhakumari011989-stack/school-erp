import { createClient } from '@supabase/supabase-js';

// Copy this exact URL (I grabbed it from your video)
const supabaseUrl = 'https://lkcnausuvgdiwnsppakp.supabase.co';

// Copy that super long SUPABASE_PUBLISHABLE_KEY from your screen and paste it here
const supabaseAnonKey = 'sb_publishable_3B6NQwFGujc7kYpyh6OG0Q_VxcDvxmm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);