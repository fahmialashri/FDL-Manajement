import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
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
import { supabaseAdmin } from "@/libs/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHROMIUM_PACK_URL = "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";
const BUCKET = "accounting";

type Payload = {
  date: string;
  invoice_no?: string;
  sj_no?: string;
  po_number?: string;
  customer_id?: number;
  customer_new?: { name: string; address?: string; npwp?: string };
  logistics: {
    driver_name: string;
    plate_number?: string;
    transport_method: "Motor" | "Car";
  };
  items: Array<{
    code: string;
    name: string;
    color: string;
    unit: string;
    qty: number;
    unit_price: number;
    description: string;
  }>;
};

function formatIdPlain(n: number) {
  return Number(n).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function uploadToStorage(params: {
  bucket: string;
  storagePath: string;
  data: Buffer;
  contentType: string;
}) {
  const { error } = await supabaseAdmin.storage
    .from(params.bucket)
    .upload(params.storagePath, params.data, {
      contentType: params.contentType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabaseAdmin.storage.from(params.bucket).getPublicUrl(params.storagePath);
  return data.publicUrl;
}

async function buildLedgerWorkbookBuffer() {
  const rows = await prisma.accountingLedger.findMany({ orderBy: { id: "asc" } });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ledger");
  ws.columns = [
    { header: "TANGGAL", key: "date", width: 15 },
    { header: "NO. INVOICE", key: "referenceNo", width: 25 },
    { header: "DESKRIPSI", key: "description", width: 35 },
    { header: "TYPE", key: "type", width: 12 },
    { header: "MASUK (DR)", key: "amount", width: 20 },
    { header: "SALDO", key: "balance", width: 20 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;
  ws.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((r) => {
    ws.addRow({
      date: r.date,
      referenceNo: r.referenceNo ?? "",
      description: r.description,
      type: r.type,
      amount: Number(r.amount),
      balance: Number(r.balance),
    });
  });

  const currencyFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle" };
      if (colNumber === 1) {
        cell.numFmt = "dd/mm/yyyy";
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      if (colNumber === 2) cell.alignment = { vertical: "middle", horizontal: "center" };
      if (colNumber >= 5) {
        cell.numFmt = currencyFmt;
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });
  });
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as any);
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Payload;
    const txDate = new Date(payload.date);

    const dbResult = await prisma.$transaction(async (tx) => {
      const customer = payload.customer_id
        ? await tx.customer.findUnique({ where: { id: payload.customer_id } })
        : payload.customer_new
        ? await tx.customer.create({ data: payload.customer_new })
        : null;

      if (!customer) throw new Error("Customer required");

      const invCount = await tx.invoice.count();
      const invoiceNo = payload.invoice_no?.trim() || makeInvoiceNo(String(invCount + 1).padStart(4, "0"), txDate);
      const sjCount = await tx.suratJalan.count();
      const sjNo = payload.sj_no?.trim() || makeSJNo(String(sjCount + 1), txDate);

      let subtotal = 0;
      const itemsDetailed = payload.items.map((it) => {
        const line = Number(it.qty) * Number(it.unit_price);
        subtotal += line;
        return { ...it, line };
      });

      const { dpp, ppn, total } = calcTaxInclusive(subtotal);

      const inv = await tx.invoice.create({
        data: {
          invoiceNo, date: txDate, customerId: customer.id, subtotal, dppAmount: dpp, ppnAmount: ppn, grandTotal: total,
          status: "UNPAID",
          items: { 
            create: itemsDetailed.map((it) => ({ 
              productName: `[${it.code}] ${it.name}`, 
              unit: it.unit, 
              qty: it.qty, 
              color: it.color || "", 
              unitPrice: it.unit_price, 
              subtotal: it.line,
            })) 
          },
          suratJalan: { create: { sjNo, driverName: payload.logistics.driver_name, plateNumber: payload.logistics.plate_number || "-", transportMethod: payload.logistics.transport_method === "Car" ? "Mobil" : "Motor" } },
        },
      });

      const lastLedger = await tx.accountingLedger.findFirst({ orderBy: { id: "desc" } });
      const newBalance = Number(lastLedger?.balance ?? 0) + total;
      await tx.accountingLedger.create({
        data: { date: txDate, referenceNo: invoiceNo, description: `Invoice ${invoiceNo} - ${customer.name}`, type: "INCOME", amount: total, balance: newBalance },
      });

      return { inv, customer, invoiceNo, sjNo, itemsDetailed, subtotal, dpp, ppn, total };
    });

    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const stampPath = path.join(process.cwd(), "public", "inv-stamp.png");
    const templatePath = path.join(process.cwd(), "templates", "invoice_sj.html");

    const logoBase64 = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` : "";
    const stampBase64 = fs.existsSync(stampPath) ? `data:image/png;base64,${fs.readFileSync(stampPath).toString("base64")}` : logoBase64;
    const template = fs.readFileSync(templatePath, "utf-8");

    // --- 1. TABEL INVOICE (Tetap 5 Kolom) ---
    const itemsRows = dbResult.itemsDetailed.map((it) => `
      <tr>
        <td style="padding: 5px; vertical-align: top; text-align: left;">
          <span>${it.name}</span>
        </td>
        <td style="text-align:center; vertical-align: top; padding: 5px;">${it.color || "-"}</td>
        <td style="text-align:center; vertical-align: top; padding: 5px;">${it.qty} ${it.unit}</td>
        <td style="text-align:right; vertical-align: top; padding: 5px;">${formatRupiah(it.unit_price)}</td>
        <td style="text-align:right; vertical-align: top; padding: 5px;">${formatRupiah(it.line)}</td>
      </tr>
    `).join("");

    // --- 2. TABEL SURAT JALAN (FIX 6 KOLOM SESUAI INSTRUKSI) ---
    // No | Kode | Nama (+Warna) | Satuan | Jumlah | Keterangan
    const sjItemsRows = dbResult.itemsDetailed.map((it, idx) => `
      <tr>
        <td style="text-align:center; vertical-align: top; padding: 5px;">${idx + 1}</td>
        <td style="text-align:center; vertical-align: top; padding: 5px;"><b>${it.code}</b></td>
        <td style="vertical-align: top; padding: 5px; text-align: left;">
          <b>${it.name}</b> ${it.color ? `<br/><small>Warna: ${it.color}</small>` : ""}
        </td>
        <td style="text-align:center; vertical-align: top; padding: 5px;">${it.unit}</td>
        <td style="text-align:center; vertical-align: top; padding: 5px;">${it.qty}</td>
        <td style="text-align:center; vertical-align: top; padding: 5px;">
          ${it.description || "-"}
        </td>
      </tr>
    `).join("");

    const html = replaceAll(template, {
      "{{logo_src}}": logoBase64,
      "{{stamp_src}}": stampBase64,
      "{{company_name}}": "CV. FDL Warna Mandiri",
      "{{company_address}}": "Perumnas 1, Jl. Jeruk 9 No 214, RT/RW, 06/05, Kel. Kranji, Kec. Bekasi Barat, Kota Bekasi",
      "{{company_phone}}": "(021)-8846079 / 081287652743",
      "{{company_npwp}}": "1000.000.0639.6552",
      "{{customer_name}}": dbResult.customer.name,
      "{{customer_address}}": dbResult.customer.address ?? "-",
      "{{invoice_no}}": dbResult.invoiceNo,
      "{{invoice_date}}": formatTanggalInvoiceNumeric(txDate),
      "{{due_date}}": "-",
      "{{shipping_note}}": "Pengiriman Barang 3 Hari Setelah PO",
      "{{vat_note}}": "Harga Sudah Termasuk VAT (11%)",
      "{{items_rows}}": itemsRows,
      "{{subtotal_fmt_plain}}": formatIdPlain(dbResult.subtotal),
      "{{dpp_fmt_plain}}": formatIdPlain(dbResult.dpp),
      "{{ppn_fmt_plain}}": formatIdPlain(dbResult.ppn),
      "{{total_fmt_plain}}": formatIdPlain(dbResult.total),
      "{{bank_name}}": "Bank Central Asia (BCA)",
      "{{bank_account}}": "0661-907052",
      "{{bank_holder}}": "Fuad Azzuhri",
      "{{sj_no}}": dbResult.sjNo,
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

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: "shell" as any,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
    await browser.close();

    const pdfUrl = await uploadToStorage({ bucket: BUCKET, storagePath: `pdf/${dbResult.invoiceNo.replace(/\//g, "_")}.pdf`, data: pdfBuffer, contentType: "application/pdf" });
    const ledgerBuffer = await buildLedgerWorkbookBuffer();
    const ledgerUrl = await uploadToStorage({ bucket: BUCKET, storagePath: `excel/Accounting_Ledger.xlsx`, data: ledgerBuffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    return NextResponse.json({ ok: true, invoice_no: dbResult.invoiceNo, pdf_url: pdfUrl, ledger_url: ledgerUrl, invoice_id: dbResult.inv.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}