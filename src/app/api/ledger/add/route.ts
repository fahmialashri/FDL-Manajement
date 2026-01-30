import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";
import fs from "fs";
import path from "path";
// @ts-ignore
import ExcelJS from "exceljs";

// --- LOGIKA EXCEL ---
const STORAGE_DIR = path.join(process.cwd(), "storage");
const LEDGER_PATH = path.join(STORAGE_DIR, "Accounting_Ledger.xlsx");

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function ensureLedgerXlsx() {
  ensureDir(STORAGE_DIR);
  if (!fs.existsSync(LEDGER_PATH)) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ledger");
    ws.columns = [
      { header: "TANGGAL", key: "date", width: 15 },
      { header: "NO. INVOICE", key: "invoiceNo", width: 25 },
      { header: "CUSTOMER", key: "customer", width: 35 },
      { header: "DEBIT (MASUK)", key: "debit", width: 20 },
      { header: "CREDIT (KELUAR)", key: "credit", width: 20 },
      { header: "SALDO (BALANCE)", key: "balance", width: 25 },
    ];
    // Styling Header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    await wb.xlsx.writeFile(LEDGER_PATH);
  }
}

async function appendLedgerXlsxRow(args: {
  date: Date;
  invoiceNo: string;
  customer: string;
  debit: number;
  credit: number;
}) {
  await ensureLedgerXlsx();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(LEDGER_PATH);
  const ws = wb.getWorksheet("Ledger");
  if (!ws) return;

  let lastBalance = 0;
  const lastRow = ws.lastRow;
  if (lastRow && lastRow.number >= 2) {
    const v = lastRow.getCell(6).value;
    if (typeof v === "number") lastBalance = v;
    else if (v && typeof v === "object" && "result" in v) lastBalance = Number(v.result) || 0;
  }

  const newBalance = lastBalance + args.debit - args.credit;
  const row = ws.addRow([args.date, args.invoiceNo, args.customer, args.debit, args.credit, newBalance]);

  // Styling
  const currencyFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    if (colNumber === 1) { cell.numFmt = "dd/mm/yyyy"; }
    if (colNumber >= 4) { cell.numFmt = currencyFmt; cell.alignment = { horizontal: "right" }; }
  });

  await wb.xlsx.writeFile(LEDGER_PATH);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, invoiceNo, description, amount } = body;

    if (!amount) return NextResponse.json({ error: "Nominal harus diisi" }, { status: 400 });

    const nominal = Number(amount);
    const txDate = new Date(date);

    // 1. Simpan ke DB
    const lastLedger = await prisma.accountingLedger.findFirst({ orderBy: { id: "desc" } });
    const newBalance = Number(lastLedger?.balance ?? 0) + nominal;

    await prisma.accountingLedger.create({
      data: {
        date: txDate,
        referenceNo: invoiceNo,
        description: description,
        type: "INCOME",
        amount: nominal,
        balance: newBalance,
      },
    });

    // 2. Simpan ke Excel
    await appendLedgerXlsxRow({
      date: txDate,
      invoiceNo: invoiceNo,
      customer: description, // Deskripsi masuk ke kolom customer di excel biar jelas
      debit: nominal,
      credit: 0
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}