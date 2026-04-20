import { useState, useEffect, useCallback } from 'react';
import {
  ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon,
  ExclamationCircleIcon, CurrencyRupeeIcon, CalendarDaysIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../utils/api';

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 15;

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending',    label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid',       label: 'Paid' },
];

const PLATFORM_OPTIONS = [
  { value: '',         label: 'All Platforms' },
  { value: 'amazon',   label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'meesho',   label: 'Meesho' },
  { value: 'myntra',   label: 'Myntra' },
];

const STATUS_STYLE = {
  pending:    'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200/60',
  processing: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/60',
  paid:       'bg-green-100 text-green-700 ring-1 ring-green-200/60',
  failed:     'bg-red-100 text-red-700 ring-1 ring-red-200/60',
};

const STATUS_LABEL = {
  pending:    'Pending',
  processing: 'Processing',
  paid:       'Paid',
  failed:     'Failed',
};

const TYPE_STYLE = {
  COD:        'bg-orange-100 text-orange-700 ring-1 ring-orange-200/60',
  prepaid:    'bg-blue-100 text-blue-700 ring-1 ring-blue-200/60',
  settlement: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/60',
};

/* ── Currency formatter ──────────────────────────────────── */
function inr(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/* ── Hero stat card ──────────────────────────────────────── */
function HeroCard({ label, sublabel, amount, loading, colorClasses, icon: Icon }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-2 ${colorClasses}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold opacity-80 uppercase tracking-wide">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {loading ? (
        <div className="h-9 w-32 bg-white/30 rounded-lg animate-pulse" />
      ) : (
        <p className="text-3xl font-bold tabular-nums">{inr(amount)}</p>
      )}
      <p className="text-xs opacity-70">{sublabel}</p>
    </div>
  );
}

