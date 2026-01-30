"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  X 
} from "lucide-react";

export default function InvoiceStatus({ 
  id, 
  initialStatus,
  invoiceNo 
}: { 
  id: number; 
  initialStatus: string;
  invoiceNo: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk Modal Konfirmasi & Toast
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; type: 'success'|'error'; message: string }>({ 
    show: false, type: 'success', message: '' 
  });

  const isPaid = ["PAID", "LUNAS"].includes(initialStatus?.toUpperCase());

  // Auto-hide Toast setelah 4 detik
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleMarkPaid = async () => {
    // Tutup modal konfirmasi
    setShowConfirm(false);
    
    // Mulai Loading
    setIsLoading(true);

    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });

      if (res.ok) {
        // SUKSES
        setToast({ show: true, type: 'success', message: 'Status berhasil diubah menjadi LUNAS' });
        router.refresh(); 
      } else {
        // GAGAL API
        const msg = await res.json();
        setToast({ show: true, type: 'error', message: msg.error || "Gagal update status" });
      }
    } catch (e) {
      // ERROR NETWORK
      setToast({ show: true, type: 'error', message: "Koneksi server bermasalah" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- TAMPILAN JIKA SUDAH LUNAS (STATIS) ---
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm">
        <CheckCircle size={14} className="text-green-600" /> LUNAS
      </span>
    );
  }

  return (
    <>
      {/* 1. TOMBOL UTAMA (BELUM LUNAS) */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className="group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold bg-white text-orange-600 border border-orange-200 shadow-sm hover:bg-orange-50 hover:border-orange-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin text-orange-500" />
        ) : (
          <XCircle size={14} className="text-orange-400 group-hover:text-orange-500" />
        )}
        <span className="tracking-wide">{isLoading ? "MEMPROSES..." : "BELUM LUNAS"}</span>
      </button>


      {/* 2. MODAL KONFIRMASI (MODERN POP-UP) */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-orange-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Pembayaran</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menandai Invoice <span className="font-mono font-bold text-slate-700">{invoiceNo}</span> ini sebagai <span className="text-green-600 font-bold">LUNAS</span>?
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white hover:border-slate-300 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleMarkPaid}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
              >
                Ya, Lunas
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 3. TOAST NOTIFICATION (POJOK KANAN ATAS) */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[9999] animate-in slide-in-from-right fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border-l-4 bg-white ${
            toast.type === 'success' ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className={`p-1.5 rounded-full ${
               toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h4 className={`font-bold text-sm ${
                 toast.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {toast.type === 'success' ? 'Berhasil!' : 'Gagal!'}
              </h4>
              <p className="text-xs text-slate-500 font-medium">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast({...toast, show: false})}
              className="ml-2 text-slate-300 hover:text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}