import { createClient } from "@supabase/supabase-js";

// Buat fungsi helper alih-alih langsung export konstanta
export const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are missing!");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
};

// Tetap export konstanta tapi diproteksi agar tidak error saat build
export const supabaseAdmin = 
  typeof window === "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (null as any) // Saat build (server-side), kasih null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder",
        { auth: { persistSession: false } }
      );