/* ── Timeline row ────────────────────────────────────────── */
function TimelineRow({ day }) {
  const isToday = day.isToday;
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isToday ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isToday ? 'text-green-700' : 'text-gray-800'}`}>
            {day.label}
          </span>
          {isToday && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
              Today
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{day.orderCount} order{day.orderCount !== 1 ? 's' : ''}</p>
      </div>
      <div className="text-right">
        <p className={`text-base font-bold tabular-nums ${isToday ? 'text-green-700' : 'text-gray-900'}`}>
          {inr(day.total)}
        </p>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[day.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {STATUS_LABEL[day.status] ?? day.status ?? 'Scheduled'}
      </span>
    </div>
  );
}

/* ── Loading skeleton row ────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[120, 100, 60, 90, 100, 70, 70].map((w, i) => (
        <td key={i} className="table-td">
          <div className="h-3.5 bg-gray-100 rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
function EmptyState({ hasFilters, onClear }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-100 mb-4">
          <CurrencyRupeeIcon className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No payments found</p>
        <p className="text-xs text-gray-400 mt-1">
          {hasFilters ? 'Try adjusting your filters.' : 'Payments will appear here once synced from your platforms.'}
        </p>
        {hasFilters && (
          <button onClick={onClear} className="mt-3 text-xs font-medium text-primary-600 hover:text-primary-700">
            Clear all filters
          </button>
        )}
      </td>
    </tr>
  );
}

/* ── Timeline skeleton ───────────────────────────────────── */
function TimelineSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ── Build timeline from payments data ───────────────────── */
function buildTimeline(payments) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  return days.map((d, i) => {
    const iso = d.toISOString().slice(0, 10);
    const dayPayments = payments.filter((p) => {
      const scheduled = p.scheduledDate ?? p.scheduled_date ?? p.date ?? '';
      return scheduled.startsWith(iso);
    });

    const total = dayPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const orderCount = dayPayments.reduce((sum, p) => sum + Number(p.orders ?? p.orderCount ?? 1), 0);
    const isToday = d.getTime() === today.getTime();

    let label;
    if (isToday) {
      label = 'Today';
    } else if (i === 1) {
      label = 'Tomorrow';
    } else {
      label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    /* pick the most common status among that day's payments */
    const statusCounts = {};
    dayPayments.forEach((p) => { const s = p.status ?? 'pending'; statusCounts[s] = (statusCounts[s] ?? 0) + 1; });
    const status = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'pending';

    return { label, date: iso, total, orderCount, status, isToday, i };
  });
}

/* ── Main page ───────────────────────────────────────────── */
export default function PaymentsPage() {
  /* Filter state */
  const [statusTab, setStatusTab] = useState('');
  const [platform,  setPlatform]  = useState('');
  const [page,      setPage]      = useState(1);

  /* Data state */
  const [payments,     setPayments]     = useState([]);
  const [stats,        setStats]        = useState(null);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [error,        setError]        = useState(null);

  /* Fetch stats */
  useEffect(() => {
    setStatsLoading(true);
    api.get('/remittances/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats({ today: 0, tomorrow: 0, week: 0 }))
      .finally(() => setStatsLoading(false));
  }, []);

  /* Fetch payments */
  const fetchPayments = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { page, limit: PAGE_SIZE };
    if (statusTab) params.status   = statusTab;
    if (platform)  params.platform = platform;

    api.get('/remittances', { params })
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setPayments(data);
          setTotal(data.length);
        } else {
          setPayments(data.remittances ?? data.payments ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load payments.');
        setPayments([]);
      })
      .finally(() => setLoading(false));
  }, [page, statusTab, platform]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  /* Sync */
  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/remittances/sync');
      toast.success('Payments synced successfully!');
      fetchPayments();
    } catch {
      toast.error('Failed to sync payments. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const clearFilters = () => { setStatusTab(''); setPlatform(''); setPage(1); };
  const hasFilters   = statusTab || platform;
  const totalPages   = Math.ceil(total / PAGE_SIZE);

  /* Timeline (derived from all loaded payments; server should return 7-day window) */
  const timeline = buildTimeline(payments);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Tracker</h1>
          <p className="page-sub">Track upcoming COD remittances — know exactly what's coming and when.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-secondary btn-sm gap-1.5"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Payments'}
        </button>
      </div>

      {/* ── Hero stats ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HeroCard
          label="Today"
          sublabel="Expected today"
          amount={stats?.today}
          loading={statsLoading}
          icon={CheckCircleIcon}
          colorClasses="bg-gradient-to-br from-green-500 to-emerald-600 text-white"
        />
        <HeroCard
          label="Tomorrow"
          sublabel="Expected tomorrow"
          amount={stats?.tomorrow}
          loading={statsLoading}
          icon={ClockIcon}
          colorClasses="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
        />
        <HeroCard
          label="This Week"
          sublabel="Next 7 days total"
          amount={stats?.week}
          loading={statsLoading}
          icon={CalendarDaysIcon}
          colorClasses="bg-gradient-to-br from-purple-500 to-violet-600 text-white"
        />
      </div>

      {/* ── Timeline ────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Upcoming Payments</h3>
            <p className="text-xs text-gray-400 mt-0.5">Day-by-day breakdown for the next 7 days</p>
          </div>
          <CurrencyRupeeIcon className="h-5 w-5 text-gray-300" />
        </div>

        {loading ? (
          <TimelineSkeleton />
        ) : timeline.every((d) => d.total === 0) ? (
          <div className="text-center py-8">
            <CalendarDaysIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No upcoming payments in the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {timeline.map((day) => (
              <TimelineRow key={day.date} day={day} />
            ))}
          </div>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusTab(tab.value); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === tab.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Platform */}
          <select
            className="form-select py-2 text-sm w-auto min-w-36"
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          >
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost btn-sm text-gray-400 hover:text-gray-600 gap-1">
              <XCircleIcon className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          <div className="ml-auto text-xs text-gray-400">
            {loading ? '…' : `${total} record${total !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={fetchPayments} className="text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────── */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table-root">
            <thead className="table-head">
              <tr>
                <th className="table-th">Settlement ID</th>
                <th className="table-th">Period</th>
                <th className="table-th">Orders</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Scheduled Date</th>
                <th className="table-th">Status</th>
                <th className="table-th">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : payments.length === 0 ? (
                <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
              ) : (
                payments.map((pay) => {
                  const settlementId = pay.settlementId ?? pay.settlement_id ?? pay._id ?? pay.id;
                  const period       = pay.period ?? '—';
                  const orders       = pay.orders ?? pay.orderCount ?? pay.order_count ?? '—';
                  const amount       = pay.amount ?? pay.total ?? 0;
                  const scheduled    = pay.scheduledDate ?? pay.scheduled_date ?? pay.date ?? null;
                  const status       = pay.status ?? 'pending';
                  const type         = pay.type ?? pay.paymentType ?? 'COD';

                  const formattedDate = scheduled
                    ? new Date(scheduled).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';

                  return (
                    <tr key={settlementId} className="table-row">
                      <td className="table-td">
                        <span className="font-mono text-xs font-semibold text-gray-800">{settlementId}</span>
                      </td>
                      <td className="table-td text-xs text-gray-600">{period}</td>
                      <td className="table-td text-xs font-medium text-gray-700 text-center">{orders}</td>
                      <td className="table-td">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{inr(amount)}</span>
                      </td>
                      <td className="table-td text-xs text-gray-500">{formattedDate}</td>
                      <td className="table-td">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[status] ?? status}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLE[type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {type}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────── */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-700">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>{' '}
              of <span className="font-semibold text-gray-700">{total}</span> records
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                      page === p
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && <span className="text-xs text-gray-400 px-1">…</span>}
              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
