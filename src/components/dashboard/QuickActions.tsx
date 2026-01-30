import Link from "next/link";
import { FileText, Truck, ReceiptText, Download } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="font-semibold text-lg">Quick Actions</div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Link href="/transactions/new" className="rounded-xl border p-3 hover:bg-gray-50">
          <div className="flex items-center gap-2 font-semibold">
            <ReceiptText size={16} /> Transaksi
          </div>
          <div className="text-xs text-gray-600 mt-1">Invoice + SJ</div>
        </Link>

        <Link href="/expenses" className="rounded-xl border p-3 hover:bg-gray-50">
          <div className="flex items-center gap-2 font-semibold">
            <FileText size={16} /> Expense
          </div>
          <div className="text-xs text-gray-600 mt-1">Credit ledger</div>
        </Link>

        <Link href="/invoices" className="rounded-xl border p-3 hover:bg-gray-50">
          <div className="flex items-center gap-2 font-semibold">
            <Truck size={16} /> Invoice
          </div>
          <div className="text-xs text-gray-600 mt-1">Buka PDF</div>
        </Link>

        <a href="/api/ledger" target="_blank" rel="noreferrer" className="rounded-xl border p-3 hover:bg-gray-50">
          <div className="flex items-center gap-2 font-semibold">
            <Download size={16} /> Excel
          </div>
          <div className="text-xs text-gray-600 mt-1">Download ledger</div>
        </a>
      </div>
    </div>
  );
}
