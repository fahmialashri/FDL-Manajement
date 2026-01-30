import { NextResponse, NextRequest } from "next/server"; // Tambahkan import NextRequest
import { prisma } from "@/prisma-client";

// Tambahkan parameter 'req: NextRequest' walaupun tidak dipakai, agar TS mengenalinya sebagai Route Handler
export async function GET(req: NextRequest) {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        status: true,
        grandTotal: true,
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({ ok: true, invoices });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}