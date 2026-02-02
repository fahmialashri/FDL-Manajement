import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

// Wajib agar Vercel tidak rewel saat build
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Inisialisasi Supabase di DALAM fungsi (Anti Build Error)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase Environment Variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { date, invoiceNo, description, amount } = body;

    if (!amount) return NextResponse.json({ error: "Nominal harus diisi" }, { status: 400 });

    const nominal = Number(amount);
    const txDate = new Date(date);

    // 2. Simpan ke Database
    await prisma.$transaction(async (tx) => {
      const lastLedger = await tx.accountingLedger.findFirst({
        orderBy: { id: "desc" },
      });
      const currentBalance = Number(lastLedger?.balance ?? 0) + nominal;

      await tx.accountingLedger.create({
        data: {
          date: txDate,
          referenceNo: invoiceNo || "-",
          description: description || "Entry Manual",
          type: "INCOME",
          amount: nominal,
          balance: currentBalance,
        },
      });
    });

    // 3. Generate Excel Berdasarkan Data Terbaru
    const allLedgers = await prisma.accountingLedger.findMany({
      orderBy: { date: "asc" },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ledger");

    ws.columns = [
      { header: "TANGGAL", key: "date", width: 15 },
      { header: "NO. INVOICE", key: "referenceNo", width: 20 },
      { header: "KETERANGAN", key: "description", width: 40 },
      { header: "MASUK (DR)", key: "amount", width: 18 },
      { header: "KELUAR (CR)", key: "credit", width: 18 },
      { header: "SALDO", key: "balance", width: 22 },
    ];

    // Styling Header agar Bold & Biru
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };

    const currencyFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';

    allLedgers.forEach((item) => {
      const row = ws.addRow({
        date: item.date,
        referenceNo: item.referenceNo ?? "",
        description: item.description,
        amount: item.type === "INCOME" ? Number(item.amount) : 0,
        credit: item.type === "EXPENSE" ? Number(item.amount) : 0,
        balance: Number(item.balance),
      });
      // Set format Rupiah untuk kolom 4, 5, dan 6
      [4, 5, 6].forEach((col) => {
        row.getCell(col).numFmt = currencyFmt;
      });
    });

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const fileBuffer = Buffer.from(arrayBuffer as any);

    // 4. Upload ke Supabase (Samakan folder dengan kode sebelumnya: excel/)
    const fileName = "excel/Accounting_Ledger.xlsx";

    const { error: uploadError } = await supabase.storage
      .from("accounting")
      .upload(fileName, fileBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from("accounting").getPublicUrl(fileName);

    return NextResponse.json({
      ok: true,
      message: "Ledger berhasil diperbarui",
      downloadUrl: urlData.publicUrl,
    });
  } catch (e: any) {
    console.error("API ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}