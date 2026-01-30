import Link from "next/link";
import { FileText, Download, Calendar } from "lucide-react";
import InvoiceStatus from "./InvoiceStatus"; // Import dari folder yang sama

type InvoiceData = {
  id: number;
  invoiceNo: string;
  date: Date;
  customer: { name: string } | null; // Handle null customer
  status: string;
  grandTotal: number;
};

export default function InvoiceTable({ invoices }: { invoices: InvoiceData[] }) {
  return (
    <div className="space-y-4">
      
      {/* --- DESKTOP TABLE --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Invoice No</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Belum ada data invoice.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-blue-600">{inv.invoiceNo}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(inv.date).toLocaleDateString("id-ID")}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{inv.customer?.name ?? "-"}</td>
                  
                  {/* PANGGIL STATUS DISINI */}
                  <td className="px-6 py-4 text-center">
                    <InvoiceStatus 
                        id={inv.id} 
                        initialStatus={inv.status} 
                        invoiceNo={inv.invoiceNo} 
                    />
                  </td>

                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    {Number(inv.grandTotal).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <a
                      href={`/api/invoices/${encodeURIComponent(inv.invoiceNo)}/pdf`}
                      target="_blank"
                      className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <FileText size={18} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE LIST --- */}
      <div className="md:hidden space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 h-fit"><FileText size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-800">{inv.customer?.name}</h3>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">{inv.invoiceNo}</p>
                </div>
              </div>
              
              {/* STATUS MOBILE */}
              <InvoiceStatus 
                id={inv.id} 
                initialStatus={inv.status} 
                invoiceNo={inv.invoiceNo} 
              />
            </div>
            
            <div className="flex justify-between items-center text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{new Date(inv.date).toLocaleDateString("id-ID")}</span></div>
              <div className="font-bold text-sm text-slate-900">
                 {Number(inv.grandTotal).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`/api/invoices/${encodeURIComponent(inv.invoiceNo)}/pdf`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                <Download size={16} /> Download PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}