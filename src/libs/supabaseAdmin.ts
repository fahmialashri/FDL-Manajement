import { createClient } from "@supabase/supabase-js";

// Ambil variabel env tanpa tanda seru (!)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Berikan validasi agar tidak meledak saat Build (Collecting page data)
if (!supabaseUrl || !supabaseServiceKey) {
  // Kita buat placeholder saat build agar tidak error "supabaseUrl is required"
  // Saat aplikasi running di Vercel, ini akan tetap mengambil nilai asli dari Env
  console.warn("Supabase Env missing. Using placeholder for build phase.");
}

export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co", 
  supabaseServiceKey || "placeholder-key",
  {
    auth: { persistSession: false },
  }
);