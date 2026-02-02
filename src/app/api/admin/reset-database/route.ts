import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
import { supabaseAdmin } from "@/libs/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // PASSWORD ADMIN
    if (password !== "fdl-warna-2026") {
      return NextResponse.json({ error: "Password Admin Salah!" }, { status: 401 });
    }

    // 1. Reset Database (TRUNCATE ALL)
    // Matikan Foreign Key Check agar bisa hapus tabel yang saling berelasi
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
    
    const tables = [
      '"InvoiceItem"', 
      '"SuratJalan"', 
      '"Invoice"', 
      '"AccountingLedger"', 
      '"Product"', 
      '"Customer"'
    ];

    for (const table of tables) {
      // RESTART IDENTITY biar ID balik lagi ke 1
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }

    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    // 2. Bersihkan Storage (Bucket: accounting)
    const folders = ['excel', 'pdf'];
    for (const folder of folders) {
      const { data: listFiles } = await supabaseAdmin.storage
        .from("accounting")
        .list(folder);

      if (listFiles && listFiles.length > 0) {
        // PERBAIKAN: Tambahkan tipe ': any' agar tidak error TypeScript
        const filesToDelete = listFiles.map((file: any) => `${folder}/${file.name}`);
        
        // Hapus semua file di dalam folder tersebut
        await supabaseAdmin.storage.from("accounting").remove(filesToDelete);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Database dibersihkan & ID direset ke 1. Storage folder excel/pdf juga sudah kosong." 
    });
  } catch (e: any) {
    console.error("Reset Error:", e);
    return NextResponse.json({ error: e.message || "Gagal reset data" }, { status: 500 });
  }
}