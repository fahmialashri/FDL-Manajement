import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import ExcelJS from "exceljs";

import { prisma } from "@/prisma-client";
import {
  formatRupiah,
  formatTanggalIndoFull,
  formatTanggalInvoiceNumeric,
} from "@/libs/format";
import { makeInvoiceNo, makeSJNo } from "@/libs/numbering";
import { calcTaxInclusive } from "@/libs/tax";
import { replaceAll } from "@/libs/html";

// --- TYPE DEFINITIONS ---
type Payload = {
  date: string;
  po_number?: string;
  customer_id?: number;
  customer_new?: { name: string; address?: string; npwp?: string };
  logistics: {
    driver_name: string;
    plate_number?: string;
    transport_method: "Motor" | "Car";
  };
  items: Array<{
    name: string;
    color: string;
    unit: string;
    qty: number;
    unit_price: number;
  }>;
};

// --- CONSTANTS & DIRECTORIES ---
const STORAGE_DIR = path.join(process.cwd(), "storage");
const PDF_DIR = path.join(STORAGE_DIR, "pdf");
const LEDGER_PATH = path.join(STORAGE_DIR, "Accounting_Ledger.xlsx");

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// =================================================================================
// FUNGSI EXCEL LEDGER (PROFEISONAL LOOK)
// =================================================================================

async function ensureLedgerXlsx() {
  ensureDir(STORAGE_DIR);
  if (!fs.existsSync(LEDGER_PATH)) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ledger");

    // Definisi Kolom & Lebar
    ws.columns = [
      { header: "TANGGAL", key: "date", width: 15 },
      { header: "NO. INVOICE", key: "invoiceNo", width: 25 },
      { header: "CUSTOMER", key: "customer", width: 35 },
      { header: "DEBIT (MASUK)", key: "debit", width: 20 },
      { header: "CREDIT (KELUAR)", key: "credit", width: 20 },
      { header: "SALDO (BALANCE)", key: "balance", width: 25 },
    ];

    // Styling Header (Biru Akuntansi)
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    ws.views = [{ state: "frozen", ySplit: 1 }];
    await wb.xlsx.writeFile(LEDGER_PATH);
  }
}

async function appendLedgerXlsxRow(args: {
  dateISO: string;
  invoiceNo: string;
  customer: string;
  debit: number;
  credit: number;
}) {
  await ensureLedgerXlsx();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(LEDGER_PATH);
  const ws = wb.getWorksheet("Ledger");
  if (!ws) throw new Error("Worksheet 'Ledger' not found");

  let lastBalance = 0;
  const lastRow = ws.lastRow;
  if (lastRow && lastRow.number >= 2) {
    const v = lastRow.getCell(6).value;
    if (typeof v === "number") lastBalance = v;
    else if (v && typeof v === "object" && "result" in v) lastBalance = Number(v.result) || 0;
  }

  const newBalance = lastBalance + args.debit - args.credit;
  const row = ws.addRow([new Date(args.dateISO), args.invoiceNo, args.customer, args.debit, args.credit, newBalance]);

  // Styling Baris
  const currencyFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { vertical: "middle" };
    
    if (colNumber === 1) { cell.numFmt = "dd/mm/yyyy"; cell.alignment.horizontal = "center"; }
    if (colNumber === 2) cell.alignment.horizontal = "center";
    if (colNumber >= 4) { cell.numFmt = currencyFmt; cell.alignment.horizontal = "right"; }
  });
  row.getCell(6).font = { bold: true };

  await wb.xlsx.writeFile(LEDGER_PATH);
  return newBalance;
}

