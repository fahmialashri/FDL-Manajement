import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import ExcelJS from "exceljs";

// Inisialisasi Supabase dengan Service Role Key untuk akses tulis
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, invoiceNo, description, amount } = body;

    if (!amount) return NextResponse.json({ error: "Nominal harus diisi" }, { status: 400 });

    const nominal = Number(amount);
    const txDate = new Date(date);

    // 1. Simpan ke DB (Neon/Prisma)
    const lastLedger = await prisma.accountingLedger.findFirst({ orderBy: { id: "desc" } });
    const currentBalance = Number(lastLedger?.balance ?? 0) + nominal;

    await prisma.accountingLedger.create({
      data: {
        date: txDate,
        referenceNo: invoiceNo,
        description: description,
        type: "INCOME",
        amount: nominal,
        balance: currentBalance,
      },
    });

    // 2. Generate Excel di Memory (Buffer)
    const allLedgers = await prisma.accountingLedger.findMany({ orderBy: { date: "asc" } });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ledger");

    ws.columns = [
      { header: "TANGGAL", key: "date", width: 15 },
      { header: "NO. INVOICE", key: "referenceNo", width: 25 },
      { header: "KETERANGAN", key: "description", width: 35 },
      { header: "DEBIT (MASUK)", key: "amount", width: 20 },
      { header: "CREDIT (KELUAR)", key: "credit", width: 20 },
      { header: "SALDO (BALANCE)", key: "balance", width: 25 },
    ];

    allLedgers.forEach((item) => {
      const row = ws.addRow({
        date: item.date,
        referenceNo: item.referenceNo,
        description: item.description,
        amount: item.type === "INCOME" ? item.amount : 0,
        credit: item.type === "EXPENSE" ? item.amount : 0,
        balance: item.balance,
      });
      const currencyFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';
      [4, 5, 6].forEach(col => row.getCell(col).numFmt = currencyFmt);
    });

    const buffer = await wb.xlsx.writeBuffer();

    // 3. Upload ke Supabase Storage
    const fileName = `ledgers/Accounting_Ledger_${Date.now()}.xlsx`;
    
    // Pastikan Anda sudah membuat bucket bernama 'accounting' di dashboard Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("accounting") 
      .upload(fileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Dapatkan Public URL untuk Download
    const { data: { publicUrl } } = supabase.storage
      .from("accounting")
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      ok: true, 
      message: "Transaksi tercatat dan Excel diperbarui",
      downloadUrl: publicUrl 
    });

  } catch (e: any) {
    console.error("Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}