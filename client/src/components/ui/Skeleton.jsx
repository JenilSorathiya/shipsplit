/**
 * Skeleton loading components for ShipSplit UI.
 *
 * Usage:
 *   <Skeleton className="h-4 w-40" />               — single bar
 *   <Skeleton.Card />                                 — dashboard card
 *   <Skeleton.Table rows={5} cols={4} />              — table rows
 *   <Skeleton.OrderRow />                             — order list item
 *   <Skeleton.StatCard />                             — stat number card
 */

/* ── Base pulse bar ─────────────────────────────────────────────────── */
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
  );
}

/* ── Dashboard stat card ─────────────────────────────────────────────── */
Skeleton.StatCard = function StatCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
};

/* ── Generic content card ─────────────────────────────────────────────── */
Skeleton.Card = function Card() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
};

/* ── Table rows ──────────────────────────────────────────────────────── */
Skeleton.Table = function Table({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[120px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
};

/* ── Single order row ────────────────────────────────────────────────── */
Skeleton.OrderRow = function OrderRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 animate-pulse">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
};

/* ── Label job card ──────────────────────────────────────────────────── */
Skeleton.LabelCard = function LabelCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48 mb-2" />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
};

/* ── Dashboard overview skeleton ─────────────────────────────────────── */
Skeleton.Dashboard = function Dashboard() {
  return (
    <div className="space-y-6 p-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton.StatCard key={i} />
        ))}
      </div>
      {/* Two-col section */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <Skeleton className="h-5 w-32 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="card p-5 space-y-3">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
