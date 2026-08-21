import { createClient } from '@supabase/supabase-js';

// Supabase project URL + anon key — Project Settings -> API in the Supabase
// dashboard. The anon key is safe to ship to the browser (it's what Row
// Level Security is for); never put the service_role key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy .env.example to .env and fill them in. ' +
      'Auth and API calls will fail until then.',
  );
}

// The single Supabase client for the app: handles sign-up/sign-in/OAuth,
// session storage/refresh, and is the source of the access token apiClient
// attaches to every request to the Go backend.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
