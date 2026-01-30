"use client";

import Link from "next/link";
import React, { useState } from "react";
import { 
  ArrowLeft, 
  Wallet, 
  Calendar, 
  AlignLeft, 
  Save, 
  Loader2,
  TrendingDown 
} from "lucide-react";
import { formatRupiah } from "@/libs/format"; // Pastikan path ini benar

export default function ExpenseForm() {
  // --- STATE ---
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">(""); // Biar placeholder muncul kalau kosong
  const [loading, setLoading] = useState(false);

  // --- LOGIC ---
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert("⚠️ Nominal harus diisi, Bos!");
    if (!description.trim()) return alert("⚠️ Deskripsi pengeluaran wajib diisi!");

    setLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description, amount: Number(amount) }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Gagal simpan expense");
      }

      // Reset Form kalau sukses
      alert("✅ Expense berhasil dicatat!");
      setDescription("");
      setAmount("");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- HEADER BIRU --- */}
      <div className="bg-blue-800 pt-6 pb-20 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        {/* Dekorasi Abstrak */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full opacity-10 blur-3xl -mr-10 -mt-10"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Tombol Back */}
          <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
             <ArrowLeft size={20} />
             <span className="text-sm font-semibold">Kembali ke Dashboard</span>
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-yellow-400 text-blue-900 rounded-xl p-2 shadow-lg">
              <Wallet size={24} />
            </div>
            Catat Pengeluaran
          </h1>
          <p className="text-blue-100 text-sm mt-2 ml-12 opacity-90">
            Input biaya operasional (Bensin, Makan, Tol, dll) agar Laporan Laba Rugi akurat.
          </p>
        </div>
      </div>

      {/* --- FORM CARD --- */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-20">
        <form onSubmit={onSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
           
           {/* Section Header Card */}
           <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
              <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                 <TrendingDown size={20} />
              </div>
              <div>
                 <h2 className="font-bold text-slate-800">Formulir Expense</h2>
                 <p className="text-xs text-slate-500">Uang keluar akan tercatat di Kredit (Ledger)</p>
              </div>
           </div>

           {/* Input Grid */}
           <div className="space-y-5">
              
              {/* Tanggal */}
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Tanggal Transaksi</label>
                 <div className="relative">
                    <div className="absolute left-3 top-3.5 text-slate-400">
                       <Calendar size={18} />
                    </div>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700"
                    />
                 </div>
              </div>

              {/* Deskripsi */}
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Keterangan / Deskripsi</label>
                 <div className="relative">
                    <div className="absolute left-3 top-3.5 text-slate-400">
                       <AlignLeft size={18} />
                    </div>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Contoh: Bensin Mobil Box B 1234 XX"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    />
                 </div>
              </div>

              {/* Nominal */}
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Nominal (Rupiah)</label>
                 <div className="relative">
                    <div className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">
                       Rp
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-slate-800 placeholder-slate-300"
                    />
                 </div>
                 {/* Helper Text: Format Rupiah */}
                 {amount ? (
                    <p className="text-right text-xs font-bold text-blue-600 mt-1">
                       {formatRupiah(Number(amount))}
                    </p>
                 ) : null}
              </div>

           </div>

           {/* Submit Button */}
           <button
             type="submit"
             disabled={loading}
             className="w-full mt-4 bg-black hover:bg-slate-800 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             {loading ? (
               <>
                 <Loader2 className="animate-spin" size={20} />
                 Menyimpan...
               </>
             ) : (
               <>
                 <Save size={20} />
                 Simpan Pengeluaran
               </>
             )}
           </button>

        </form>
      </div>
    </div>
  );
}