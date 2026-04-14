import { useState, useEffect, useCallback } from 'react';
import {
  ArrowPathIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  EllipsisHorizontalIcon, FunnelIcon, ExclamationCircleIcon,
  InformationCircleIcon, CheckCircleIcon, XMarkIcon, CalendarDaysIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../utils/api';

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 15;

const RETURN_TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'RTO', label: 'RTO' },
  { value: 'CTO', label: 'CTO' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'initiated',  label: 'Initiated' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received',   label: 'Received' },
  { value: 'refunded',   label: 'Refunded' },
  { value: 'closed',     label: 'Closed' },
];

const RETURN_TYPE_STYLE = {
  RTO: 'bg-red-100 text-red-700 ring-1 ring-red-200/60',
  CTO: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200/60',
};

const STATUS_STYLE = {
  initiated:  'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200/60',
  in_transit: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/60',
  received:   'bg-green-100 text-green-700 ring-1 ring-green-200/60',
  refunded:   'bg-purple-100 text-purple-700 ring-1 ring-purple-200/60',
  closed:     'bg-gray-100 text-gray-600 ring-1 ring-gray-200/60',
};

const STATUS_LABEL = {
  initiated:  'Initiated',
  in_transit: 'In Transit',
  received:   'Received',
  refunded:   'Refunded',
  closed:     'Closed',
};

