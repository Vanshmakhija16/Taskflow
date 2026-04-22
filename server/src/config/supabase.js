const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  logger.error(
    'Missing Supabase env vars. Check SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY in .env'
  );
  process.exit(1);
}

/**
 * supabaseAdmin — uses the service-role key.
 * Bypasses Row Level Security. Use ONLY on the server.
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
    detectSessionInUrl: false,
  },
});

/**
 * supabasePublic — uses the anon key.
 * Respects RLS. Used for auth operations (signIn, signUp, etc.)
 */
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
    detectSessionInUrl: false,
  },
});

module.exports = { supabaseAdmin, supabasePublic };
