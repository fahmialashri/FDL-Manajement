import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
}) {
  const isUp = (trend ?? 0) >= 0;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle ? (
            <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
          ) : null}
        </div>

        {typeof trend === "number" ? (
          <div
            className={[
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
              isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            ].join(" ")}
          >
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.toFixed(1)}%
          </div>
        ) : null}
      </div>
    </div>
  );
}
