"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, ScanText, UploadCloud, FileText, 
  Loader2, X, Search, Save, Edit3, RefreshCw,
  CheckCircle, AlertTriangle, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- TIPE DATA TOAST ---
type ToastType = {
  show: boolean;
  message: string;
  type: "success" | "error" | "warning";
};

export default function OcrUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"UPLOAD" | "REVIEW">("UPLOAD");
  
  // State Data Form
  const [formData, setFormData] = useState({
    invoiceNo: "",
    date: "",
    amount: "", 
    description: "OCR Import"
  });

  // State Toast & Modal Konfirmasi
  const [toast, setToast] = useState<ToastType>({ show: false, message: "", type: "success" });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // --- HELPER: TOAST OTOMATIS HILANG ---
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showNotification(message: string, type: "success" | "error" | "warning") {
    setToast({ show: true, message, type });
  }

  // --- FUNGSI UTAMA ---
  async function toBase64(f: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleScan() {
    if (!file) return showNotification("Pilih file dulu, Bos!", "warning");
    setLoading(true);

    try {
      const file_base64 = await toBase64(file);
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: JSON.stringify({ file_base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const rawAmount = data.parsed.totalRaw ? data.parsed.totalRaw.replace(/\./g, "").replace(",", ".") : "0";
      
      setFormData({
        invoiceNo: data.parsed.invoiceNo || "INV-OCR",
        date: new Date().toISOString().split("T")[0],
        amount: rawAmount,
        description: `Import Invoice ${data.parsed.invoiceNo || ""}`
      });

      setStep("REVIEW");
      showNotification("Scan berhasil! Silakan cek datanya.", "success");
    } catch (e: any) {
      showNotification("Gagal scan: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSaveClick() {
    // Cek Nominal 0
    if (!formData.amount || formData.amount === "0") {
      setShowConfirmModal(true); // Munculkan Modal Konfirmasi
    } else {
      executeSave(); // Langsung simpan
    }
  }

  async function executeSave() {
    setShowConfirmModal(false);
    setLoading(true);
    
    try {
      const res = await fetch("/api/ledger/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error("Gagal menyimpan");
      
      showNotification("Berhasil masuk ke Ledger!", "success");
      
      // Delay dikit biar toast kebaca, baru redirect
      setTimeout(() => {
        router.push("/"); // Redirect ke Dashboard
        router.refresh();
      }, 1500);
      
    } catch (e: any) {
      showNotification("Error: " + e.message, "error");
      setLoading(false);
    }
  }

  function clearFile() {
    setFile(null);
    setStep("UPLOAD");
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans relative">
      
      {/* --- NOTIFIKASI TOAST MODERN (Pojok Kanan Atas) --- */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border-l-4 animate-in slide-in-from-right duration-300 bg-white
          ${toast.type === "success" ? "border-green-500 text-green-700" : 
            toast.type === "error" ? "border-red-500 text-red-700" : 
            "border-yellow-500 text-yellow-700"}`}
        >
          {toast.type === "success" && <CheckCircle size={24} />}
          {toast.type === "error" && <AlertCircle size={24} />}
          {toast.type === "warning" && <AlertTriangle size={24} />}
          <div>
            <p className="font-bold text-sm uppercase">{toast.type}</p>
            <p className="text-sm font-medium opacity-90">{toast.message}</p>
          </div>
          <button onClick={() => setToast({...toast, show: false})} className="ml-2 hover:bg-black/5 rounded-full p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- MODAL KONFIRMASI (Jika Nominal 0) --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="bg-yellow-100 text-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Nominal Masih 0?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Sistem mendeteksi total nominal Rp 0. Yakin mau simpan transaksi kosong ini?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                Cek Lagi
              </button>
              <button 
                onClick={executeSave}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
              >
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-blue-800 pt-8 pb-24 px-6 rounded-b-[2rem] md:rounded-b-[3rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-yellow-400 rounded-full opacity-10 blur-3xl -mr-6 -mt-6 pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors active:scale-95">
             <div className="bg-blue-700/50 p-1.5 rounded-lg"><ArrowLeft size={18} /></div>
             <span className="text-sm font-semibold">Kembali</span>
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-3 md:gap-4">
            <div className="bg-yellow-400 text-blue-900 rounded-xl p-2 md:p-3 shadow-lg shadow-blue-900/20">
              <ScanText size={24} className="md:w-8 md:h-8" />
            </div>
            Scan Invoice
          </h1>
          <p className="text-blue-100/80 text-sm md:text-base mt-2 ml-1 md:ml-0">
            Foto struk/invoice, AI akan membaca isinya.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-16 md:-mt-20 relative z-20 space-y-6">
        
        {/* STEP 1: UPLOAD */}
        {step === "UPLOAD" && (
          <div className="bg-white p-5 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
             {!file ? (
               <label className="flex flex-col items-center justify-center w-full h-40 md:h-56 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50 transition-all group active:scale-[0.99]">
                 <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="text-blue-500" size={32} />
                 </div>
                 <p className="text-sm md:text-base text-slate-700 font-bold">Tap untuk Upload</p>
                 <p className="text-xs text-slate-400 mt-1">PDF atau Foto</p>
                 <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
               </label>
             ) : (
               <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in-95">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-blue-600 text-white p-2.5 rounded-xl shrink-0"><FileText size={20} /></div>
                    <div className="min-w-0">
                       <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                       <p className="text-xs text-slate-500">Siap diproses</p>
                    </div>
                 </div>
                 <button onClick={clearFile} className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm shrink-0">
                    <X size={18} />
                 </button>
               </div>
             )}

             <button
               onClick={handleScan}
               disabled={loading || !file}
               className="w-full mt-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-base md:text-lg shadow-lg shadow-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
               {loading ? "Sedang Membaca..." : "Mulai Scan OCR"}
             </button>
          </div>
        )}

        {/* STEP 2: REVIEW & EDIT */}
        {step === "REVIEW" && (
          <div className="bg-white p-5 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg"><Edit3 size={20} /></div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800">Cek Hasil Scan</h2>
                <p className="text-xs text-slate-400">Pastikan data benar sebelum simpan</p>
              </div>
            </div>

            <div className="grid gap-5">
              {/* Form Inputs */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">Tanggal</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">No. Invoice / Ref</label>
                <input type="text" value={formData.invoiceNo} onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">Keterangan</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>

              {/* Input Nominal Besar */}
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100 transition-all focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
                <label className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">Total Nominal</label>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-green-600 font-bold text-lg">Rp</span>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full pl-8 bg-transparent border-none p-0 font-bold text-3xl text-green-700 focus:ring-0 placeholder-green-200" placeholder="0" />
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col md:flex-row gap-3 mt-8">
              <button onClick={handleSaveClick} disabled={loading} className="order-1 md:order-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                Simpan Transaksi
              </button>
              
              <button onClick={() => setStep("UPLOAD")} className="order-2 md:order-1 w-full py-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <RefreshCw size={18} />
                Ulang Scan
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}