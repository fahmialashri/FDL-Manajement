import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, // fallback
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, invoiceNo, description, amount } = body;

    if (!amount)
      return NextResponse.json({ error: "Nominal harus diisi" }, { status: 400 });

    const nominal = Number(amount);
    const txDate = new Date(date);

    // 1) Simpan ke DB (pakai transaction biar minim race condition)
    await prisma.$transaction(async (tx) => {
      const lastLedger = await tx.accountingLedger.findFirst({
        orderBy: { id: "desc" },
      });
      const currentBalance = Number(lastLedger?.balance ?? 0) + nominal;

      await tx.accountingLedger.create({
        data: {
          date: txDate,
          referenceNo: invoiceNo,
          description,
          type: "INCOME",
          amount: nominal,
          balance: currentBalance,
        },
      });
    });

    // 2) Generate Excel (buffer) dari DB
    const allLedgers = await prisma.accountingLedger.findMany({
      orderBy: { date: "asc" },
    });

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

    const currencyFmt =
      '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';

    allLedgers.forEach((item) => {
      const row = ws.addRow({
        date: item.date,
        referenceNo: item.referenceNo ?? "",
        description: item.description,
        amount: item.type === "INCOME" ? Number(item.amount) : 0,
        credit: item.type === "EXPENSE" ? Number(item.amount) : 0,
        balance: Number(item.balance),
      });

      [4, 5, 6].forEach((col) => (row.getCell(col).numFmt = currencyFmt));
    });

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 3) Upload (1 file tetap biar URL konsisten)
    const fileName = "ledgers/Accounting_Ledger.xlsx";

    const { error: uploadError } = await supabase.storage
      .from("accounting")
      .upload(fileName, fileBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    // 4) Public URL
    const { data } = supabase.storage.from("accounting").getPublicUrl(fileName);

    return NextResponse.json({
      ok: true,
      message: "Transaksi tercatat dan Excel diperbarui",
      downloadUrl: data.publicUrl,
    });
  } catch (e: any) {
    console.error("Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
