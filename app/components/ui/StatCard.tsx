import { cn } from "@/app/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title:      string;
  value:      string | number;
  subtitle?:  string;
  icon:       LucideIcon;
  iconColor?: string;
  iconBg?:    string;
  trend?:     { value: number; label: string };
  className?: string;
}

export default function StatCard({
  title, value, subtitle, icon: Icon,
  iconColor = "text-indigo-600",
  iconBg    = "bg-indigo-50",
  trend,
  className,
}: StatCardProps) {
  const positive = !trend || trend.value >= 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 flex items-start gap-4 overflow-hidden",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
      style={{
        background:  "var(--card)",
        border:      "1px solid var(--card-border)",
        boxShadow:   "0 1px 4px rgba(0,0,0,.04)",
      }}
    >
      {/* Icon */}
      <div className={cn("p-3 rounded-xl shrink-0 shadow-sm", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
          {title}
        </p>
        <p className="text-2xl font-bold truncate leading-tight" style={{ color: "var(--foreground)" }}>
          {value}
        </p>

        <div className="flex items-center gap-2 mt-1">
          {subtitle && (
            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{subtitle}</p>
          )}
          {trend && (
            <span className={cn("flex items-center gap-0.5 text-xs font-semibold shrink-0",
              positive ? "text-emerald-500" : "text-red-500")}>
              {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend.value)}% {trend.label}
            </span>
          )}
        </div>
      </div>

      {/* Faint bg icon */}
      <div className="absolute -bottom-2 -left-2 opacity-[0.04] pointer-events-none">
        <Icon className="w-20 h-20" />
      </div>
    </div>
  );
}
