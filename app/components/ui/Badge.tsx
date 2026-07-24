import { cn } from "@/app/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
}

const variants = {
  default: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger:  "bg-red-50 text-red-600 border-red-200",
  info:    "bg-blue-50 text-blue-700 border-blue-200",
  purple:  "bg-violet-50 text-violet-700 border-violet-200",
};

export default function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
