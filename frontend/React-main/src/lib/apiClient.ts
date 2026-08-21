import axios from 'axios';
import { supabase } from './supabaseClient';

// Base URL of the Go backend from Step 3, e.g. http://localhost:8080/api/v1.
const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080/api/v1';

// apiClient is the single Axios instance every services/*.ts file uses to
// call the Go backend. It never carries a password or handles auth itself —
// it just attaches whatever access token Supabase currently holds.
export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// Backend error responses are always { success: false, error: { message, detail } }
// (see internal/utils/response.go on the Go side) — this normalizes that
// into a single readable string for callers that just want to show it.
export interface ApiErrorBody {
  success: false;
  error: { message: string; detail: string };
}

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error) && error.response?.data?.error) {
    const { message, detail } = error.response.data.error;
    return detail ? `${message}: ${detail}` : message;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
