import Link from 'next/link';
import { prisma } from "@/prisma-client"; 
import { formatRupiah } from "@/libs/format"; 

// --- PENTING: TAMBAHKAN INI AGAR DATA SELALU TERBARU ---
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { 
  TrendingUp, 
  ArrowRight, 
  MoreHorizontal, 
  Bell,
  List,
  FileText,
  ReceiptText
} from "lucide-react";

// --- 1. LOGIKA DATA ---
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfPrevMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }
function endOfPrevMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999); }

export default async function DashboardPage() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);
  const prevMonthEnd = endOfPrevMonth(now);

  // Ambil Data Omset (Agregasi dari Ledger)
  const [incomeThisMonthAgg, incomePrevMonthAgg] = await Promise.all([
    prisma.accountingLedger.aggregate({ where: { type: "INCOME", date: { gte: thisMonthStart } }, _sum: { amount: true } }),
    prisma.accountingLedger.aggregate({ where: { type: "INCOME", date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
  ]);

  const revenueThisMonth = Number(incomeThisMonthAgg._sum.amount ?? 0);
  const revenuePrevMonth = Number(incomePrevMonthAgg._sum.amount ?? 0);
  
  // Kalkulasi Pertumbuhan
  const growth = revenuePrevMonth === 0 ? (revenueThisMonth > 0 ? 100 : 0) : ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100;

  // Ambil Data Invoice & Status
  const [unpaidCount, paidCount] = await Promise.all([
    prisma.invoice.count({ where: { status: "UNPAID" } }),
    prisma.invoice.count({ where: { status: "PAID" } }),
  ]);

  // Ambil Transaksi Terbaru (Limit 6)
  const recentInvoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { customer: true }
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
        
        {/* TOP HEADER */}
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
            <p className="text-xs md:text-sm text-slate-500">Ringkasan aktivitas hari ini</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600 shadow-sm">
              <Bell size={20}/>
            </button>
          </div>
        </header>

        {/* WELCOME BANNER */}
        <div className="bg-blue-800 md:bg-gradient-to-r md:from-blue-800 md:to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-xl md:text-3xl font-bold mb-2">
              Selamat Datang, <span className="text-yellow-400">Bos Fahmi!</span> 👋
            </h1>
            <div className="flex gap-4 mt-4">
               <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                  <p className="text-[10px] md:text-xs text-blue-200 uppercase">Omset Bulan Ini</p>
                  <p className="text-lg md:text-xl font-bold">{formatRupiah(revenueThisMonth)}</p>
               </div>
            </div>
          </div>
          <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-yellow-400 rounded-full opacity-20 blur-2xl"></div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Pendapatan" value={formatRupiah(revenueThisMonth)} trend={growth} icon={<TrendingUp size={18}/>} color="bg-blue-50 text-blue-600" />
          <StatCard title="Lunas" value={paidCount.toString()} sub="Invoice" icon={<List size={18}/>} color="bg-green-50 text-green-600" />
          <StatCard title="Expense" value="Auto" sub="Tercatat" icon={<FileText size={18}/>} color="bg-red-50 text-red-600" />
          <StatCard title="Pending" value={unpaidCount.toString()} sub="Invoice" icon={<ReceiptText size={18}/>} color="bg-orange-50 text-orange-600" />
        </div>

        {/* TRANSAKSI LIST */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base md:text-lg">Transaksi Terakhir</h3>
            <Link href="/invoices" className="text-xs md:text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>
          
          {/* TAMPILAN TABEL (DESKTOP) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                <tr>
                  <th className="px-6 py-4">Invoice No</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{inv.invoiceNo}</td>
                    <td className="px-6 py-4 text-slate-600">{inv.customer.name}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-6 py-4 text-right font-bold">{formatRupiah(Number(inv.grandTotal))}</td>
                    <td className="px-6 py-4 text-center"><MoreHorizontal size={18} className="mx-auto text-slate-400"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TAMPILAN KARTU (MOBILE) */}
          <div className="md:hidden divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-400">Belum ada data.</p>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-col gap-2">
                     <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{inv.customer.name}</p>
                            <p className="text-xs text-slate-500">{inv.invoiceNo} • {new Date(inv.date).toLocaleDateString('id-ID')}</p>
                        </div>
                        <StatusBadge status={inv.status} />
                     </div>
                     <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-400">Total Tagihan</span>
                        <span className="font-bold text-slate-900">{formatRupiah(Number(inv.grandTotal))}</span>
                     </div>
                  </div>
                ))
              )}
          </div>
        </div>
    </div>
  );
}

// --- SUB COMPONENTS ---
function StatusBadge({ status }: { status: string }) {
  const styles = status === 'PAID' || status === 'LUNAS' 
    ? 'bg-green-100 text-green-700' 
    : 'bg-orange-100 text-orange-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}

function StatCard({ title, value, sub, trend, icon, color }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wide">{title}</p>
        <div className={`p-1.5 md:p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div>
         <h3 className="text-lg md:text-2xl font-bold text-slate-800">{value}</h3>
         <div className="flex items-center text-[10px] md:text-xs mt-1">
            {trend !== undefined ? (
               <span className={`font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
               {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
               </span>
            ) : (
               <span className="text-slate-400">{sub}</span>
            )}
         </div>
      </div>
    </div>
  );
}