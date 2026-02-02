import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabaseAdmin";

// Paksa route ini untuk selalu ambil data segar, jangan di-cache oleh Vercel
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Ambil langsung dari Supabase Storage (bukan fs.readFileSync)
    const { data, error } = await supabaseAdmin.storage
      .from("accounting")
      .download("excel/Accounting_Ledger.xlsx");

    if (error || !data) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Ledger file not found in Supabase. Check your storage bucket." },
        { status: 404 }
      );
    }

    // 2. Ubah data blob dari Supabase menjadi Buffer
    const buf = await data.arrayBuffer();

    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // Tambahkan timestamp di filename agar browser tidak bingung
        "Content-Disposition": `attachment; filename="Accounting_Ledger_${new Date().getTime()}.xlsx"`,
        // Penting: Matikan cache browser agar file selalu fresh
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e: any) {
    console.error("Download error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}