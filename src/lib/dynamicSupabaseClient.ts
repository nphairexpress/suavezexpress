// @ts-nocheck
/**
 * Dynamic Supabase Client
 * 
 * When external Supabase credentials are stored in localStorage (after setup wizard),
 * this module returns a client pointing to the external database.
 * Otherwise, it falls back to the auto-generated Lovable Cloud client.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase as lovableClient } from "@/integrations/supabase/client";

const STORAGE_KEY_URL = "ext_supabase_url";
const STORAGE_KEY_ANON = "ext_supabase_anon_key";
const STORAGE_KEY_SETUP_DONE = "setup_completed";

let cachedExternalClient: SupabaseClient | null = null;

function getExternalCredentials(): { url: string; anonKey: string } | null {
  try {
    const url = localStorage.getItem(STORAGE_KEY_URL);
    const anonKey = localStorage.getItem(STORAGE_KEY_ANON);
    if (url && anonKey) return { url, anonKey };
  } catch {
    // SSR or localStorage unavailable
  }
  return null;
}

function createExternalClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "ext-sb-auth",
    },
  });
}

/**
 * Returns the appropriate Supabase client:
 * - External client if setup has been completed and creds are in localStorage
 * - Lovable Cloud client otherwise (for development)
 */
export function getSupabaseClient(): SupabaseClient {
  const creds = getExternalCredentials();
  
  if (creds) {
    if (!cachedExternalClient) {
      cachedExternalClient = createExternalClient(creds.url, creds.anonKey);
    }
    return cachedExternalClient;
  }
  
  return lovableClient;
}

/**
 * Save external Supabase credentials to localStorage
 */
export function saveExternalCredentials(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_KEY_URL, url);
  localStorage.setItem(STORAGE_KEY_ANON, anonKey);
  localStorage.setItem(STORAGE_KEY_SETUP_DONE, "true");
  // Reset cached client so next call creates a fresh one
  cachedExternalClient = null;
}

/**
 * Check if setup has been completed on this browser
 */
export function isSetupCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_SETUP_DONE) === "true";
  } catch {
    return false;
  }
}

/**
 * Check if we're using external credentials
 */
export function isUsingExternalSupabase(): boolean {
  return getExternalCredentials() !== null;
}

/**
 * Clear external credentials (for re-setup)
 */
export function clearExternalCredentials() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  localStorage.removeItem(STORAGE_KEY_SETUP_DONE);
  cachedExternalClient = null;
}

// Default export: the dynamic client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