/* ── Tooltip ─────────────────────────────────────────────── */
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ title, value, iconBg, iconColor, icon: Icon, tooltip }) {
  return (
    <div className="stat-card">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
          {tooltip && (
            <Tooltip text={tooltip}>
              <InformationCircleIcon className="h-3.5 w-3.5 text-gray-400 cursor-help" />
            </Tooltip>
          )}
        </div>
        {value === null ? (
          <div className="mt-1.5 h-7 w-20 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        )}
      </div>
      <div className={`h-11 w-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  );
}

/* ── Row action dropdown ─────────────────────────────────── */
function RowActions({ returnId, onAction }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <EllipsisHorizontalIcon className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-20">
            <button
              onClick={() => { onAction(returnId, 'received'); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
              Mark Received
            </button>
            <button
              onClick={() => { onAction(returnId, 'refunded'); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowUturnLeftIcon className="h-3.5 w-3.5 text-purple-500" />
              Mark Refunded
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Loading skeleton row ────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[40, 110, 160, 80, 120, 90, 100, 80].map((w, i) => (
        <td key={i} className="table-td">
          <div className="h-3.5 bg-gray-100 rounded" style={{ width: w }} />
        </td>
      ))}
      <td className="table-td"><div className="h-6 w-6 bg-gray-100 rounded-lg" /></td>
    </tr>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
function EmptyState({ hasFilters, onClear }) {
  return (
    <tr>
      <td colSpan={9} className="px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-100 mb-4">
          <ArrowUturnLeftIcon className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No returns found</p>
        <p className="text-xs text-gray-400 mt-1">
          {hasFilters ? 'Try adjusting your filters or search query.' : 'Returns will appear here once synced from your platforms.'}
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

/* ── Main page ───────────────────────────────────────────── */
export default function ReturnsPage() {
  /* Filter state */
  const [typeTab,   setTypeTab]   = useState('');
  const [status,    setStatus]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);

  /* Data state */
  const [returns,   setReturns]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [statsLoad, setStatsLoad] = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [error,     setError]     = useState(null);

  /* Fetch stats once */
  useEffect(() => {
    setStatsLoad(true);
    api.get('/returns/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats({ total: 0, rto: 0, cto: 0, refund_pending: 0 }))
      .finally(() => setStatsLoad(false));
  }, []);

  /* Fetch returns when filters/page change */
  const fetchReturns = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { page, limit: PAGE_SIZE };
    if (typeTab)  params.type     = typeTab;
    if (status)   params.status   = status;
    if (dateFrom) params.from     = dateFrom;
    if (dateTo)   params.to       = dateTo;
    if (search)   params.search   = search;

    api.get('/returns', { params })
      .then(({ data }) => {
        /* backend returns { returns: [], total: N } or array */
        if (Array.isArray(data)) {
          setReturns(data);
          setTotal(data.length);
        } else {
          setReturns(data.returns ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load returns.');
        setReturns([]);
      })
      .finally(() => setLoading(false));
  }, [page, typeTab, status, dateFrom, dateTo, search]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  /* Sync */
  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/returns/sync');
      toast.success('Returns synced successfully!');
      fetchReturns();
    } catch {
      toast.error('Failed to sync returns. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  /* Row action */
  const handleAction = async (id, newStatus) => {
    const label = newStatus === 'received' ? 'Received' : 'Refunded';
    const tid = toast.loading(`Marking as ${label}…`);
    try {
      await api.patch(`/returns/${id}`, { status: newStatus });
      toast.success(`Marked as ${label}`, { id: tid });
      fetchReturns();
    } catch {
      toast.error(`Failed to update return.`, { id: tid });
    }
  };

  const clearFilters = () => {
    setTypeTab(''); setStatus(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1);
  };
  const hasFilters = typeTab || status || dateFrom || dateTo || search;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns Management</h1>
          <p className="page-sub">Track RTO and CTO returns from all your sales platforms.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-secondary btn-sm gap-1.5"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Returns'}
        </button>
      </div>

      {/* ── Stats row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Returns"
          value={statsLoad ? null : (stats?.total ?? 0).toLocaleString('en-IN')}
          icon={ArrowUturnLeftIcon}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
        />
        <StatCard
          title="RTO"
          value={statsLoad ? null : (stats?.rto ?? 0).toLocaleString('en-IN')}
          icon={ExclamationCircleIcon}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          tooltip="Courier returned package to you"
        />
        <StatCard
          title="CTO"
          value={statsLoad ? null : (stats?.cto ?? 0).toLocaleString('en-IN')}
          icon={ArrowUturnLeftIcon}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          tooltip="Customer initiated return"
        />
        <StatCard
          title="Refund Pending"
          value={statsLoad ? null : (stats?.refund_pending ?? 0).toLocaleString('en-IN')}
          icon={InformationCircleIcon}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
        />
      </div>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        {/* Type tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {RETURN_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setTypeTab(tab.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeTab === tab.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="form-input pl-9 py-2"
              placeholder="Search order ID or product…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Status */}
          <select
            className="form-select py-2 text-sm w-auto min-w-36"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date from */}
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              className="form-input pl-9 py-2 text-sm w-auto"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              className="form-input pl-9 py-2 text-sm w-auto"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To"
            />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost btn-sm text-gray-400 hover:text-gray-600 gap-1">
              <XMarkIcon className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          <div className="ml-auto text-xs text-gray-400">
            {loading ? '…' : `${total} return${total !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={fetchReturns} className="text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2">
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
                <th className="table-th">Order ID</th>
                <th className="table-th">Product</th>
                <th className="table-th">Return Type</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                <th className="table-th">Return AWB</th>
                <th className="table-th">Date</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : returns.length === 0 ? (
                <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
              ) : (
                returns.map((ret) => (
                  <tr key={ret._id ?? ret.id} className="table-row">
                    <td className="table-td">
                      <span className="font-mono text-xs font-semibold text-gray-800">
                        {ret.orderId ?? ret.order_id ?? ret.id}
                      </span>
                    </td>
                    <td className="table-td max-w-[180px]">
                      <p className="text-xs font-medium text-gray-900 truncate">{ret.product ?? ret.productName ?? '—'}</p>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${RETURN_TYPE_STYLE[ret.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ret.type ?? '—'}
                      </span>
                    </td>
                    <td className="table-td max-w-[160px]">
                      <p className="text-xs text-gray-600 truncate">{ret.reason ?? '—'}</p>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[ret.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[ret.status] ?? ret.status ?? '—'}
                      </span>
                    </td>
                    <td className="table-td font-mono text-xs text-gray-500">
                      {ret.returnAwb ?? ret.return_awb ?? '—'}
                    </td>
                    <td className="table-td text-xs text-gray-400">
                      {ret.date
                        ? new Date(ret.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ret.createdAt
                        ? new Date(ret.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="table-td">
                      <RowActions returnId={ret._id ?? ret.id} onAction={handleAction} />
                    </td>
                  </tr>
                ))
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
              of <span className="font-semibold text-gray-700">{total}</span> returns
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
