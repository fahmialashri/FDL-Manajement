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
  AlertTriangle,
  Printer,
  X,
  Barcode,
  Hash,
  MessageSquare // Icon untuk keterangan
} from "lucide-react";

type Customer = {
  id: number;
  name: string;
  address: string | null;
  npwp: string | null;
};

type ItemRow = {
  code: string;
  name: string;
  color: string;
  unit: string;
  qty: number;
  unit_price: number;
  description: string; // Tambahkan ini
};

export default function NewTransactionForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: any[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [toast, setToast] = useState<{ 
    show: boolean; 
    type: 'success' | 'error'; 
    message: string; 
    invoiceNo?: string;
  }>({ show: false, type: 'success', message: '', invoiceNo: '' });

  // --- STATE FORM ---
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [poNumber, setPoNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(""); 
  const [sjNumber, setSjNumber] = useState("");           

  const [customerId, setCustomerId] = useState<number | "">("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerNpwp, setNewCustomerNpwp] = useState("");

  const [driverName, setDriverName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [transportMethod, setTransportMethod] = useState<"Motor" | "Car">("Motor");

  const [items, setItems] = useState<ItemRow[]>([
    { code: "", name: "", color: "", unit: "KG", qty: 1, unit_price: 0, description: "" },
  ]);

  useEffect(() => {
    if (toast.show) {
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
    setItems((prev) => [...prev, { code: "", name: "", color: "", unit: "KG", qty: 1, unit_price: 0, description: "" }]);
  }

  function removeRow(i: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setRow(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    if (isLoading) return; 
    if (!driverName.trim()) {
        setToast({ show: true, type: 'error', message: 'Nama sopir wajib diisi!' });
        return;
    }

    setIsLoading(true);
    const body: any = {
      date,
      invoice_no: invoiceNumber.trim() || undefined, 
      sj_no: sjNumber.trim() || undefined,           
      po_number: poNumber,
      logistics: {
        driver_name: driverName,
        plate_number: plateNumber,
        transport_method: transportMethod,
      },
      items: items.map((it) => ({
        code: it.code.toUpperCase(),
        name: it.name,
        color: it.color,
        unit: it.unit.toUpperCase(),
        qty: it.qty,
        unit_price: it.unit_price,
        description: it.description, // Kirim ke API
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
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan transaksi");
      
      setToast({ show: true, type: 'success', message: 'Transaksi Berhasil Disimpan!', invoiceNo: data.invoice_no });
      setItems([{ code: "", name: "", color: "", unit: "KG", qty: 1, unit_price: 0, description: "" }]);
      setPoNumber("");
      setInvoiceNumber("");
      setSjNumber("");
      setIsLoading(false);
    } catch (error: any) {
      setToast({ show: true, type: 'error', message: error.message || "Terjadi kesalahan server." });
      setIsLoading(false); 
    }
  }

  const openPdf = () => {
    if (!toast.invoiceNo) return;
    window.open(`/api/invoices/${encodeURIComponent(toast.invoiceNo)}/pdf`, "_blank");
    window.location.href = "/invoices";
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24 md:pb-10 relative text-slate-900">
      {/* TOAST NOTIF */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[100] animate-in slide-in-from-right fade-in duration-300">
          <div className={`bg-white rounded-2xl shadow-2xl border-l-8 p-5 md:w-96 flex flex-col gap-4 ${toast.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
             <div className="flex items-start justify-between">
                <div className="flex gap-3">
                   {toast.type === 'success' ? <CheckCircle className="text-green-500 mt-1" size={28} /> : <AlertTriangle className="text-red-500 mt-1" size={28} />}
                   <div>
                      <h3 className={`font-bold text-lg ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toast.type === 'success' ? 'Berhasil!' : 'Perhatian!'}</h3>
                      <p className="text-sm text-slate-500 mt-1">{toast.message}</p>
                      {toast.type === 'success' && toast.invoiceNo && <p className="text-xs text-slate-400 mt-1">Invoice: <span className="font-mono font-bold text-slate-700">{toast.invoiceNo}</span></p>}
                   </div>
                </div>
                <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
             </div>
             <div className="flex gap-3">
                {toast.type === 'success' && (
                    <button onClick={openPdf} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"><Printer size={18} /> Buka PDF</button>
                )}
                <button onClick={() => {setToast(p => ({ ...p, show: false })); if(toast.type==='success') window.location.href="/invoices"}} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">Tutup</button>
             </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-blue-800 pt-6 pb-20 px-4 md:px-6 rounded-b-[2rem] md:rounded-b-[3rem] shadow-lg relative overflow-hidden">
         <div className="relative z-10 max-w-5xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
               <ArrowLeft size={20} /> <span className="text-sm font-semibold">Dashboard</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <div className="bg-yellow-400 text-blue-900 rounded-xl p-1.5 shadow-lg"><Plus size={24} /></div> Transaksi Baru
            </h1>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* DATA PELANGGAN */}
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-50"><User className="text-blue-600" size={20} /> Data Pelanggan</h2>
             <div className="space-y-4">
                <div className="relative">
                   <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm transition-all" value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}>
                     <option value="">-- Input Customer Baru --</option>
                     {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                   </select>
                   <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
                {!customerId && (
                  <div className="bg-blue-50/50 p-4 rounded-2xl space-y-3 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <input placeholder="Nama Perusahaan" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}/>
                    <textarea placeholder="Alamat Lengkap" className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" rows={2} value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)}/>
                  </div>
                )}
             </div>
          </div>

          {/* DATA LOGISTICS */}
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-50"><Truck className="text-orange-500" size={20} /> Pengiriman & No. Dokumen</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                   <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={date} onChange={(e) => setDate(e.target.value)}/>
                   <input placeholder="No. PO (Opsional)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={poNumber} onChange={(e) => setPoNumber(e.target.value)}/>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <div>
                     <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block tracking-wider">No. Invoice Manual</label>
                     <input placeholder="Otomatis" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}/>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block tracking-wider">No. SJ Manual</label>
                     <input placeholder="Otomatis" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={sjNumber} onChange={(e) => setSjNumber(e.target.value)}/>
                   </div>
                </div>

                <input placeholder="Nama Sopir" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={driverName} onChange={(e) => setDriverName(e.target.value)}/>
                <input placeholder="Plat Nomor" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)}/>

                <div className="md:col-span-2">
                   <div className="flex gap-2">
                      {['Motor', 'Car'].map((type) => (
                        <button key={type} onClick={() => setTransportMethod(type as any)} className={`flex-1 p-3 rounded-xl border font-bold text-sm transition-all ${transportMethod === type ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                          {type === "Car" ? "Mobil" : "Motor"}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* DATA ITEM BARANG */}
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="text-purple-500" size={20} /> Item Barang</h2>
             <button onClick={addRow} className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md"><Plus size={18} /> Tambah Item</button>
           </div>
           
           <div className="space-y-4">
             {items.map((row, i) => (
               <div key={i} className="group bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 transition-all hover:border-blue-300 hover:shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      
                      {/* KODE BARANG */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Barcode size={12}/> Kode</label>
                        <input 
                          placeholder="KD-01" 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" 
                          value={row.code} 
                          onChange={(e) => setRow(i, { code: e.target.value })}
                        />
                      </div>

                      {/* NAMA BARANG */}
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nama Barang</label>
                        <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={row.name} onChange={(e) => setRow(i, { name: e.target.value })}/>
                      </div>

                      {/* WARNA */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Warna</label>
                        <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={row.color} onChange={(e) => setRow(i, { color: e.target.value })}/>
                      </div>

                      {/* SATUAN & QTY */}
                      <div className="md:col-span-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Unit</label>
                          <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" value={row.unit} onChange={(e) => setRow(i, { unit: e.target.value })}/>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qty</label>
                          <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={row.qty} onChange={(e) => setRow(i, { qty: Number(e.target.value) })}/>
                        </div>
                      </div>

                      {/* HARGA & DELETE */}
                      <div className="md:col-span-3 flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Harga Satuan</label>
                          <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={row.unit_price} onChange={(e) => setRow(i, { unit_price: Number(e.target.value) })}/>
                        </div>
                        <div className="flex flex-col justify-end">
                          <button onClick={() => removeRow(i)} className="p-3 text-red-500 bg-white border border-red-100 rounded-xl hover:bg-red-50 active:scale-90 transition-all shadow-sm">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      {/* KOLOM KETERANGAN BARANG (FULL ROW ON MOBILE, 12 COL ON DESKTOP) */}
                      <div className="md:col-span-12">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><MessageSquare size={12}/> Keterangan Barang (Opsional)</label>
                        <input 
                          placeholder="Contoh: Packing Kayu, Batch No, atau Catatan Khusus Barang" 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                          value={row.description} 
                          onChange={(e) => setRow(i, { description: e.target.value })}
                        />
                      </div>
                  </div>
                  
                  {/* SUB TOTAL PER ITEM */}
                  <div className="mt-3 pt-2 border-t border-slate-200/50 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Subtotal Item:</span>
                    <span className="font-bold text-slate-900 bg-slate-200/50 px-2 py-1 rounded-lg">
                      {formatRupiah(Number(row.qty) * Number(row.unit_price))}
                    </span>
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* SUMMARY & SUBMIT */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row gap-6 md:items-center mb-10">
           <div className="hidden md:block flex-1 text-sm text-slate-500 bg-slate-50 p-5 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
               <span className="text-xl">ℹ️</span> Kalkulasi Otomatis
             </div>
             <p className="leading-relaxed">
               Sistem akan secara otomatis menghitung nilai <span className="text-blue-600 font-bold">DPP</span> dan <span className="text-orange-600 font-bold">PPN 11%</span> dari Grand Total yang Anda masukkan. 
               Pastikan harga satuan yang Anda input adalah harga <b>Termasuk Pajak</b>.
             </p>
           </div>
           
           <div className="w-full md:w-96 space-y-4">
             <div className="flex justify-between text-sm text-slate-500 font-medium">
               <span>Jumlah Item</span>
               <span className="text-slate-800 font-bold">{items.length} Barang</span>
             </div>
             <div className="flex justify-between text-sm text-slate-500 font-medium">
               <span>DPP (Dasar Pengenaan)</span>
               <span className="text-slate-800">{formatRupiah(tax.dpp)}</span>
             </div>
             <div className="flex justify-between text-sm text-orange-600 font-bold">
               <span>PPN (11%)</span>
               <span>{formatRupiah(tax.ppn)}</span>
             </div>
             <div className="border-t-2 border-dashed border-slate-100 pt-4 flex justify-between items-center">
               <span className="text-lg font-bold text-slate-800">Grand Total</span>
               <span className="text-2xl font-black text-blue-800 tracking-tight">{formatRupiah(tax.total)}</span>
             </div>
             
             <button 
               type="button" 
               onClick={submit} 
               disabled={isLoading} 
               className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${
                 isLoading 
                 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                 : 'bg-yellow-400 hover:bg-yellow-500 text-blue-900 shadow-yellow-100'
               }`}
             >
               {isLoading ? (
                 <><Loader2 className="animate-spin" size={24} /> Memproses...</>
               ) : (
                 <><Save size={24} /> Simpan Transaksi</>
               )}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}