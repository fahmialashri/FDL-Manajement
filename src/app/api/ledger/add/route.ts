import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
// Hapus import fs dan path karena tidak akan digunakan di Vercel
// @ts-ignore
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, invoiceNo, description, amount } = body;

    if (!amount) return NextResponse.json({ error: "Nominal harus diisi" }, { status: 400 });

    const nominal = Number(amount);
    const txDate = new Date(date);

    // 1. Simpan ke DB (Neon)
    // Pastikan DATABASE_URL di Vercel sudah menggunakan ?sslmode=require
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
    // Kita mengambil SEMUA data dari database agar Excel selalu up-to-date
    const allLedgers = await prisma.accountingLedger.findMany({
      orderBy: { date: "asc" }
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

    // Styling Header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };

    // Isi Data dari Database
    allLedgers.forEach((item) => {
      const row = ws.addRow({
        date: item.date,
        referenceNo: item.referenceNo,
        description: item.description,
        amount: item.type === "INCOME" ? item.amount : 0,
        credit: item.type === "EXPENSE" ? item.amount : 0,
        balance: item.balance,
      });

      // Styling Baris Mata Uang
      const currencyFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';
      row.getCell(4).numFmt = currencyFmt;
      row.getCell(5).numFmt = currencyFmt;
      row.getCell(6).numFmt = currencyFmt;
    });

    // 3. Tulis ke Buffer (Bukan File)
    const buffer = await wb.xlsx.writeBuffer();

    // 4. Kirim Response dalam bentuk File yang bisa di-download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Accounting_Ledger_${Date.now()}.xlsx"`,
      },
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}