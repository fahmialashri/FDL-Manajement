import { CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

export default function InvoiceStatusCard({
  unpaid,
  paid,
  overdue,
}: {
  unpaid: number;
  paid: number;
  overdue: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="font-semibold text-lg">Status Invoice</div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock3 size={16} />
            Unpaid
          </div>
          <div className="font-bold">{unpaid}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <CheckCircle2 size={16} />
            Paid
          </div>
          <div className="font-bold">{paid}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <AlertTriangle size={16} />
            Overdue
          </div>
          <div className="font-bold">{overdue}</div>
        </div>
      </div>
    </div>
  );
}
