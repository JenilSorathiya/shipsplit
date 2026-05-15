import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon, ArrowDownTrayIcon, ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon,
  TrashIcon, EyeIcon, XMarkIcon, CheckCircleIcon, NoSymbolIcon,
  TruckIcon, ArchiveBoxIcon, ClockIcon, ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Cancel reason codes ─────────────────────────────────────────────── */
const CANCEL_REASONS = [
  { value: 'NO_INVENTORY',    label: 'Out of stock / No inventory' },
  { value: 'PRICE_ERROR',     label: 'Price error on listing' },
  { value: 'SELLER_CANCEL',   label: 'Unable to fulfil order' },
  { value: 'CUSTOMER_CANCEL', label: 'Customer requested cancellation' },
];

/* ── Tabs config ─────────────────────────────────────────────────────── */
const TABS = [
  {
    key:      'pending',
    label:    'Pending',
    icon:     ClockIcon,
    statuses: ['pending'],
    color:    'orange',
    tip:      'New orders waiting for your acceptance. Accept to confirm and generate shipping label.',
  },
  {
    key:      'accepted',
    label:    'Accepted',
    icon:     ArchiveBoxIcon,
    statuses: ['processing', 'label_generated'],
    color:    'blue',
    tip:      'Orders accepted and label is ready. Download label, print it, pack the item.',
  },
  {
    key:      'shipped',
    label:    'Shipped',
    icon:     TruckIcon,
    statuses: ['shipped'],
    color:    'purple',
    tip:      'Orders handed to courier. Marketplace and buyer notified with tracking.',
  },
  {
    key:      'delivered',
    label:    'Delivered',
    icon:     CheckCircleIcon,
    statuses: ['delivered'],
    color:    'green',
    tip:      'Successfully delivered to the buyer.',
  },
  {
    key:      'cancelled',
    label:    'Cancelled',
    icon:     NoSymbolIcon,
    statuses: ['cancelled', 'returned'],
    color:    'red',
    tip:      'Cancelled or returned orders.',
  },
];

const TAB_COLORS = {
  orange: {
    active:   'border-orange-500 text-orange-600',
    badge:    'bg-orange-100 text-orange-700',
    inactive: 'text-gray-500 hover:text-orange-500',
  },
  blue: {
    active:   'border-blue-500 text-blue-600',
    badge:    'bg-blue-100 text-blue-700',
    inactive: 'text-gray-500 hover:text-blue-500',
  },
  purple: {
    active:   'border-purple-500 text-purple-600',
    badge:    'bg-purple-100 text-purple-700',
    inactive: 'text-gray-500 hover:text-purple-500',
  },
  green: {
    active:   'border-green-500 text-green-600',
    badge:    'bg-green-100 text-green-700',
    inactive: 'text-gray-500 hover:text-green-500',
  },
  red: {
    active:   'border-red-500 text-red-600',
    badge:    'bg-red-100 text-red-700',
    inactive: 'text-gray-500 hover:text-red-500',
  },
};

const PLATFORM_OPTIONS = [
  { value: '',         label: 'All Platforms' },
  { value: 'amazon',   label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'meesho',   label: 'Meesho' },
  { value: 'myntra',   label: 'Myntra' },
];

const PLATFORM_STYLE = {
  amazon:   { dot: 'bg-[#FF9900]', badge: 'bg-[#FF9900]/10 text-[#b36b00]' },
  flipkart: { dot: 'bg-[#2874F0]', badge: 'bg-[#2874F0]/10 text-[#1857c7]' },
  meesho:   { dot: 'bg-[#F43397]', badge: 'bg-[#F43397]/10 text-[#c41374]' },
  myntra:   { dot: 'bg-[#FF3F6C]', badge: 'bg-[#FF3F6C]/10 text-[#d0163e]' },
};

