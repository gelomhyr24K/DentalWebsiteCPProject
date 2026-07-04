import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const getSupabaseHost = () => {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
};

const getSupabaseConfigError = () => {
  if (!supabaseUrl) return 'Missing `VITE_SUPABASE_URL` in `.env.local`.';
  if (!supabaseKey) return 'Missing `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.';

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:') {
      return 'Supabase URL must start with `https://`.';
    }
  } catch {
    return 'Supabase URL is not a valid URL.';
  }

  return null;
};

export const supabaseHost = getSupabaseHost();
export const supabaseConfigError = getSupabaseConfigError();
export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
