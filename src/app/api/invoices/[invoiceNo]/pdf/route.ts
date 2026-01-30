import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    // Next terbaru: params itu Promise -> WAJIB await
    const { invoiceNo } = await params;

    if (!invoiceNo) {
      return NextResponse.json({ error: "invoiceNo is required" }, { status: 400 });
    }

    const decoded = decodeURIComponent(invoiceNo);

    const STORAGE_DIR = path.join(process.cwd(), "storage");
    const PDF_DIR = path.join(STORAGE_DIR, "pdf");

    // kamu simpan file pakai underscore, dan format kamu: 0006_INV-FDL_I_2026.pdf
    // ini berarti invoiceNo decoded harus jadi: 0006/INV-FDL/I/2026
    // lalu diganti slash -> underscore
    const fileName = `${decoded.replaceAll("/", "_")}.pdf`;
    const pdfPath = path.join(PDF_DIR, fileName);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        {
          error: "PDF not found",
          invoiceNo: decoded,
          fileName,
          hint: "Pastikan file ada di storage/pdf dan namanya sesuai pattern invoiceNo.replaceAll('/', '_').pdf",
        },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(pdfPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