const PAGE_SIZE = 15;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatAmount(v) {
  if (!v && v !== 0) return '—';
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

/* ── Cancel / Reject modal ───────────────────────────────────────────── */
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
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="form-select w-full text-sm">
              {CANCEL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Additional notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reasonText} onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Item damaged in warehouse"
              rows={2} className="form-input w-full text-sm resize-none"
            />
          </div>
        </div>
        {isLabelGenerated && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <NoSymbolIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              A shipping label was already generated. Cancelling will void that label and notify the marketplace.
            </p>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={loading} className="btn-secondary btn-sm flex-1">Keep Order</button>
          <button
            onClick={() => onConfirm(reason, reasonText)} disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <NoSymbolIcon className="h-3.5 w-3.5" />}
            {loading ? 'Cancelling…' : (isLabelGenerated ? 'Cancel Order' : 'Reject Order')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Row overflow menu ───────────────────────────────────────────────── */
function RowMenu({ onView, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
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

/* ── Main page ───────────────────────────────────────────────────────── */
export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState('pending');
  const [search,    setSearch]    = useState('');
  const [platform,  setPlatform]  = useState('');
  const [selected,  setSelected]  = useState(new Set());
  const [page,      setPage]      = useState(1);

  const [acceptingIds,       setAcceptingIds]       = useState(new Set());
  const [reprintingIds,      setReprintingIds]       = useState(new Set());
  const [confirmShippingIds, setConfirmShippingIds]  = useState(new Set());

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [bulkAccepting,          setBulkAccepting]          = useState(false);
  const [bulkDownloadingLabels,  setBulkDownloadingLabels]  = useState(false);
  const [bulkMarkingShipped,     setBulkMarkingShipped]     = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectingId,  setRejectingId]  = useState(null);

  /* ── Fetch all orders ────────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let all = [], cur = 1;
      while (true) {
        const r = await api.get('/orders', { params: { page: cur, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' } });
        const batch = Array.isArray(r.data) ? r.data : [];
        all = all.concat(batch);
        const total = r.meta?.total ?? r.meta?.count ?? null;
        if (batch.length < 100 || (total !== null && all.length >= total)) break;
        cur++;
      }
      setOrders(all);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Tab counts ──────────────────────────────────────────────────── */
  const tabCounts = useMemo(() => {
    const counts = {};
    for (const tab of TABS) {
      counts[tab.key] = orders.filter((o) => tab.statuses.includes(o.status)).length;
    }
    return counts;
  }, [orders]);

  /* ── Filtered orders for active tab ─────────────────────────────── */
  const currentTab = TABS.find((t) => t.key === activeTab);
  const filtered = useMemo(() => {
    let data = orders.filter((o) => currentTab.statuses.includes(o.status));
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
    return data;
  }, [orders, activeTab, search, platform, currentTab]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged        = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allSelected  = paged.length > 0 && paged.every((o) => selected.has(o._id));
  const someSelected = selected.size > 0;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(paged.map((o) => o._id)));
  const toggle    = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const switchTab = (key) => { setActiveTab(key); setSelected(new Set()); setPage(1); setSearch(''); };

  /* ── Label helpers ───────────────────────────────────────────────── */
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

  /* ── Single actions ──────────────────────────────────────────────── */
  const handleAccept = async (orderId) => {
    setAcceptingIds((p) => new Set(p).add(orderId));
    try {
      const { data } = await api.post(`/orders/${orderId}/accept`);
      setOrders((p) => p.map((o) => o._id === orderId
        ? { ...o, status: 'label_generated', awb: data?.awb, shipmentId: data?.shipmentId }
        : o
      ));
      toast.success('Order accepted — label ready! Go to Accepted tab.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingIds((p) => { const s = new Set(p); s.delete(orderId); return s; });
    }
  };

  const handleReprintLabel = async (orderId, orderIdStr) => {
    setReprintingIds((p) => new Set(p).add(orderId));
    try {
      await triggerSingleLabel(orderId, orderIdStr);
    } catch {
      toast.error('Could not download label — try again');
    } finally {
      setReprintingIds((p) => { const s = new Set(p); s.delete(orderId); return s; });
    }
  };

  const handleConfirmShipped = async (orderId) => {
    setConfirmShippingIds((p) => new Set(p).add(orderId));
    try {
      await api.post(`/orders/${orderId}/confirm-shipped`);
      setOrders((p) => p.map((o) => o._id === orderId ? { ...o, status: 'shipped', shippedAt: new Date() } : o));
      toast.success('Marketplace notified — order moved to Shipped!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm shipment');
    } finally {
      setConfirmShippingIds((p) => { const s = new Set(p); s.delete(orderId); return s; });
    }
  };

  const handleRejectOrder = async (reason, reasonText) => {
    if (!rejectTarget) return;
    const orderId = rejectTarget._id;
    setRejectingId(orderId);
    try {
      await api.post(`/orders/${orderId}/reject`, { reason, reasonText });
      toast.success('Order cancelled successfully');
      setRejectTarget(null);
      setOrders((p) => p.map((o) => o._id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setRejectingId(null);
    }
  };

  /* ── Sync ────────────────────────────────────────────────────────── */
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

  const handleClearAll = async () => {
    setHeaderMenuOpen(false);
    if (!window.confirm('Delete ALL orders? This cannot be undone.')) return;
    try {
      const { data } = await api.delete('/orders');
      toast.success(`Cleared ${data?.deleted ?? 0} orders`);
      setOrders([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear orders');
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.size} selected order${selected.size !== 1 ? 's' : ''}?`)) return;
    const ids = [...selected];
    let deleted = 0;
    for (const id of ids) {
      try { await api.delete(`/orders/${id}`); deleted++; } catch { /* skip */ }
    }
    setOrders((p) => p.filter((o) => !selected.has(o._id)));
    setSelected(new Set());
    toast.success(`Deleted ${deleted} order${deleted !== 1 ? 's' : ''}`);
  };

  /* ── Bulk actions ────────────────────────────────────────────────── */
  const handleBulkAccept = async () => {
    const targets = orders.filter((o) => selected.has(o._id) && o.status === 'pending');
    if (!targets.length) { toast.error('No pending orders selected'); return; }
    setBulkAccepting(true);
    const results = await Promise.allSettled(
      targets.map((o) => api.post(`/orders/${o._id}/accept`).then((r) => ({ id: o._id, data: r.data })))
    );
    const updates = {}; let accepted = 0, failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        updates[r.value.id] = { status: 'label_generated', awb: r.value.data?.awb };
        accepted++;
      } else { failed++; }
    }
    setOrders((p) => p.map((o) => updates[o._id] ? { ...o, ...updates[o._id] } : o));
    setBulkAccepting(false);
    if (accepted > 0) toast.success(`${accepted} order${accepted !== 1 ? 's' : ''} accepted — go to Accepted tab to download labels${failed > 0 ? ` (${failed} failed)` : ''}`);
    else toast.error(`All ${failed} orders failed`);
  };

  const handleBulkDownloadLabels = async () => {
    const ids = orders.filter((o) => selected.has(o._id) && ['label_generated', 'processing'].includes(o.status)).map((o) => o._id);
    if (!ids.length) { toast.error('Select accepted orders to download labels'); return; }
    setBulkDownloadingLabels(true);
    try {
      await triggerBulkLabels(ids);
      toast.success(`${ids.length} label${ids.length !== 1 ? 's' : ''} downloaded as one PDF`);
    } catch {
      toast.error('Download failed — try again');
    } finally {
      setBulkDownloadingLabels(false);
    }
  };

  const handleBulkMarkShipped = async () => {
    const targets = orders.filter((o) => selected.has(o._id) && ['label_generated', 'processing'].includes(o.status));
    if (!targets.length) { toast.error('Select accepted orders to mark as shipped'); return; }
    setBulkMarkingShipped(true);
    const results = await Promise.allSettled(
      targets.map((o) => api.post(`/orders/${o._id}/confirm-shipped`).then(() => o._id))
    );
    const shippedIds = new Set(); let shipped = 0, failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') { shippedIds.add(r.value); shipped++; } else { failed++; }
    }
    setOrders((p) => p.map((o) => shippedIds.has(o._id) ? { ...o, status: 'shipped', shippedAt: new Date() } : o));
    setBulkMarkingShipped(false);
    if (failed === 0) toast.success(`${shipped} order${shipped !== 1 ? 's' : ''} marked Shipped — marketplace notified`);
    else toast(`${shipped} shipped, ${failed} failed`, { icon: '⚠️' });
  };

  const isBusy = bulkAccepting || bulkDownloadingLabels || bulkMarkingShipped;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">Manage all your marketplace orders from one place.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleSync} disabled={syncing} className="btn-secondary btn-sm">
            <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <div className="relative">
            <button
              onClick={() => setHeaderMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>
            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-20">
                  <button onClick={handleClearAll} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <TrashIcon className="h-3.5 w-3.5" /> Clear all orders
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Step tabs ──────────────────────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Step indicator */}
        <div className="flex items-center gap-0 overflow-x-auto border-b border-gray-100 px-1">
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.key;
            const colors   = TAB_COLORS[tab.color];
            const Icon     = tab.icon;
            const count    = tabCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`
                  relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium
                  border-b-2 whitespace-nowrap transition-all flex-shrink-0
                  ${isActive
                    ? `${colors.active} bg-white`
                    : `border-transparent ${colors.inactive} hover:bg-gray-50`
                  }
                `}
              >
                {/* Step number */}
                <span className={`
                  flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${isActive ? 'bg-current text-white' : 'bg-gray-100 text-gray-400'}
                `}
                  style={isActive ? { backgroundColor: 'currentColor' } : {}}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-400'}>{idx + 1}</span>
                </span>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? colors.badge : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab tip */}
        <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Step {TABS.findIndex(t => t.key === activeTab) + 1}:</span>{' '}
            {currentTab.tip}
          </p>
        </div>

        {/* Search + Platform filter */}
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="form-input pl-9 py-2 w-full"
              placeholder="Search order ID, product, SKU…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="form-select py-2 text-sm"
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          >
            {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || platform) && (
            <button
              onClick={() => { setSearch(''); setPlatform(''); setPage(1); }}
              className="btn-ghost btn-sm text-gray-400 hover:text-gray-600 gap-1"
            >
              <XMarkIcon className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <div className="text-xs text-gray-400 self-center whitespace-nowrap ml-auto">
            {loading ? 'Loading…' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── Bulk action bar ──────────────────────────────────────── */}
        {someSelected && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 border-t border-primary-100 animate-fade-in">
            <span className="text-sm font-semibold text-primary-700">
              {selected.size} selected
            </span>
            <div className="flex gap-2 ml-auto flex-wrap">

              {/* Pending tab bulk actions */}
              {activeTab === 'pending' && (
                <button
                  onClick={handleBulkAccept} disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                >
                  {bulkAccepting ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckCircleIcon className="h-3.5 w-3.5" />}
                  {bulkAccepting ? 'Accepting…' : 'Accept All'}
                </button>
              )}

              {/* Accepted tab bulk actions */}
              {activeTab === 'accepted' && (
                <>
                  <button
                    onClick={handleBulkDownloadLabels} disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                  >
                    {bulkDownloadingLabels ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownTrayIcon className="h-3.5 w-3.5" />}
                    {bulkDownloadingLabels ? 'Downloading…' : 'Download Labels'}
                  </button>
                  <button
                    onClick={handleBulkMarkShipped} disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                  >
                    {bulkMarkingShipped ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <TruckIcon className="h-3.5 w-3.5" />}
                    {bulkMarkingShipped ? 'Marking Shipped…' : 'Mark All Shipped'}
                  </button>
                </>
              )}

              <button
                onClick={handleDeleteSelected} disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-60"
              >
                <TrashIcon className="h-3.5 w-3.5" /> Delete
              </button>
              <button onClick={() => setSelected(new Set())} disabled={isBusy} className="btn-ghost btn-sm text-gray-500">
                <XMarkIcon className="h-3.5 w-3.5" /> Deselect
              </button>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────── */}
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
                <th className="table-th hidden sm:table-cell">Amount</th>
                <th className="table-th hidden md:table-cell">Date</th>
                <th className="table-th">Action</th>
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
                    <td className="table-td hidden sm:table-cell"><div className="h-3 w-14 bg-gray-100 rounded" /></td>
                    <td className="table-td hidden md:table-cell"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-7 w-32 bg-gray-100 rounded-lg" /></td>
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <ShoppingBagIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">No {currentTab.label.toLowerCase()} orders</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activeTab === 'pending'
                        ? 'Click Sync to import latest orders from your platforms.'
                        : `Orders will appear here once they reach ${currentTab.label} status.`}
                    </p>
                    {activeTab === 'pending' && (
                      <button onClick={handleSync} disabled={syncing} className="mt-3 btn-secondary btn-sm">
                        <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing…' : 'Sync Now'}
                      </button>
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
                    <td className="table-td max-w-[180px]">
                      <p className="text-xs font-medium text-gray-900 truncate">{displayProduct}</p>
                    </td>
                    <td className="table-td hidden md:table-cell font-mono text-xs text-gray-500">{displaySku}</td>
                    <td className="table-td hidden sm:table-cell">
                      {order.platform ? (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${plt?.badge || 'bg-gray-100 text-gray-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${plt?.dot || 'bg-gray-400'}`} />
                          <span className="capitalize">{order.platform}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-td hidden sm:table-cell text-xs font-semibold text-gray-800">
                      {formatAmount(order.orderValue)}
                    </td>
                    <td className="table-td hidden md:table-cell text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(order.platformCreatedAt || order.createdAt)}
                    </td>

                    {/* ── Action column — changes per tab ── */}
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 justify-end">

                        {/* PENDING tab — Accept + Reject */}
                        {activeTab === 'pending' && (
                          isAccepting ? (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 px-2">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Accepting…
                            </span>
                          ) : rejectingId === order._id ? (
                            <span className="flex items-center gap-1.5 text-xs text-red-500 px-2">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Cancelling…
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAccept(order._id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm"
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => setRejectTarget(order)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Reject order"
                              >
                                <NoSymbolIcon className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )
                        )}

                        {/* ACCEPTED tab — Download Label + Mark Shipped + Cancel */}
                        {activeTab === 'accepted' && (
                          isConfirmingShipped ? (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 px-2">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Marking…
                            </span>
                          ) : rejectingId === order._id ? (
                            <span className="flex items-center gap-1.5 text-xs text-red-500 px-2">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Cancelling…
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleReprintLabel(order._id, order.orderId)}
                                disabled={isReprinting}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-semibold transition-colors disabled:opacity-60"
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
                                disabled={isReprinting}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                                title="Mark as shipped — notifies marketplace"
                              >
                                <TruckIcon className="h-3.5 w-3.5" /> Mark Shipped
                              </button>
                              <button
                                onClick={() => setRejectTarget(order)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Cancel order"
                              >
                                <NoSymbolIcon className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )
                        )}

                        {/* SHIPPED / DELIVERED / CANCELLED — view only */}
                        {(activeTab === 'shipped' || activeTab === 'delivered' || activeTab === 'cancelled') && (
                          <div className="flex items-center gap-2">
                            {order.awb && (
                              <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                {order.awb}
                              </span>
                            )}
                            <RowMenu onView={() => {}} onDelete={() => {}} />
                          </div>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────── */}
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
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${page === p ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && <span className="text-xs text-gray-400 px-1">…</span>}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject / Cancel modal ─────────────────────────────────── */}
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
