import { NextResponse } from "next/server";
import * as Tesseract from "tesseract.js"; 
// @ts-ignore
import PDFParser from "pdf2json";

export const dynamic = "force-dynamic"; // 👈 WAJIB A

export const maxDuration = 60; // Biar gak timeout kalau file gede

type Payload = {
  file_base64: string;
};

// --- FUNGSI BACA PDF & TEXT ---
function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true); 
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => resolve(pdfParser.getRawTextContent()));
    try { pdfParser.parseBuffer(buffer); } catch (e) { reject(e); }
  });
}

function extractFields(text: string) {
  let decodedText = text;
  try { decodedText = decodeURIComponent(text); } catch (e) { decodedText = text; }
  const cleanText = decodedText.replace(/\n/g, " ");
  
  const invoiceNoMatch = cleanText.match(/INV[\w\/\-]+/i);
  const dateMatch = cleanText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
  const totalMatch = cleanText.match(/(?:Total|Tagihan|Grand Total|Amount|Nilai)[\s\w]*[:\.]?\s*Rp?\.?\s*([\d\.\,]+)/i);

  return { 
    invoiceNo: invoiceNoMatch ? invoiceNoMatch[0] : "", 
    dateRaw: dateMatch ? dateMatch[0] : "", 
    totalRaw: totalMatch ? totalMatch[1] : "0", 
    text: cleanText 
  };
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.file_base64) return NextResponse.json({ error: "File required" }, { status: 400 });

    const isPdf = payload.file_base64.startsWith("data:application/pdf");
    const base64Data = payload.file_base64.replace(/^data:.*,/, "");
    const buf = Buffer.from(base64Data, "base64");
    let text = "";

    if (isPdf) {
      console.log("📄 PDF OCR...");
      try { text = await parsePdfBuffer(buf); } 
      catch (e: any) { throw new Error("Gagal baca PDF: " + e.message); }
    } else {
      console.log("📷 Image OCR...");
      const result = await Tesseract.recognize(buf, "ind");
      text = result.data.text;
    }
    
    const parsed = extractFields(text);
    
    // KITA HAPUS BAGIAN SAVE KE DB DISINI.
    // Cuma balikin data biar diedit user di Frontend.
    return NextResponse.json({ ok: true, parsed });

  } catch (e: any) {
    console.error("❌ Error:", e);
    return NextResponse.json({ error: "Gagal memproses file.", details: e.message }, { status: 500 });
  }
}