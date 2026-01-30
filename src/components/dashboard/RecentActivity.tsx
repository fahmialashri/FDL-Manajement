import { formatRupiah, formatTanggalIndoFull } from "@/libs/format";

type Row = {
  id: number;
  invoiceNo: string;
  date: Date;
  createdAt: Date;
  grandTotal: any;
  status: string;
  customer: { name: string };
  suratJalan: { sjNo: string } | null;
};

export default function RecentActivity({ invoices }: { invoices: Row[] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Recent Activity</div>
        <div className="text-sm text-gray-600">Dokumen terbaru</div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-4">Invoice</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Tanggal</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const pdfUrl = `/api/invoices/${encodeURIComponent(inv.invoiceNo)}/pdf`;
              return (
                <tr key={inv.id} className="border-t">
                  <td className="py-3 pr-4">
                    <div className="font-semibold">{inv.invoiceNo}</div>
                    <div className="text-xs text-gray-500">
                      SJ: {inv.suratJalan?.sjNo ?? "-"}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{inv.customer.name}</td>
                  <td className="py-3 pr-4">{formatTanggalIndoFull(inv.date)}</td>
                  <td className="py-3 pr-4 font-semibold">
                    {formatRupiah(Number(inv.grandTotal ?? 0))}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        inv.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <a className="underline" href={pdfUrl} target="_blank" rel="noreferrer">
                      Buka PDF
                    </a>
                  </td>
                </tr>
              );
            })}

            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-600">
                  Belum ada transaksi.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
