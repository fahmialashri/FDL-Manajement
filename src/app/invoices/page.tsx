import Link from "next/link";
import { prisma } from "@/prisma-client";
import { 
  Plus, 
  FileText, 
  FileSpreadsheet // Icon Excel
} from "lucide-react";

// Import Table Utama Kita
import InvoiceTable from "@/components/invoices/InvoiceTable";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  // 1. Ambil data mentah dari Database (Prisma)
  const invoicesData = await prisma.invoice.findMany({
    orderBy: { id: "desc" },
    take: 50,
    include: {
      customer: { select: { name: true } },
    },
  });

  // 2. KONVERSI DATA (Decimal -> Number)
  const invoices = invoicesData.map((inv) => ({
    ...inv,
    grandTotal: Number(inv.grandTotal), 
    customer: inv.customer, 
  }));

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-10 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-4 py-5 md:px-8 md:py-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-blue-600" /> Data Invoice
            </h1>
            <p className="text-sm text-slate-500 mt-1">Kelola tagihan dan status pembayaran</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* TOMBOL DOWNLOAD LEDGER (BARU) */}
            <a
              href="/api/ledger"
              target="_blank"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm active:scale-95 transition-all"
              title="Download Laporan Keuangan (Excel)"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden md:inline">Download Ledger</span>
              <span className="md:hidden">Ledger</span>
            </a>

            {/* TOMBOL BUAT BARU */}
            <Link
              href="/transactions/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Buat Baru</span>
              <span className="md:hidden">Baru</span>
            </Link>
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 md:mt-8">
        
        {/* Panggil Komponen Table Utama */}
        <InvoiceTable invoices={invoices} />

      </div>
    </div>
  );
}