import { createClient } from '@supabase/supabase-js';

// Frontend (Client-side): Only public/publishable variables with VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://angopayx.supabase.co';

// Helper: Verifies if a publishable key is complete and valid (not truncated, stub, or placeholder)
export function isValidPublishableKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  // Valid Supabase publishable keys are 35+ chars (sb_publishable_...) or 150+ chars (anon JWT)
  if (k.length <= 20) return false;
  if (k === 'sb_publishable_' || k.endsWith('...')) return false;
  if (k.includes('YOUR_') || k.includes('placeholder')) return false;
  return true;
}

const rawPublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Primary key: must be a genuinely valid publishable key
const supabasePublishableKey = isValidPublishableKey(rawPublishableKey)
  ? rawPublishableKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_publishable_key';

// Only considered configured when project URL and key are fully formed
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  isValidPublishableKey(rawPublishableKey) &&
  !supabaseUrl.includes('angopayx.supabase.co') &&
  !supabaseUrl.includes('YOUR_PROJECT_ID')
);

// Client-side Supabase instance - uses only VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
