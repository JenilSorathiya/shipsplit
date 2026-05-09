import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FunnelIcon, MagnifyingGlassIcon,
  ArrowDownTrayIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon,
  EllipsisHorizontalIcon, TrashIcon, EyeIcon,
  CalendarDaysIcon, XMarkIcon, CheckCircleIcon, NoSymbolIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Amazon cancellation reason codes ───────────────────────────────── */
const CANCEL_REASONS = [
  { value: 'NO_INVENTORY',    label: 'Out of stock / No inventory' },
  { value: 'PRICE_ERROR',     label: 'Price error on listing' },
  { value: 'SELLER_CANCEL',   label: 'Unable to fulfil order' },
  { value: 'CUSTOMER_CANCEL', label: 'Customer requested cancellation' },
];

/* ── Cancel / Reject confirmation modal ─────────────────────────────── */
function RejectModal({ order, onConfirm, onClose, loading }) {
  const [reason,     setReason]     = useState('NO_INVENTORY');
  const [reasonText, setReasonText] = useState('');

  const isLabelGenerated = order?.status === 'label_generated';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isLabelGenerated ? 'Cancel Order' : 'Reject Order'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Order <span className="font-mono font-semibold">{order?.orderId}</span>
              {isLabelGenerated && ' — this will also cancel the generated label'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cancellation reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-select w-full text-sm"
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Additional notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Item damaged in warehouse"
              rows={2}
              className="form-input w-full text-sm resize-none"
            />
          </div>
        </div>

        {isLabelGenerated && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <NoSymbolIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              A shipping label was already generated. Cancelling will also void that label and notify Amazon.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary btn-sm flex-1"
          >
            Keep Order
          </button>
          <button
            onClick={() => onConfirm(reason, reasonText)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading
              ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              : <NoSymbolIcon  className="h-3.5 w-3.5" />
            }
            {loading ? 'Cancelling…' : (isLabelGenerated ? 'Cancel Order' : 'Reject Order')}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatAmount(value) {
  if (!value && value !== 0) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

/* ── Row action menu (view / delete) ────────────────────── */
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
  /* ── Data state ─────────────────────────────────────────── */
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);

  /* ── Filter / page state ────────────────────────────────── */
  const [search,   setSearch]   = useState('');
  const [platform, setPlatform] = useState('');
  const [status,   setStatus]   = useState('');
  const [courier,  setCourier]  = useState('');
  const [selected, setSelected] = useState(new Set());
  const [page,     setPage]     = useState(1);

  /* ── Label action state ─────────────────────────────────── */
  // { [orderId]: { labelId, status: 'processing'|'ready'|'failed' } }
  const [labelStates,    setLabelStates]    = useState({});
  const [acceptingIds,   setAcceptingIds]   = useState(new Set());
  const [downloadingIds, setDownloadingIds] = useState(new Set());

  // Track which orders were accepted in this browser session.
  // Only these show the "label ready" toast — avoids toast spam on page refresh.
  const sessionAccepted = useRef(new Set());

  /* ── Reject / cancel state ──────────────────────────────── */
  const [rejectTarget,  setRejectTarget]  = useState(null);  // order object being rejected
  const [rejectingId,   setRejectingId]   = useState(null);  // orderId in flight

  /* ── Fetch orders ───────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', {
        params: { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      });
      const list = Array.isArray(data) ? data : [];
      setOrders(list);

      // Pre-populate labelStates from orders that already have a labelId.
      // Use 'processing' so the polling effect checks the real status once,
      // then upgrades to 'ready' (with filename) or 'failed'.
      setLabelStates((prev) => {
        const next = { ...prev };
        for (const o of list) {
          if (o.labelId && !next[o._id]) {
            next[o._id] = { labelId: o.labelId, status: 'processing' };
          }
        }
        return next;
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Poll label jobs that are still 'processing' ────────── */
  useEffect(() => {
    const processing = Object.entries(labelStates).filter(([, v]) => v.status === 'processing');
    if (processing.length === 0) return;

    const timer = setInterval(async () => {
      const updates = {};
      await Promise.allSettled(
        processing.map(async ([orderId, { labelId }]) => {
          try {
            const { data } = await api.get(`/labels/${labelId}/status`);
            const label = data?.label;
            if (label?.status === 'ready') {
              updates[orderId] = { labelId, status: 'ready' };
              // Only toast if accepted in this session (not on page refresh)
              if (sessionAccepted.current.has(orderId)) {
                toast.success('Amazon label is ready — click Download Label!');
                sessionAccepted.current.delete(orderId);
              }
            } else if (label?.status === 'failed') {
              updates[orderId] = { labelId, status: 'failed' };
              if (sessionAccepted.current.has(orderId)) {
                toast.error(label?.error || 'Amazon could not generate a label for this order');
                sessionAccepted.current.delete(orderId);
              }
            }
          } catch { /* ignore transient errors */ }
        })
      );
      if (Object.keys(updates).length > 0) {
        setLabelStates((prev) => ({ ...prev, ...updates }));
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [labelStates]);

  /* ── Accept order → auto-generate label ────────────────── */
  const handleAccept = async (orderId) => {
    setAcceptingIds((prev) => new Set(prev).add(orderId));
    try {
      const { data } = await api.post(`/orders/${orderId}/accept`);
      const labelId = data?.labelId;
      sessionAccepted.current.add(orderId); // mark so polling can toast when ready
      setLabelStates((prev) => ({ ...prev, [orderId]: { labelId, status: 'processing' } }));
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, status: 'label_generated', labelId } : o)
      );
      toast.success('Order accepted — Amazon is generating the label…');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  };

  /* ── Download label for an order ───────────────────────── */
  const handleDownloadLabel = async (orderId, labelId) => {
    setDownloadingIds((prev) => new Set(prev).add(orderId));
    try {
      const resp = await api.get(
        `/labels/${labelId}/download-label`,
        { responseType: 'blob' }
      );
      // Extract filename from Content-Disposition header if available
      const disposition = resp.headers?.['content-disposition'] || '';
      const match       = disposition.match(/filename="?([^"]+)"?/);
      const fname       = match?.[1] || `label_${labelId}.pdf`;

      const url = URL.createObjectURL(resp.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Label downloaded!');
    } catch (err) {
      // responseType:'blob' means error bodies arrive as Blobs — parse them to get the message
      let message = err.message || 'Download failed';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          message = JSON.parse(text).message || message;
        } catch { /* not JSON, keep generic message */ }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      toast.error(message);
    } finally {
      setDownloadingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  };

  /* ── Reject / cancel order ──────────────────────────────── */
  const handleRejectOrder = async (reason, reasonText) => {
    if (!rejectTarget) return;
    const orderId = rejectTarget._id;
    setRejectingId(orderId);
    try {
      await api.post(`/orders/${orderId}/reject`, { reason, reasonText });
      toast.success('Order cancelled successfully');
      setRejectTarget(null);
      // Update local order list status
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, status: 'cancelled' } : o)
      );
      // Clear any label state for this order
      setLabelStates((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setRejectingId(null);
    }
  };

  /* ── Sync ───────────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/platforms/amazon/sync', { daysAgo: 30 });
      toast.success(`Sync complete — ${data?.imported ?? 0} new, ${data?.updated ?? 0} updated`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  /* ── Clear all orders ───────────────────────────────────── */
  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL orders from your account? This cannot be undone.')) return;
    try {
      const { data } = await api.delete('/orders');
      toast.success(`Cleared ${data?.deleted ?? 0} orders`);
      setOrders([]);
      setLabelStates({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear orders');
    }
  };

  /* ── Client-side filter + paginate ─────────────────────── */
  const filtered = useMemo(() => {
    let data = orders;
    // Hide cancelled orders by default — only show when user explicitly filters for them
    if (status) {
      data = data.filter((o) => o.status === status);
    } else {
      data = data.filter((o) => o.status !== 'cancelled');
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((o) =>
        (o.orderId     || '').toLowerCase().includes(q) ||
        (o.productName || '').toLowerCase().includes(q) ||
        (o.sku         || '').toLowerCase().includes(q) ||
        (o.buyerName   || '').toLowerCase().includes(q)
      );
    }
    if (platform) data = data.filter((o) => o.platform === platform);
    if (courier)  data = data.filter((o) => o.courierPartner === courier);
    return data;
  }, [orders, search, platform, status, courier]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged        = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
          <p className="page-sub">Accept orders to auto-generate shipping labels, then download and print.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            className="btn-secondary btn-sm text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Clear All
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

      {/* ── How it works tip ────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-primary-50 border border-primary-100 rounded-xl">
        <CheckCircleIcon className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary-700">
          <span className="font-semibold">How it works:</span> Click <strong>Accept Order</strong> on any pending order — ShipSplit automatically generates a shipping label. Once ready, click <strong>Download Label</strong> to print and ship.
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
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
            <select className="form-select py-2 text-sm flex-1 min-w-0" value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }}>
              {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="form-select py-2 text-sm flex-1 min-w-0" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="form-select py-2 text-sm flex-1 min-w-0" value={courier} onChange={(e) => { setCourier(e.target.value); setPage(1); }}>
              {COURIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="btn-secondary btn-sm gap-1.5 whitespace-nowrap">
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Date Range</span>
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
                <th className="table-th min-w-[140px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
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
                    <td className="table-td"><div className="h-7 w-28 bg-gray-100 rounded-lg" /></td>
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
                const isSel          = selected.has(order._id);
                const plt            = PLATFORM_STYLE[order.platform] || {};
                const displayId      = order.orderId || order._id;
                const displayProduct = order.productName || order.items?.[0]?.name || '—';
                const displaySku     = order.sku || order.items?.[0]?.sku || '—';
                const displayStatus  = order.status || 'pending';
                const ls             = labelStates[order._id];
                const isAccepting    = acceptingIds.has(order._id);
                const isDownloading  = downloadingIds.has(order._id);
                // Order has a label if: local state has one OR DB has one
                const hasLabel       = ls?.labelId || order.labelId;
                const labelReady     = ls?.status === 'ready';

                return (
                  <tr key={order._id} className={isSel ? 'table-row-selected' : 'table-row'}>
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
                    <td className="table-td hidden lg:table-cell text-xs text-gray-600 capitalize">
                      {order.courierPartner || '—'}
                    </td>
                    <td className="table-td">
                      <span className={STATUS_STYLE[displayStatus] || 'badge-gray'}>
                        <span className="capitalize">{displayStatus.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="table-td hidden sm:table-cell text-xs font-semibold text-gray-800">
                      {formatAmount(order.orderValue)}
                    </td>
                    <td className="table-td hidden md:table-cell text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(order.platformCreatedAt || order.createdAt)}
                    </td>

                    {/* ── Action column ── */}
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 justify-end">
                        {isAccepting ? (
                          /* Accepting in flight */
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 px-2">
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                            Accepting…
                          </span>
                        ) : rejectingId === order._id ? (
                          /* Rejecting in flight */
                          <span className="flex items-center gap-1.5 text-xs text-red-500 px-2">
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                            Cancelling…
                          </span>
                        ) : ls?.status === 'processing' ? (
                          /* Label generating — allow cancel while generating */
                          <>
                            <span className="flex items-center gap-1.5 text-xs text-primary-600 px-1">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              Generating…
                            </span>
                            <button
                              onClick={() => setRejectTarget(order)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Cancel order"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : ls?.status === 'failed' ? (
                          /* Label failed — retry or reject */
                          <>
                            <button
                              onClick={() => handleAccept(order._id)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                            >
                              Retry
                            </button>
                            <button
                              onClick={() => setRejectTarget(order)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Cancel order"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : labelReady && hasLabel ? (
                          /* Label ready — Download + Cancel */
                          <>
                            <button
                              onClick={() => handleDownloadLabel(
                                order._id,
                                ls?.labelId || order.labelId
                              )}
                              disabled={isDownloading}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success-50 text-success-700 border border-success-200 hover:bg-success-100 text-xs font-semibold transition-colors disabled:opacity-60"
                            >
                              {isDownloading
                                ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                : <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                              }
                              {isDownloading ? 'Downloading…' : 'Download Label'}
                            </button>
                            <button
                              onClick={() => setRejectTarget(order)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Cancel order"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : displayStatus === 'pending' ? (
                          /* Pending — Accept + Reject side by side */
                          <>
                            <button
                              onClick={() => handleAccept(order._id)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm"
                            >
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              onClick={() => setRejectTarget(order)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          /* Shipped / delivered / cancelled / returned — row menu only */
                          <RowMenu onView={() => {}} onDelete={() => {}} />
                        )}
                      </div>
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

      {/* ── Reject / Cancel modal ───────────────────── */}
      {rejectTarget && (
        <RejectModal
          order={rejectTarget}
          loading={rejectingId === rejectTarget._id}
          onConfirm={handleRejectOrder}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
