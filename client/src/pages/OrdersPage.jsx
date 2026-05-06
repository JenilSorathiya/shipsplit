import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FunnelIcon, MagnifyingGlassIcon, TagIcon,
  ArrowDownTrayIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon,
  EllipsisHorizontalIcon, TrashIcon, EyeIcon,
  CalendarDaysIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'amazon',   label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'meesho',   label: 'Meesho' },
  { value: 'myntra',   label: 'Myntra' },
];
const STATUS_OPTIONS = [
  { value: '',                label: 'All Statuses' },
  { value: 'pending',         label: 'Pending' },
  { value: 'processing',      label: 'Processing' },
  { value: 'label_generated', label: 'Label Generated' },
  { value: 'shipped',         label: 'Shipped' },
  { value: 'delivered',       label: 'Delivered' },
  { value: 'returned',        label: 'Returned' },
  { value: 'cancelled',       label: 'Cancelled' },
];
const COURIER_OPTIONS = [
  { value: '',           label: 'All Couriers' },
  { value: 'delhivery',  label: 'Delhivery' },
  { value: 'shiprocket', label: 'Shiprocket' },
  { value: 'bluedart',   label: 'BlueDart' },
  { value: 'dtdc',       label: 'DTDC' },
  { value: 'ekart',      label: 'Ekart' },
  { value: 'xpressbees', label: 'XpressBees' },
];

const PLATFORM_STYLE = {
  amazon:   { dot: 'bg-[#FF9900]', badge: 'bg-[#FF9900]/10 text-[#b36b00]' },
  flipkart: { dot: 'bg-[#2874F0]', badge: 'bg-[#2874F0]/10 text-[#1857c7]' },
  meesho:   { dot: 'bg-[#F43397]', badge: 'bg-[#F43397]/10 text-[#c41374]' },
  myntra:   { dot: 'bg-[#FF3F6C]', badge: 'bg-[#FF3F6C]/10 text-[#d0163e]' },
};

const STATUS_STYLE = {
  pending:         'badge-orange',
  processing:      'badge-blue',
  label_generated: 'badge-blue',
  shipped:         'badge-green',
  delivered:       'badge bg-success-100 text-success-800 ring-1 ring-success-200/50',
  returned:        'badge-red',
  cancelled:       'badge-red',
};

const PAGE_SIZE = 15;

