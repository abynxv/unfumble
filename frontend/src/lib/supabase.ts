/**
 * Supabase client initialization.
 *
 * HOW SUPABASE CLIENT WORKS:
 * The Supabase JS client handles all communication with Supabase services.
 * We only use the "anon key" (public key) here — it's safe to expose in frontend code.
 * The anon key has limited permissions controlled by Supabase's Row Level Security.
 *
 * The client manages:
 * - Authentication (email OTP, session tokens)
 * - Real-time subscriptions (not used here)
 * - Storage (not used directly — backend handles storage)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
