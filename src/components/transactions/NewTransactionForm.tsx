"use client";

import Link from "next/link"; 
import { useMemo, useState, useEffect } from "react";
import { formatRupiah } from "@/libs/format";
import { calcTaxInclusive } from "@/libs/tax";
import { 
  User, 
  Truck, 
  Package, 
  Plus, 
  Trash2, 
  Save, 
  ChevronDown,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle, // Icon untuk Error
  Printer,
  X
} from "lucide-react";

type Customer = {
  id: number;
  name: string;
  address: string | null;
  npwp: string | null;
};

type ItemRow = {
  name: string;
  color: string;
  unit: string;
  qty: number;
  unit_price: number;
};

export default function NewTransactionForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: any[];
}) {
  // --- STATE ---
  const [isLoading, setIsLoading] = useState(false);
  
  // State Toast Lebih Lengkap (Bisa Error/Success)
  const [toast, setToast] = useState<{ 
    show: boolean; 
    type: 'success' | 'error'; 
    message: string; 
    invoiceNo?: string; // Hanya terisi kalau sukses
  }>({ 
    show: false, 
    type: 'success', 
    message: '', 
    invoiceNo: '' 
  });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [poNumber, setPoNumber] = useState("");

  const [customerId, setCustomerId] = useState<number | "">("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerNpwp, setNewCustomerNpwp] = useState("");

  const [driverName, setDriverName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [transportMethod, setTransportMethod] = useState<"Motor" | "Car">("Motor");

  const [items, setItems] = useState<ItemRow[]>([
    { name: "", color: "", unit: "KG", qty: 1, unit_price: 0 },
  ]);

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      // Kalau Error 4 detik aja, Kalau Sukses 10 detik (biar sempet klik PDF)
      const duration = toast.type === 'error' ? 4000 : 10000;
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), duration);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.type]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.qty || 0) * Number(it.unit_price || 0), 0);
  }, [items]);

  const tax = useMemo(() => calcTaxInclusive(subtotal), [subtotal]);

  function addRow() {
    setItems((prev) => [...prev, { name: "", color: "", unit: "KG", qty: 1, unit_price: 0 }]);
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setRow(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  // --- FUNGSI SUBMIT ---
  async function submit() {
    if (isLoading) return; 

    // 1. VALIDASI (Ganti alert jadi Toast Error)
    if (!driverName.trim()) {
        setToast({ show: true, type: 'error', message: 'Nama sopir wajib diisi!' });
        return;
    }
    if (!items.length) {
        setToast({ show: true, type: 'error', message: 'Minimal harus ada 1 item barang.' });
        return;
    }

    for (const it of items) {
      if (!it.name.trim()) {
          setToast({ show: true, type: 'error', message: 'Nama barang tidak boleh kosong.' });
          return;
      }
      if (!it.qty || it.qty <= 0) {
          setToast({ show: true, type: 'error', message: `Jumlah barang (${it.name || 'Item'}) harus lebih dari 0.` });
          return;
      }
      if (!it.unit_price || it.unit_price <= 0) {
          setToast({ show: true, type: 'error', message: `Harga barang (${it.name || 'Item'}) belum diisi.` });
          return;
      }
    }

    if (!customerId) {
        if (!newCustomerName.trim()) {
            setToast({ show: true, type: 'error', message: 'Nama customer baru wajib diisi!' });
            return;
        }
    }

    // 2. MULAI PROSES
    setIsLoading(true);

    const body: any = {
      date,
      po_number: poNumber,
      logistics: {
        driver_name: driverName,
        plate_number: plateNumber,
        transport_method: transportMethod,
      },
      items: items.map((it) => ({
        name: it.name,
        color: it.color,
        unit: it.unit,
        qty: it.qty,
        unit_price: it.unit_price,
      })),
    };

    if (customerId) {
      body.customer_id = customerId;
    } else {
      body.customer_new = {
        name: newCustomerName,
        address: newCustomerAddress,
        npwp: newCustomerNpwp,
      };
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan transaksi");
      }
  
      // 3. SUKSES -> TAMPILKAN TOAST HIJAU
      setToast({ 
          show: true, 
          type: 'success', 
          message: 'Transaksi Berhasil Disimpan!', 
          invoiceNo: data.invoice_no 
      });
      
      // Reset Form
      setItems([{ name: "", color: "", unit: "KG", qty: 1, unit_price: 0 }]);
      setPoNumber("");
      setIsLoading(false);

    } catch (error: any) {
      // 4. GAGAL API -> TOAST MERAH
      setToast({ show: true, type: 'error', message: error.message || "Terjadi kesalahan server." });
      setIsLoading(false); 
    }
  }

  const openPdf = () => {
    if (!toast.invoiceNo) return;
    const pdfUrl = `/api/invoices/${encodeURIComponent(toast.invoiceNo)}/pdf`;
    window.open(pdfUrl, "_blank");
    window.location.href = "/invoices";
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
    if (toast.type === 'success') {
        window.location.href = "/invoices";
    }
  };

  // --- UI ---
  return (
    <div className="bg-slate-50 min-h-screen pb-24 md:pb-10 relative">
      
      {/* --- TOAST NOTIFICATION DINAMIS --- */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className={`bg-white rounded-2xl shadow-2xl border-l-8 p-5 md:w-96 flex flex-col gap-4 ${
             toast.type === 'success' ? 'border-green-500' : 'border-red-500'
          }`}>
             <div className="flex items-start justify-between">
                <div className="flex gap-3">
                   {toast.type === 'success' ? (
                       <CheckCircle className="text-green-500 mt-1" size={28} />
                   ) : (
                       <AlertTriangle className="text-red-500 mt-1" size={28} />
                   )}
                   
                   <div>
                      <h3 className={`font-bold text-lg ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                          {toast.type === 'success' ? 'Berhasil!' : 'Perhatian!'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{toast.message}</p>
                      
                      {/* Tampilkan No Invoice Cuma Kalau Sukses */}
                      {toast.type === 'success' && toast.invoiceNo && (
                          <p className="text-xs text-slate-400 mt-1">Invoice: <span className="font-mono font-bold text-slate-700">{toast.invoiceNo}</span></p>
                      )}
                   </div>
                </div>
                <button onClick={closeToast} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                </button>
             </div>

             <div className="flex gap-3 mt-2">
                {/* Tombol PDF Cuma Muncul Kalau Sukses */}
                {toast.type === 'success' && (
                    <button 
                      onClick={openPdf}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <Printer size={18} />
                      Buka PDF
                    </button>
                )}
                
                <button 
                  onClick={closeToast}
                  className={`px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all ${toast.type === 'error' ? 'w-full' : ''}`}
                >
                  Tutup
                </button>
             </div>
          </div>
        </div>
      )}


      {/* HEADER */}
      <div className="bg-blue-800 pt-6 pb-20 px-4 md:px-6 rounded-b-[2rem] md:rounded-b-[3rem] shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full opacity-10 blur-3xl -mr-10 -mt-10"></div>
         <div className="relative z-10 max-w-5xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
               <ArrowLeft size={20} />
               <span className="text-sm font-semibold">Kembali ke Dashboard</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <div className="bg-yellow-400 text-blue-900 rounded-xl p-1.5 shadow-lg"><Plus size={24} /></div>
              Transaksi Baru
            </h1>
            <p className="text-blue-100 text-xs md:text-sm mt-2 ml-12 opacity-80">
              Isi form ini untuk membuat Invoice & Surat Jalan otomatis.
            </p>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20 space-y-6">
        {/* --- FORM UTAMA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* 1. CUSTOMER INFO */}
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
               <User className="text-blue-600" size={20} /> Data Pelanggan
             </h2>
             <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Pilih Customer</label>
                   <div className="relative">
                      <select
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm disabled:opacity-50"
                        value={customerId}
                        disabled={isLoading}
                        onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
                      >
                        <option value="">-- Input Customer Baru --</option>
                        {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                   </div>
                </div>
                {!customerId && (
                  <div className="bg-blue-50/50 p-4 rounded-2xl space-y-3 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs text-blue-600 font-bold mb-1 flex items-center gap-1"><Plus size={12}/> Input Data Baru</p>
                    <div><label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 block">Nama Perusahaan / Perorangan</label><input className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={newCustomerName} disabled={isLoading} onChange={(e) => setNewCustomerName(e.target.value)}/></div>
                    <div><label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 block">Alamat Lengkap</label><textarea className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" rows={2} disabled={isLoading} value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)}/></div>
                    <div><label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 block">NPWP (Opsional)</label><input className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={newCustomerNpwp} disabled={isLoading} onChange={(e) => setNewCustomerNpwp(e.target.value)}/></div>
                  </div>
                )}
             </div>
          </div>

          {/* 2. LOGISTICS INFO */}
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-50"><Truck className="text-orange-500" size={20} /> Pengiriman</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                   <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Tanggal Transaksi</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={date} disabled={isLoading} onChange={(e) => setDate(e.target.value)}/></div>
                   <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Nomor PO (Opsional)</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={poNumber} disabled={isLoading} onChange={(e) => setPoNumber(e.target.value)}/></div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Nama Sopir</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={driverName} disabled={isLoading} onChange={(e) => setDriverName(e.target.value)}/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Plat Nomor</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={plateNumber} disabled={isLoading} onChange={(e) => setPlateNumber(e.target.value)}/></div>
                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Jenis Kendaraan</label><div className="flex gap-2">{['Motor', 'Car'].map((type) => (<div key={type} onClick={() => !isLoading && setTransportMethod(type as any)} className={`flex-1 p-3 rounded-xl border cursor-pointer text-center text-sm font-bold transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${transportMethod === type ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{type === "Car" ? "Mobil" : "Motor"}</div>))}</div></div>
             </div>
          </div>
        </div>

        {/* 3. ITEMS SECTION */}
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
             <div><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="text-purple-500" size={20} /> Item Barang</h2><p className="text-xs text-slate-400 mt-1">Pastikan harga sudah termasuk PPN.</p></div>
             <button type="button" onClick={addRow} disabled={isLoading} className="w-full md:w-auto bg-black hover:bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"><Plus size={16} /> Tambah Item</button>
           </div>
           <div className="space-y-4">
             {items.map((row, i) => (
               <div key={i} className="group relative bg-slate-50 p-4 rounded-2xl border border-slate-200 transition-all hover:border-blue-300">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start">
                     <div className="md:col-span-4"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nama Barang</label><input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50" placeholder="Contoh: Cat Jotun" value={row.name} disabled={isLoading} onChange={(e) => setRow(i, { name: e.target.value })}/></div>
                     <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Warna</label><input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" placeholder="Merah/Kode" value={row.color} disabled={isLoading} onChange={(e) => setRow(i, { color: e.target.value })}/></div>
                     <div className="md:col-span-3 grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Satuan</label><input className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center uppercase disabled:opacity-50" value={row.unit} disabled={isLoading} onChange={(e) => setRow(i, { unit: e.target.value })}/></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Jumlah</label><input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center font-bold text-blue-700 disabled:opacity-50" value={row.qty} disabled={isLoading} onChange={(e) => setRow(i, { qty: Number(e.target.value) })}/></div>
                     </div>
                     <div className="md:col-span-3 flex gap-2">
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Harga Satuan</label><input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" value={row.unit_price} disabled={isLoading} onChange={(e) => setRow(i, { unit_price: Number(e.target.value) })}/></div>
                        <div className="flex flex-col justify-end"><button type="button" onClick={() => removeRow(i)} disabled={isLoading} className="p-3 bg-white text-red-500 border border-red-100 rounded-xl hover:bg-red-50 active:scale-90 transition-all shadow-sm h-[46px] disabled:opacity-50 disabled:active:scale-100" title="Hapus Item"><Trash2 size={18} /></button></div>
                     </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/50 flex justify-between md:justify-end md:gap-2 text-xs font-medium text-slate-500"><span>Subtotal Item:</span><span className="font-bold text-slate-800">{formatRupiah(Number(row.qty) * Number(row.unit_price))}</span></div>
               </div>
             ))}
           </div>
        </div>

        {/* 4. TOTAL & SUBMIT */}
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col md:flex-row gap-6 md:items-center">
           <div className="hidden md:block flex-1 text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="font-bold text-slate-700 mb-1">ℹ️ Kalkulasi Otomatis</p><p>Sistem akan memecah harga input menjadi <span className="text-orange-600 font-bold">DPP + PPN 11%</span> secara otomatis.</p></div>
           <div className="w-full md:w-96 space-y-3">
             <div className="flex justify-between text-sm text-slate-500"><span>Total Barang</span><span className="font-medium">{items.length} Item</span></div>
             <div className="flex justify-between text-sm text-slate-500"><span>DPP (Dasar Pengenaan)</span><span className="font-medium">{formatRupiah(tax.dpp)}</span></div>
             <div className="flex justify-between text-sm text-orange-600"><span>PPN (11%)</span><span className="font-medium">{formatRupiah(tax.ppn)}</span></div>
             <div className="border-t border-slate-200 pt-3 flex justify-between items-center"><span className="text-lg font-bold text-slate-800">Grand Total</span><span className="text-2xl font-black text-blue-800">{formatRupiah(tax.total)}</span></div>
             <button type="button" onClick={submit} disabled={isLoading} className={`w-full mt-2 py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-yellow-400 hover:bg-yellow-500 text-blue-900 shadow-yellow-200'}`}>
               {isLoading ? <><Loader2 className="animate-spin" size={24} /> Sedang Memproses...</> : <><Save size={24} /> Simpan Transaksi</>}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}