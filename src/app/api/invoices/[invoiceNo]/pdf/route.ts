import { NextResponse, NextRequest } from "next/server"; // Gunakan NextRequest
import fs from "fs";
import path from "path";

// Gunakan NextRequest dan ganti struktur parameter kedua menjadi 'context'
export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    // Sesuai aturan baru: params harus di-await dari context
    const { invoiceNo } = await context.params;

    if (!invoiceNo) {
      return NextResponse.json({ error: "invoiceNo is required" }, { status: 400 });
    }

    const decoded = decodeURIComponent(invoiceNo);
    const STORAGE_DIR = path.join(process.cwd(), "storage");
    const PDF_DIR = path.join(STORAGE_DIR, "pdf");

    const fileName = `${decoded.replaceAll("/", "_")}.pdf`;
    const pdfPath = path.join(PDF_DIR, fileName);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        {
          error: "PDF not found",
          invoiceNo: decoded,
          fileName,
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