function formatIdPlain(n: number) {
  return Number(n).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// =================================================================================
// MAIN API HANDLER (POST)
// =================================================================================

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Payload;

    // 1. Validasi
    if (!payload?.date) return NextResponse.json({ error: "date is required" }, { status: 400 });
    if (!payload?.items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });

    const txDate = new Date(payload.date);

    // 2. Resolve Customer
    const customer = payload.customer_id
      ? await prisma.customer.findUnique({ where: { id: payload.customer_id } })
      : payload.customer_new
      ? await prisma.customer.create({
          data: {
            name: payload.customer_new.name,
            address: payload.customer_new.address,
            npwp: payload.customer_new.npwp,
          },
        })
      : null;

    if (!customer) return NextResponse.json({ error: "customer required" }, { status: 400 });

    // 3. Numbering
    const invCount = await prisma.invoice.count();
    const sjCount = await prisma.suratJalan.count();
    const invoiceNo = makeInvoiceNo(String(invCount + 1).padStart(4, "0"), txDate);
    const sjNo = makeSJNo(String(sjCount + 1), txDate);

    // 4. Calculations
    let subtotal = 0;
    const itemsDetailed = payload.items.map((it) => {
      const line = Number(it.qty) * Number(it.unit_price);
      subtotal += line;
      return { ...it, line };
    });
    const { dpp, ppn, total } = calcTaxInclusive(subtotal);

    // 5. DB Save (Invoice & SJ)
    const createdInvoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        date: txDate,
        customerId: customer.id,
        subtotal,
        dppAmount: dpp,
        ppnAmount: ppn,
        grandTotal: total,
        status: "UNPAID",
        items: {
          create: itemsDetailed.map((it) => ({
            productName: it.name,
            unit: it.unit,
            qty: it.qty,
            color: it.color || "", 
            unitPrice: it.unit_price,
            subtotal: it.line,
          })),
        },
        suratJalan: {
          create: {
            sjNo,
            driverName: payload.logistics.driver_name,
            plateNumber: payload.logistics.plate_number || "-",
            transportMethod: payload.logistics.transport_method === "Car" ? "Mobil" : "Motor",
          },
        },
      },
    });

    // 6. Update Ledger (DB & Excel)
    const lastDbLedger = await prisma.accountingLedger.findFirst({ orderBy: { id: "desc" } });
    const newBalanceDb = Number(lastDbLedger?.balance ?? 0) + total;
    await prisma.accountingLedger.create({
      data: {
        date: txDate,
        referenceNo: invoiceNo,
        description: `Invoice ${invoiceNo} - ${customer.name}`,
        type: "INCOME",
        amount: total,
        balance: newBalanceDb,
      },
    });
    await appendLedgerXlsxRow({
      dateISO: payload.date,
      invoiceNo,
      customer: customer.name,
      debit: total,
      credit: 0,
    });

    // 7. PDF GENERATION
    const logoBase64 = fs.existsSync(path.join(process.cwd(), "public", "logo.png")) 
      ? `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "logo.png")).toString("base64")}`
      : "";

    const stampBase64 = fs.existsSync(path.join(process.cwd(), "public", "inv-stamp.png"))
      ? `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "inv-stamp.png")).toString("base64")}`
      : logoBase64;

    const template = fs.readFileSync(path.join(process.cwd(), "templates", "invoice_sj.html"), "utf-8");

    const itemsRows = itemsDetailed.map((it) => `
      <tr>
        <td>${it.name}</td>
        <td style="text-align:center">${it.color || "-"}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${formatRupiah(it.unit_price)}</td>
        <td style="text-align:right">${formatRupiah(it.line)}</td>
      </tr>`).join("");

    const sjItemsRows = itemsDetailed.map((it, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center">${it.color || "-"}</td>
        <td>${it.name}</td>
        <td style="text-align:center">${it.unit}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:center">Cat Khusus</td>
      </tr>`).join("");

    const html = replaceAll(template, {
      "{{logo_src}}": logoBase64,
      "{{stamp_src}}": stampBase64,
      "{{company_name}}": "CV. FDL Warna Mandiri",
      "{{company_address}}": "Perumnas 1, Jl. Jeruk 9 No 214, RT/RW, 06/05, Kel. Kranji, Kec. Bekasi Barat, Kota Bekasi",
      "{{company_phone}}": "(021)-8846079 / 081287652743",
      "{{company_npwp}}": "1000.000.0639.6552",
      "{{customer_name}}": customer.name,
      "{{customer_address}}": customer.address ?? "-",
      "{{invoice_no}}": invoiceNo,
      "{{invoice_date}}": formatTanggalInvoiceNumeric(txDate),
      "{{due_date}}": "-",
      "{{shipping_note}}": "Pengiriman Barang 3 Hari Setelah PO",
      "{{vat_note}}": "Harga Sudah Termasuk VAT (11%)",
      "{{items_rows}}": itemsRows,
      "{{subtotal_fmt_plain}}": formatIdPlain(subtotal),
      "{{dpp_fmt_plain}}": formatIdPlain(dpp),
      "{{ppn_fmt_plain}}": formatIdPlain(ppn),
      "{{total_fmt_plain}}": formatIdPlain(total),
      "{{bank_name}}": "Bank Central Asia (BCA)",
      "{{bank_account}}": "0661-907052",
      "{{bank_holder}}": "Fuad Azzuhri",
      "{{sj_no}}": sjNo,
      "{{sj_date_pretty}}": formatTanggalIndoFull(txDate),
      "{{po_number}}": payload.po_number || "-",
      "{{transport_method}}": payload.logistics.transport_method === "Car" ? "Mobil" : "Motor",
      "{{plate_number}}": payload.logistics.plate_number || "-",
      "{{driver_name}}": payload.logistics.driver_name,
      "{{sj_items_rows}}": sjItemsRows,
      "{{sopir_name}}": payload.logistics.driver_name,
      "{{packing_name}}": "Fahmi",
      "{{manager_name}}": "Agus",
    });

    ensureDir(PDF_DIR);
    const pdfPath = path.join(PDF_DIR, `${invoiceNo.replaceAll("/", "_")}.pdf`);
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    return NextResponse.json({ ok: true, invoice_no: invoiceNo, sj_no: sjNo });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}