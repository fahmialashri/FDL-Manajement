"use client";

import React from 'react';
import { Trash2, ShieldAlert, Database, ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(false);

  const handleResetTotal = async () => {
    const pass = window.prompt("⚠️ KONFIRMASI DIREKTUR: Masukkan Password untuk Reset Total:");
    
    if (!pass) return;

    const yakin = confirm("Semua data Invoice, Customer, dan Ledger akan hilang PERMANEN. Anda yakin?");
    if (!yakin) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ " + result.message);
        window.location.href = "/"; // Balik ke dashboard
      } else {
        alert("❌ Gagal: " + result.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h2>
          <p className="text-sm text-slate-500">Kelola database FDL Warna Mandiri</p>
        </div>
      </header>

      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-3 text-red-600">
            <ShieldAlert size={24} />
            <h3 className="font-bold text-lg">Zona Bahaya (Danger Zone)</h3>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-800">Reset Seluruh Data Perusahaan</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tindakan ini akan menghapus seluruh catatan transaksi di database dan 
                  membersihkan semua file (PDF & Excel) di Cloud Storage. ID transaksi akan diulang dari 0001.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleResetTotal}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                  loading 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                }`}
              >
                <Trash2 size={18} />
                {loading ? "Sedang Menghapus..." : "Hapus Semua Data Sekarang"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}