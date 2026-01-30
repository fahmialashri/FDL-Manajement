import "./globals.css";
import Topbar from "@/components/ui/Topbar"; // Ini file navigasi baru yang kita buat tadi

export const metadata = {
  title: "Company Dashboard",
  description: "Logistics + Invoice + Accounting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900">
        
        {/* 👇 PERUBAHAN PENTING:
            {children} dimasukkan ke DALAM <Topbar> 
            supaya Sidebar dan Menu Bawah membungkus kontennya dengan rapi. 
        */}
        <Topbar>
          {children}
        </Topbar>

      </body>
    </html>
  );
}