import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/libs/supabaseAdmin"; // Pastikan path import benar

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    // 1. Await params sesuai standar Next.js terbaru
    const { invoiceNo } = await context.params;

    if (!invoiceNo) {
      return NextResponse.json({ error: "invoiceNo is required" }, { status: 400 });
    }

    const decoded = decodeURIComponent(invoiceNo);
    
    // 2. Format nama file harus sama persis dengan saat upload di POST
    const fileName = `${decoded.replaceAll("/", "_")}.pdf`;

    // 3. Ambil data dari Supabase Storage (bukan dari fs lokal)
    const { data, error } = await supabaseAdmin.storage
      .from("accounting") // Nama bucket Anda
      .download(`pdf/${fileName}`); // Harus menyertakan path folder 'pdf/'

    if (error || !data) {
      return NextResponse.json(
        {
          error: "PDF tidak ditemukan di storage",
          invoiceNo: decoded,
          fileName,
        },
        { status: 404 }
      );
    }

    // 4. Ubah Blob/File dari Supabase menjadi ArrayBuffer untuk Response
    const fileBuffer = await data.arrayBuffer();

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("View PDF Error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}