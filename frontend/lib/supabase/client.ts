import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase 신규 키 시스템: PUBLISHABLE_KEY 우선, 구 ANON_KEY는 fallback.
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  return createBrowserClient(url!, key!);
}

export const isSupabaseConfigured = Boolean(url && key);
