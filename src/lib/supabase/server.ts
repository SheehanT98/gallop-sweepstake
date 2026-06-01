import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/** Typed client for reads (RLS-aware types). */
export function createServerClient(): SupabaseClient<Database> | null {
  const env = getSupabaseEnv();
  if (!env) return null;

  return createClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Untyped client for uploads/writes via service role. */
export function createWriteClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;

  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