/* ── Helpers ────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(value, currency = 'INR') {
  if (!value && value !== 0) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

/* ── Row action menu ────────────────────────────────────── */
function RowMenu({ onView, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <EllipsisHorizontalIcon className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-20">
            <button onClick={() => { onView(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <EyeIcon className="h-3.5 w-3.5 text-gray-400" /> View
            </button>
            <button onClick={() => { onDelete(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();

  /* ── Data state ─────────────────────────────────────────── */
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);

  /* ── Filter state ───────────────────────────────────────── */
  const [search,   setSearch]   = useState('');
  const [platform, setPlatform] = useState('');
  const [status,   setStatus]   = useState('');
  const [courier,  setCourier]  = useState('');
  const [selected, setSelected] = useState(new Set());
  const [page,     setPage]     = useState(1);

  /* ── Fetch orders from backend ──────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', {
        params: { page: 1, limit: 500, sortBy: 'createdAt', sortOrder: 'desc' },
      });
      // api interceptor unwraps envelope: data is the orders array
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load orders';
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Manual sync ────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/platforms/amazon/sync', { daysAgo: 30 });
      toast.success(`Sync complete — ${data?.imported ?? 0} new, ${data?.updated ?? 0} updated`);
      fetchOrders(); // refresh table
    } catch (err) {
      const msg = err.response?.data?.message || 'Sync failed';
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  /* ── Client-side filter + paginate ─────────────────────── */
  const filtered = useMemo(() => {
    let data = orders;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((o) =>
        (o.orderId      || '').toLowerCase().includes(q) ||
        (o.productName  || '').toLowerCase().includes(q) ||
        (o.sku          || '').toLowerCase().includes(q) ||
        (o.buyerName    || '').toLowerCase().includes(q)
      );
    }
    if (platform) data = data.filter((o) => o.platform === platform);
    if (status)   data = data.filter((o) => o.status   === status);
    if (courier)  data = data.filter((o) => o.courierPartner === courier);
    return data;
  }, [orders, search, platform, status, courier]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allSelected  = paged.length > 0 && paged.every((o) => selected.has(o._id));
  const someSelected = selected.size > 0;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(paged.map((o) => o._id)));
  const toggle = (id) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const clearFilters = () => { setSearch(''); setPlatform(''); setStatus(''); setCourier(''); setPage(1); };
  const hasFilters   = search || platform || status || courier;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── Header ──────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">Manage and process orders across all platforms.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm">
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary btn-sm"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {/* Search */}
          <div className="relative w-full sm:flex-1 sm:min-w-0">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="form-input pl-9 py-2 w-full"
              placeholder="Search order ID, product, SKU, buyer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Platform */}
            <select
              className="form-select py-2 text-sm flex-1 min-w-0"
              value={platform}
              onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
            >
              {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Status */}
            <select
              className="form-select py-2 text-sm flex-1 min-w-0"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Courier */}
            <select
              className="form-select py-2 text-sm flex-1 min-w-0"
              value={courier}
              onChange={(e) => { setCourier(e.target.value); setPage(1); }}
            >
              {COURIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Date range (placeholder) */}
            <button className="btn-secondary btn-sm gap-1.5 whitespace-nowrap">
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Date Range</span>
              <span className="sm:hidden">Date</span>
            </button>

            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost btn-sm text-gray-400 hover:text-gray-600 gap-1">
                <XMarkIcon className="h-3.5 w-3.5" />
                Clear
              </button>
            )}

            <div className="ml-auto text-xs text-gray-400 whitespace-nowrap">
              {loading ? 'Loading…' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bulk action bar ──────────────────────────── */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary-50 border border-primary-100 rounded-xl animate-fade-in">
          <span className="text-sm font-semibold text-primary-700">{selected.size} order{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button
              onClick={() => navigate('/dashboard/label-generator', { state: { selectedOrders: [...selected] } })}
              className="btn-primary btn-sm"
            >
              <TagIcon className="h-3.5 w-3.5" />
              Generate Labels for Selected
            </button>
            <button className="btn-secondary btn-sm">
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              Export Selected
            </button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost btn-sm text-gray-500">
              <XMarkIcon className="h-3.5 w-3.5" />
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* ── Table ───────────────────────────────────── */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table-root">
            <thead className="table-head">
              <tr>
                <th className="table-th-check">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="table-th">Order ID</th>
                <th className="table-th">Product</th>
                <th className="table-th hidden md:table-cell">SKU</th>
                <th className="table-th hidden sm:table-cell">Platform</th>
                <th className="table-th hidden lg:table-cell">Courier</th>
                <th className="table-th">Status</th>
                <th className="table-th hidden sm:table-cell">Amount</th>
                <th className="table-th hidden md:table-cell">Date</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                /* ── Loading skeleton ── */
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    <td className="table-td-check"><div className="h-4 w-4 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-3 w-28 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-3 w-40 bg-gray-100 rounded" /></td>
                    <td className="table-td hidden md:table-cell"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td hidden sm:table-cell"><div className="h-5 w-16 bg-gray-100 rounded-md" /></td>
                    <td className="table-td hidden lg:table-cell"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-5 w-16 bg-gray-100 rounded-md" /></td>
                    <td className="table-td hidden sm:table-cell"><div className="h-3 w-14 bg-gray-100 rounded" /></td>
                    <td className="table-td hidden md:table-cell"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td" />
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <FunnelIcon className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    {hasFilters ? (
                      <>
                        <p className="text-sm font-medium text-gray-500">No orders match your filters</p>
                        <button onClick={clearFilters} className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium">Clear filters</button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-500">No orders yet</p>
                        <p className="text-xs text-gray-400 mt-1">Click <strong>Sync</strong> to import orders from your connected platforms.</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : paged.map((order) => {
                const isSel = selected.has(order._id);
                const plt   = PLATFORM_STYLE[order.platform] || {};
                const displayId = order.orderId || order._id;
                const displayProduct = order.productName || (order.items?.[0]?.name) || '—';
                const displaySku     = order.sku || (order.items?.[0]?.sku) || '—';
                const displayCourier = order.courierPartner || '—';
                const displayStatus  = order.status || 'pending';
                const displayAmount  = formatAmount(order.orderValue);
                const displayDate    = formatDate(order.platformCreatedAt || order.createdAt);

                return (
                  <tr key={order._id} className={`${isSel ? 'table-row-selected' : 'table-row'}`}>
                    <td className="table-td-check">
                      <input type="checkbox" checked={isSel} onChange={() => toggle(order._id)} />
                    </td>
                    <td className="table-td">
                      <span className="font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">{displayId}</span>
                    </td>
                    <td className="table-td max-w-[140px] sm:max-w-[180px]">
                      <p className="text-xs font-medium text-gray-900 truncate">{displayProduct}</p>
                    </td>
                    <td className="table-td hidden md:table-cell font-mono text-xs text-gray-500">{displaySku}</td>
                    <td className="table-td hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${plt?.badge || 'bg-gray-100 text-gray-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${plt?.dot || 'bg-gray-400'}`} />
                        <span className="capitalize">{order.platform}</span>
                      </span>
                    </td>
                    <td className="table-td hidden lg:table-cell text-xs text-gray-600 capitalize">{displayCourier}</td>
                    <td className="table-td">
                      <span className={STATUS_STYLE[displayStatus] || 'badge-gray'}>
                        <span className="capitalize">{displayStatus.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="table-td hidden sm:table-cell text-xs font-semibold text-gray-800">{displayAmount}</td>
                    <td className="table-td hidden md:table-cell text-xs text-gray-400 whitespace-nowrap">{displayDate}</td>
                    <td className="table-td">
                      <RowMenu onView={() => {}} onDelete={() => {}} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-700">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-700">{filtered.length}</span> orders
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
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${page === p ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && <span className="text-xs text-gray-400 px-1">…</span>}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating generate button (mobile) ───────── */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
          <button
            onClick={() => navigate('/dashboard/label-generator')}
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-2xl shadow-modal text-sm font-semibold"
          >
            <TagIcon className="h-4 w-4" />
            Generate Labels ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}
