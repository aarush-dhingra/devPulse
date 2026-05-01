/**
 * SkeletonCard — shimmer loading placeholder for dashboard cards.
 * Uses a CSS animation defined in index.css (shimmer keyframe).
 */
export function SkeletonCard({ rows = 2, className = "" }) {
  return (
    <div className={`panel p-4 ${className}`}>
      <div className="skeleton h-3 w-28 rounded mb-3" />
      <div className="skeleton h-8 w-16 rounded mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-2 rounded mb-1.5" style={{ width: `${60 + i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 6 }) {
  return (
    <div className={`grid grid-cols-${cols} gap-3`}>
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonCard key={i} rows={1} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Focus bar */}
      <div className="skeleton h-20 rounded-xl" />
      {/* 6 top tiles */}
      <SkeletonRow cols={6} />
      {/* Row 2 — 3 cols */}
      <div className="grid lg:grid-cols-3 gap-3">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={5} />
        <SkeletonCard rows={5} />
      </div>
      {/* Row 3 */}
      <div className="grid lg:grid-cols-3 gap-3">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
      </div>
    </div>
  );
}
