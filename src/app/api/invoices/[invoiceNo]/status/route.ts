import { NextResponse } from "next/server";
import { prisma } from "@/prisma-client";

export async function PATCH(
  req: Request,
  // Update: params sekarang harus Promise
  { params }: { params: Promise<{ invoiceNo: string }> } 
) {
  try {
    const body = await req.json();
    const { status } = body;

    // LANGKAH PENTING: Await params dulu!
    const { invoiceNo } = await params;

    // Baru bisa dipakai
    const id = Number(invoiceNo);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const updated = await prisma.invoice.update({
      where: { id: id },
      data: { status: status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Gagal update status" }, { status: 500 });
  }
}