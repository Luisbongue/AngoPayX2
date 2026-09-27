import { createClient } from '@supabase/supabase-js';

// Backend (Server-side): Strictly executed in Node.js runtime
// Public project URL (reads SUPABASE_URL or fallback to VITE_SUPABASE_URL)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://angopayx.supabase.co';

// CRITICAL SECURITY: The secret key (sb_secret_...) is strictly backend-only.
// It is NEVER prefixed with VITE_ and NEVER exposed to frontend bundles.
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
  supabaseSecretKey &&
  !supabaseUrl.includes('angopayx.supabase.co') &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseSecretKey.includes('YOUR_SUPABASE') &&
  !supabaseSecretKey.includes('placeholder')
);

// Administrative Supabase client with Secret Key privileges (server-side only)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey || 'placeholder_secret_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function verifySupabaseToken(token: string) {
  if (!isSupabaseServerConfigured) {
    return null;
  }
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    console.error('Erro ao validar token com Supabase:', err);
    return null;
  }
}
