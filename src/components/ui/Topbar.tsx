"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react"; // 👈 Import fungsi Logout
import { 
  LayoutDashboard, 
  ReceiptText, 
  FileText, 
  List, 
  ScanText, 
  Package, 
  Settings,
  LogOut // 👈 Import Icon Logout
} from "lucide-react";

export default function Topbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Daftar Menu biar rapi
  const menus = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard size={20} /> },
    { label: "Transaksi", href: "/transactions/new", icon: <ReceiptText size={20} /> },
    { label: "Expense", href: "/expenses", icon: <FileText size={20} /> },
    { label: "Invoices", href: "/invoices", icon: <List size={20} /> },
    { label: "OCR Scan", href: "/ocr", icon: <ScanText size={20} /> },
  ];

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* === 1. SIDEBAR (KHUSUS LAPTOP) === */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col fixed h-full z-50 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-yellow-400 tracking-tight">FDL WARNA MANDIRI</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          {/* Menu Utama */}
          <div className="space-y-2">
            {menus.map((menu) => (
              <Link 
                key={menu.href} 
                href={menu.href} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(menu.href) 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {menu.icon}
                <span className="text-sm">{menu.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex-1"></div> {/* Spacer biar menu bawah terdorong */}

          {/* Menu Tambahan & LOGOUT */}
          <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
             <div className="px-4 text-[10px] uppercase text-slate-500 font-bold">Lainnya</div>
             
             <Link href="#" className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white transition-colors">
                <Package size={18} /> <span className="text-sm">Stok Gudang</span>
             </Link>
             
             <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white transition-colors">
                <Settings size={18} /> <span className="text-sm">Pengaturan</span>
             </Link>

             {/* 👇 TOMBOL LOGOUT (DESKTOP) */}
             <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-left"
             >
                <LogOut size={18} /> <span className="text-sm font-bold">Keluar</span>
             </button>
          </div>
        </nav>
      </aside>

      {/* === 2. KONTEN UTAMA (Children) === */}
      <main className="flex-1 md:ml-64 min-w-0 transition-all pb-24 md:pb-0 relative">
        
        {/* 👇 HEADER KHUSUS HP (Biar ada tombol Logout di HP) */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
           <div>
             <h1 className="text-sm font-bold text-yellow-400">FDL WARNA MANDIRI</h1>
             <p className="text-[10px] text-slate-400">Mobile Dashboard</p>
           </div>
           <button 
             onClick={() => signOut({ callbackUrl: "/login" })}
             className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 active:scale-95 transition-all"
           >
             <LogOut size={16} />
           </button>
        </div>

        {/* Isi Halaman */}
        {children}
      </main>

      {/* === 3. MENU BAWAH (KHUSUS HP) === */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {menus.map((menu, index) => {
           // Menu Expense (Tengah) kita buat menonjol bulat
           if (index === 2) {
             return (
               <Link key={menu.href} href={menu.href} className="-mt-8 group">
                 <div className={`p-4 rounded-full border-4 border-slate-50 shadow-xl transition-all ${
                   isActive(menu.href) ? 'bg-yellow-400 text-blue-900' : 'bg-blue-600 text-white'
                 }`}>
                    {menu.icon}
                 </div>
               </Link>
             );
           }
           // Menu Lainnya biasa
           return (
             <Link 
               key={menu.href} 
               href={menu.href} 
               className={`flex flex-col items-center justify-center w-14 gap-1 rounded-lg transition-colors ${
                 isActive(menu.href) ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
                {menu.icon}
                <span className="text-[10px]">{menu.label}</span>
             </Link>
           );
        })}
      </div>

    </div>
  );
}