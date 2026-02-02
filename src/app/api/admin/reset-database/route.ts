import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
import { supabaseAdmin } from "@/libs/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 👈 Tambahkan ini untuk mencegah error build

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // GANTI PASSWORD RAHASIA KAMU DISINI
    if (password !== "fdl-warna-2026") {
      return NextResponse.json({ error: "Password Admin Salah!" }, { status: 401 });
    }

    // 1. Reset Database (Urutan harus benar karena ada relasi/Foreign Key)
    // Kita matikan sementara cek relasi agar tidak error saat hapus massal
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
    
    // List semua tabel yang mau dibersihkan
    const tables = [
      '"InvoiceItem"', 
      '"SuratJalan"', 
      '"Invoice"', 
      '"AccountingLedger"', 
      '"Product"', 
      '"Customer"'
    ];

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }

    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    // 2. Bersihkan Storage (Bucket: accounting)
    // Hapus file di folder excel dan pdf
    const folders = ['excel', 'pdf'];
    for (const folder of folders) {
      const { data: listFiles } = await supabaseAdmin.storage
        .from("accounting")
        .list(folder);

      if (listFiles && listFiles.length > 0) {
        const filesToDelete = listFiles.map((file) => `${folder}/${file.name}`);
        await supabaseAdmin.storage.from("accounting").remove(filesToDelete);
      }
    }

    return NextResponse.json({ ok: true, message: "Seluruh data berhasil dihapus!" });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}