import Link from 'next/link';
import { prisma } from "@/prisma-client"; 
import { formatRupiah } from "@/libs/format"; 

// --- QUICK FIX: CACHE 10 DETIK AGAR INSTAN ---
export const dynamic = 'force-dynamic';
export const revalidate = 10; 

import { 
  TrendingUp, 
  ArrowRight, 
  MoreHorizontal, 
  Bell,
  List,
  FileText,
  ReceiptText
} from "lucide-react";

// Helper Tanggal
const getDates = () => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { thisMonthStart, prevMonthStart, prevMonthEnd };
};

export default async function DashboardPage() {
  const { thisMonthStart, prevMonthStart, prevMonthEnd } = getDates();

  // --- OPTIMASI 1: PARALLEL FETCHING (Semua jalan barengan) ---
  const [incomeData, invStats, recentInvoices] = await Promise.all([
    // Ambil Omset Bulan Ini & Bulan Lalu
    prisma.accountingLedger.groupBy({
      by: ['type'],
      where: { 
        type: "INCOME", 
        date: { gte: prevMonthStart } 
      },
      _sum: { amount: true },
    }),

    // Ambil Count Status Invoice sekaligus
    prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true }
    }),

    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        grandTotal: true,
        status: true,
        customer: { select: { name: true } }
      }
    }) // <--- Tambah kurung tutup di sini
  ]);
  // --- LOGIKA PERHITUNGAN (Client-side logic di Server) ---
  const revenueThisMonth = Number(incomeData.find(d => d.type === "INCOME")?._sum?.amount ?? 0);
  // Note: Untuk revenuePrevMonth, idealnya dipisah query-nya jika data sudah jutaan, 
  // tapi untuk skala sekarang ini sudah sangat cepat.
  const revenuePrevMonth = 0; // Placeholder jika ingin perhitungan growth lebih detail bisa dipisah query-nya

  const paidCount = invStats.find(s => s.status === "PAID")?._count?.id ?? 0;
  const unpaidCount = invStats.find(s => s.status === "UNPAID")?._count?.id ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-6">
        
        {/* TOP HEADER */}
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Ringkasan aktivitas hari ini</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-600 shadow-sm transition-all active:scale-90">
              <Bell size={20}/>
            </button>
          </div>
        </header>

        {/* WELCOME BANNER */}
        <div className="bg-blue-800 md:bg-gradient-to-r md:from-blue-900 md:to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-blue-700">
          <div className="relative z-10">
            <h1 className="text-xl md:text-3xl font-bold mb-2">
              Selamat Datang, <span className="text-yellow-400"></span> 👋
            </h1>
            <div className="flex gap-4 mt-4">
               <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                  <p className="text-[10px] md:text-xs text-blue-100 uppercase font-bold tracking-wider">Omset Bulan Ini</p>
                  <p className="text-lg md:text-2xl font-black">{formatRupiah(revenueThisMonth)}</p>
               </div>
            </div>
          </div>
          <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-yellow-400 rounded-full opacity-10 blur-3xl"></div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Pendapatan" value={formatRupiah(revenueThisMonth)} trend={0} icon={<TrendingUp size={18}/>} color="bg-blue-50 text-blue-600" />
          <StatCard title="Lunas" value={paidCount.toString()} sub="Invoice" icon={<List size={18}/>} color="bg-green-50 text-green-600" />
          <StatCard title="Expense" value="Auto" sub="Tercatat" icon={<FileText size={18}/>} color="bg-red-50 text-red-600" />
          <StatCard title="Pending" value={unpaidCount.toString()} sub="Invoice" icon={<ReceiptText size={18}/>} color="bg-orange-50 text-orange-600" />
        </div>

        {/* TRANSAKSI LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-base md:text-lg">Transaksi Terakhir</h3>
            <Link href="/invoices" className="text-xs md:text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1 transition-colors">
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>
          
          {/* TAMPILAN TABEL (DESKTOP) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-widest">
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
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors cursor-default">
                    <td className="px-6 py-4 font-bold text-slate-700">{inv.invoiceNo}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{inv.customer.name}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(inv.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">{formatRupiah(Number(inv.grandTotal))}</td>
                    <td className="px-6 py-4 text-center"><MoreHorizontal size={18} className="mx-auto text-slate-400 hover:text-slate-600 cursor-pointer"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TAMPILAN KARTU (MOBILE) */}
          <div className="md:hidden divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <p className="p-10 text-center text-sm text-slate-400 font-medium">Belum ada data transaksi.</p>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 active:bg-slate-100 transition-colors">
                     <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{inv.customer.name}</p>
                            <p className="text-[10px] font-medium text-slate-500">{inv.invoiceNo} • {new Date(inv.date).toLocaleDateString('id-ID')}</p>
                        </div>
                        <StatusBadge status={inv.status} />
                     </div>
                     <div className="flex justify-between items-center mt-1 border-t border-slate-50 pt-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Total Tagihan</span>
                        <span className="font-black text-slate-900">{formatRupiah(Number(inv.grandTotal))}</span>
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
  const isPaid = status === 'PAID' || status === 'LUNAS';
  const styles = isPaid 
    ? 'bg-green-100 text-green-700 border-green-200' 
    : 'bg-orange-100 text-orange-700 border-orange-200';
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black border ${styles}`}>
      {status}
    </span>
  );
}

function StatCard({ title, value, sub, trend, icon, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest leading-none">{title}</p>
        <div className={`p-2 rounded-xl ${color} shadow-sm`}>
          {icon}
        </div>
      </div>
      <div>
         <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
         <div className="flex items-center text-[10px] md:text-xs mt-1 font-bold">
            {trend !== undefined && trend !== 0 ? (
               <span className={`px-1.5 py-0.5 rounded-md ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
               {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
               </span>
            ) : (
               <span className="text-slate-400">{sub}</span>
            )}
         </div>
      </div>
    </div>
  );
}