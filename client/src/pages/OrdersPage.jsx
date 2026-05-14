import { useState, useEffect, useMemo, useCallback } from 'react';
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

  /* ── Per-row action state ───────────────────────────────── */
  const [acceptingIds,        setAcceptingIds]        = useState(new Set());
  const [reprintingIds,       setReprintingIds]       = useState(new Set());
  const [confirmShippingIds,  setConfirmShippingIds]  = useState(new Set());

  /* ── Header overflow menu ───────────────────────────────── */
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  /* ── Bulk operation state ───────────────────────────────── */
  const [bulkAccepting,         setBulkAccepting]         = useState(false);
  const [bulkDownloadingLabels, setBulkDownloadingLabels] = useState(false);
  const [bulkMarkingShipped,    setBulkMarkingShipped]    = useState(false);

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
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Pure helpers — fetch blob and trigger browser download ─────────── */
  const triggerSingleLabel = async (orderId, orderIdStr) => {
    const resp = await api.get(`/orders/${orderId}/label`, { responseType: 'blob' });
    const match = (resp.headers?.['content-disposition'] || '').match(/filename="?([^"]+)"?/);
    const fname = match?.[1] || `label_${orderIdStr || orderId}.pdf`;
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const triggerBulkLabels = async (orderIds) => {
    const resp = await api.post('/orders/bulk-label', { orderIds }, { responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url; a.download = `labels_bulk_${Date.now()}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  /* ── Accept single order → status becomes label_generated ── */
  const handleAccept = async (orderId) => {
    setAcceptingIds((prev) => new Set(prev).add(orderId));
    try {
      const { data } = await api.post(`/orders/${orderId}/accept`);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? { ...o, status: 'label_generated', awb: data?.awb, shipmentId: data?.shipmentId }
            : o
        )
      );
      toast.success('Order accepted — label ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  };

  /* ── Reprint label — for cases where printer failed or label was lost ── */
  const handleReprintLabel = async (orderId, orderIdStr) => {
    setReprintingIds((prev) => new Set(prev).add(orderId));
    try {
      await triggerSingleLabel(orderId, orderIdStr);
    } catch {
      toast.error('Could not reprint label — try again');
    } finally {
      setReprintingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setRejectingId(null);
    }
  };

  /* ── Confirm shipped → tell Amazon package was handed to carrier ───── */
  const handleConfirmShipped = async (orderId) => {
    setConfirmShippingIds((prev) => new Set(prev).add(orderId));
    try {
      await api.post(`/orders/${orderId}/confirm-shipped`);
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, status: 'shipped', shippedAt: new Date() } : o)
      );
      toast.success('Amazon notified — order marked as Shipped!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm shipment');
    } finally {
      setConfirmShippingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
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
    setHeaderMenuOpen(false);
    if (!window.confirm('Delete ALL orders from your account? This cannot be undone.')) return;
    try {
      const { data } = await api.delete('/orders');
      toast.success(`Cleared ${data?.deleted ?? 0} orders`);
      setOrders([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear orders');
    }
  };

  /* ── Delete selected orders ─────────────────────────────── */
  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.size} selected order${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    const ids = [...selected];
    let deleted = 0;
    for (const id of ids) {
      try {
        await api.delete(`/orders/${id}`);
        deleted++;
      } catch { /* skip errors for individual orders */ }
    }
    setOrders((prev) => prev.filter((o) => !selected.has(o._id)));
    setSelected(new Set());
    toast.success(`Deleted ${deleted} order${deleted !== 1 ? 's' : ''}`);
  };

  /* ── Bulk accept — all pending in parallel, labels auto-download as one PDF ─ */
  const handleBulkAccept = async () => {
    const pendingOrders = orders.filter((o) => selected.has(o._id) && o.status === 'pending');
    if (pendingOrders.length === 0) { toast.error('No pending orders selected'); return; }

    setBulkAccepting(true);

    const results = await Promise.allSettled(
      pendingOrders.map((o) => api.post(`/orders/${o._id}/accept`).then((r) => ({ id: o._id, data: r.data })))
    );

    const updates = {};
    const acceptedIds = [];
    let accepted = 0, failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        updates[r.value.id] = { status: 'label_generated', awb: r.value.data?.awb, shipmentId: r.value.data?.shipmentId };
        acceptedIds.push(r.value.id);
        accepted++;
      } else {
        failed++;
      }
    }
    setOrders((prev) => prev.map((o) => (updates[o._id] ? { ...o, ...updates[o._id] } : o)));

    if (accepted > 0) {
      const msg = failed > 0 ? `, ${failed} failed` : '';
      toast.success(`${accepted} order${accepted !== 1 ? 's' : ''} accepted — select them and click Download Labels${msg}`);
    } else {
      toast.error(`All ${failed} orders failed to accept`);
    }

    setBulkAccepting(false);
  };

  /* ── Bulk mark shipped — all label_generated selected orders in parallel ─ */
  const handleBulkMarkShipped = async () => {
    const labelOrders = orders.filter((o) => selected.has(o._id) && o.status === 'label_generated');
    if (labelOrders.length === 0) { toast.error('No accepted (label-ready) orders selected'); return; }

    setBulkMarkingShipped(true);

    const results = await Promise.allSettled(
      labelOrders.map((o) => api.post(`/orders/${o._id}/confirm-shipped`).then(() => o._id))
    );

    const shippedIds = new Set();
    let shipped = 0, failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') { shippedIds.add(r.value); shipped++; }
      else failed++;
    }
    setOrders((prev) =>
      prev.map((o) => (shippedIds.has(o._id) ? { ...o, status: 'shipped', shippedAt: new Date() } : o))
    );
    setBulkMarkingShipped(false);

    if (failed === 0) {
      toast.success(`${shipped} order${shipped !== 1 ? 's' : ''} marked as Shipped — Amazon notified`);
    } else {
      toast(`${shipped} shipped, ${failed} failed`, { icon: '⚠️' });
    }
  };

  /* ── Re-download labels — in case PDF didn't open or needs reprinting ── */
  const handleBulkDownloadLabels = async () => {
    const labelReadyIds = orders
      .filter((o) => selected.has(o._id) && ['label_generated', 'shipped', 'delivered'].includes(o.status))
      .map((o) => o._id);

    if (labelReadyIds.length === 0) {
      toast.error('Select accepted orders to re-download their labels');
      return;
    }

    setBulkDownloadingLabels(true);
    try {
      await triggerBulkLabels(labelReadyIds);
      toast.success(`${labelReadyIds.length} label${labelReadyIds.length !== 1 ? 's' : ''} re-downloaded as one PDF`);
    } catch {
      toast.error('Re-download failed — try again');
    } finally {
      setBulkDownloadingLabels(false);
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
        <div className="flex gap-2 items-center">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary btn-sm"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>

          {/* ── Overflow menu (danger actions) ─────── */}
          <div className="relative">
            <button
              onClick={() => setHeaderMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="More actions"
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>
            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-20">
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Clear all orders
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── How it works tip ────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-primary-50 border border-primary-100 rounded-xl">
        <CheckCircleIcon className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary-700">
          <span className="font-semibold">How it works:</span>{' '}
          <strong>1.</strong> Select pending orders → <strong>Accept All</strong>.{' '}
          <strong>2.</strong> Select accepted orders → <strong>Download Labels</strong> (one PDF for all).{' '}
          <strong>3.</strong> Print, pack, hand to courier → <strong>Mark Shipped</strong> — Amazon notified, buyer gets tracking.
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
          <span className="text-sm font-semibold text-primary-700">
            {selected.size} order{selected.size !== 1 ? 's' : ''} selected
          </span>

          <div className="flex gap-2 ml-auto flex-wrap">

            {/* Step 1 — Accept all pending */}
            <button
              onClick={handleBulkAccept}
              disabled={bulkAccepting || bulkDownloadingLabels || bulkMarkingShipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
              title="Accept all selected pending orders at once"
            >
              {bulkAccepting
                ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircleIcon className="h-3.5 w-3.5" />
              }
              {bulkAccepting ? 'Accepting…' : 'Accept All'}
            </button>

            {/* Step 2 — Download all labels as one PDF */}
            <button
              onClick={handleBulkDownloadLabels}
              disabled={bulkAccepting || bulkDownloadingLabels || bulkMarkingShipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-600 hover:bg-success-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
              title="Download all selected accepted orders' labels as one PDF"
            >
              {bulkDownloadingLabels
                ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                : <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              }
              {bulkDownloadingLabels ? 'Downloading…' : 'Download Labels'}
            </button>

            {/* Step 3 — Mark all shipped (notifies Amazon) */}
            <button
              onClick={handleBulkMarkShipped}
              disabled={bulkAccepting || bulkDownloadingLabels || bulkMarkingShipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-300 text-primary-700 hover:bg-primary-100 text-xs font-semibold transition-colors disabled:opacity-60"
              title="Mark all selected accepted orders as shipped — notifies Amazon"
            >
              {bulkMarkingShipped
                ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircleIcon className="h-3.5 w-3.5" />
              }
              {bulkMarkingShipped ? 'Marking Shipped…' : 'Mark Shipped'}
            </button>

            <button
              onClick={handleDeleteSelected}
              disabled={bulkAccepting || bulkDownloadingLabels || bulkMarkingShipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-60"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>

            <button
              onClick={() => setSelected(new Set())}
              disabled={bulkAccepting || bulkDownloadingLabels || bulkMarkingShipped}
              className="btn-ghost btn-sm text-gray-500 disabled:opacity-60"
            >
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
                const isSel               = selected.has(order._id);
                const plt                 = PLATFORM_STYLE[order.platform] || {};
                const displayId           = order.orderId || order._id;
                const displayProduct      = order.productName || order.items?.[0]?.name || '—';
                const displaySku          = order.sku || order.items?.[0]?.sku || '—';
                const displayStatus       = order.status || 'pending';
                const isAccepting         = acceptingIds.has(order._id);
                const isReprinting        = reprintingIds.has(order._id);
                const isConfirmingShipped = confirmShippingIds.has(order._id);

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
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 px-2">
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                            Accepting…
                          </span>
                        ) : rejectingId === order._id ? (
                          <span className="flex items-center gap-1.5 text-xs text-red-500 px-2">
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                            Cancelling…
                          </span>
                        ) : displayStatus === 'pending' ? (
                          /* Pending — individual Accept + Reject */
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
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Reject order"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : displayStatus === 'label_generated' ? (
                          /* Label ready — Download + Mark Shipped + cancel */
                          <>
                            <button
                              onClick={() => handleReprintLabel(order._id, order.orderId)}
                              disabled={isReprinting || isConfirmingShipped}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success-50 text-success-700 border border-success-200 hover:bg-success-100 text-xs font-semibold transition-colors disabled:opacity-60"
                              title="Download shipping label"
                            >
                              {isReprinting
                                ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                : <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                              }
                              {isReprinting ? 'Downloading…' : 'Label'}
                            </button>
                            <button
                              onClick={() => handleConfirmShipped(order._id)}
                              disabled={isConfirmingShipped || isReprinting}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                              title="Confirm package handed to carrier — notifies Amazon"
                            >
                              {isConfirmingShipped
                                ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCircleIcon className="h-3.5 w-3.5" />
                              }
                              {isConfirmingShipped ? 'Confirming…' : 'Mark Shipped'}
                            </button>
                            <button
                              onClick={() => setRejectTarget(order)}
                              disabled={isConfirmingShipped}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="Cancel order"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
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
