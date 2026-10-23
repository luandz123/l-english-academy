// Supabase Client with automatic 401 token refresh interceptor & session persistence
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ovjungvdsvzhzhobkryu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anVuZ3Zkc3Z6aHpob2Jrcnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzkxMTksImV4cCI6MjEwMzAxNTExOX0.UDtbmp_uQukHnJQikV0A3czRRwkYtRja0qkAN3QUM_M';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  // Using default project configuration
}

// Reference to supabase client instance for token refresh inside custom fetch
let supabaseClientInstance: SupabaseClient<Database> | null = null;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Deduplicated token refresh:
 * Ensures multiple concurrent 401s only trigger ONE refresh request to Supabase Auth,
 * avoiding race conditions and token reuse rejections.
 */
async function refreshAuthSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        if (!supabaseClientInstance) return null;
        console.log("[Supabase Interceptor] 401 detected. Refreshing session...");
        const { data, error } = await supabaseClientInstance.auth.refreshSession();
        if (error || !data.session) {
          console.warn("[Supabase Interceptor] Failed to refresh session:", error?.message);
          return null;
        }
        console.log("[Supabase Interceptor] Session refreshed successfully!");
        return data.session.access_token;
      } catch (err) {
        console.warn("[Supabase Interceptor] Error during session refresh:", err);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Custom fetch wrapper:
 * Intercepts 401 Unauthorized responses from Supabase PostgREST & Storage APIs,
 * automatically refreshes the session token, and replays the request seamlessly.
 */
const customFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
  const isAuthEndpoint = url.includes("/auth/v1/");

  // Clone Request upfront if needed to preserve body stream
  let clonedRequest: Request | null = null;
  if (input instanceof Request) {
    try {
      clonedRequest = input.clone();
    } catch {
      // Ignore clone failure if body already locked
    }
  }

  // 1. Initial request execution
  const response = await fetch(input, init);

  // 2. Intercept 401 Unauthorized on non-auth requests (e.g. PostgREST tables, storage)
  if (response.status === 401 && !isAuthEndpoint && supabaseClientInstance) {
    const newToken = await refreshAuthSession();
    if (newToken) {
      if (input instanceof Request && clonedRequest) {
        const headers = new Headers(clonedRequest.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        return fetch(new Request(clonedRequest, { headers }));
      } else {
        const headers = new Headers(init?.headers || {});
        headers.set("Authorization", `Bearer ${newToken}`);
        return fetch(input, {
          ...init,
          headers,
        });
      }
    }
  }

  return response;
};

export const supabase = createClient<Database>(
  SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY || "",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: customFetch,
    },
  }
);

supabaseClientInstance = supabase;