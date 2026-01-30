import { NextResponse, NextRequest } from "next/server"; // Gunakan NextRequest
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { prisma } from "@/prisma-client";

// Tambahkan ini biar Vercel tidak error saat proses build (collecting page data)
export const dynamic = 'force-dynamic';

type Payload = {
  date: string;
  description: string;
  amount: number;
};

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
    ws.addRow([
      "Date",
      "Invoice No",
      "Customer",
      "Debit (Masuk)",
      "Credit (Keluar)",
      "Balance (Saldo)",
    ]);
    await wb.xlsx.writeFile(LEDGER_PATH);
  }
}

async function appendExpenseRow(dateISO: string, desc: string, credit: number) {
  await ensureLedgerXlsx();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(LEDGER_PATH);
  const ws = wb.getWorksheet("Ledger");
  if (!ws) throw new Error("Worksheet 'Ledger' not found");

  let lastBalance = 0;
  const lastRow = ws.lastRow;
  if (lastRow && lastRow.number >= 2) {
    const v = lastRow.getCell(6).value;
    // TypeScript fix: handle v as a Number safely
    lastBalance = Number(v) || 0;
  }

  const newBalance = lastBalance - credit;

  ws.addRow([dateISO, "", desc, 0, credit, newBalance]);
  await wb.xlsx.writeFile(LEDGER_PATH);

  return newBalance;
}

// Gunakan NextRequest sesuai standar Route Handler terbaru
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Payload;

    if (!payload?.date || !payload?.description || !payload?.amount) {
      return NextResponse.json(
        { error: "date, description, amount required" },
        { status: 400 }
      );
    }

    const date = new Date(payload.date);
    const amount = Number(payload.amount);

    // Pastikan koneksi Prisma aman
    const last = await prisma.accountingLedger.findFirst({
      orderBy: { id: "desc" },
      select: { balance: true },
    });
    
    const lastBalance = Number(last?.balance ?? 0);
    const newBalanceDb = lastBalance - amount;

    await prisma.accountingLedger.create({
      data: {
        date,
        referenceNo: null,
        description: payload.description,
        type: "EXPENSE",
        amount,
        balance: newBalanceDb,
      },
    });

    const newBalanceXlsx = await appendExpenseRow(payload.date, payload.description, amount);

    return NextResponse.json({ 
      ok: true, 
      ledger_balance_db: newBalanceDb, 
      ledger_balance_xlsx: newBalanceXlsx 
    });
  } catch (e: any) {
    // Memberikan error detail agar CTO gampang debugging
    return NextResponse.json(
      { error: e?.message || "Server error", detail: e.toString() }, 
      { status: 500 }
    );
  }
}