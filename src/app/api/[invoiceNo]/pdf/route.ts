import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: { invoiceNo: string } }
) {
  try {
    const decoded = decodeURIComponent(params.invoiceNo);

    const STORAGE_DIR = path.join(process.cwd(), "storage");
    const PDF_DIR = path.join(STORAGE_DIR, "pdf");

    const pdfFileName = `${decoded.replaceAll("/", "_")}.pdf`;
    const pdfPath = path.join(PDF_DIR, pdfFileName);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const buf = fs.readFileSync(pdfPath);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFileName}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
