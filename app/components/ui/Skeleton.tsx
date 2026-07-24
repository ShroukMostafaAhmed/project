import { cn } from "@/app/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={cn("skeleton rounded-lg", className)}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-2.5 w-32" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={cn("h-3.5 rounded-md", i === 0 ? "w-28" : i % 3 === 0 ? "w-16" : "w-24")} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-3 w-48" />
      <Skeleton style={{ height }} className="w-full rounded-xl mt-2" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

export function ListSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-6 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={cn("h-3.5 rounded-md", j === 0 ? "w-28" : j % 2 === 0 ? "w-16" : "w-24")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
