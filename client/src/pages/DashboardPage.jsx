import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBagIcon, TagIcon, TruckIcon, CurrencyRupeeIcon,
  ArrowUpIcon, ArrowDownIcon, ArrowPathIcon, DocumentArrowDownIcon,
  EllipsisHorizontalIcon, ArrowTrendingUpIcon,
  CheckCircleIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Placeholder chart data (no analytics API yet) ───── */
const CHART_DATA = [
  { day: 'Mon', orders: 0, labels: 0 },
  { day: 'Tue', orders: 0, labels: 0 },
  { day: 'Wed', orders: 0, labels: 0 },
  { day: 'Thu', orders: 0, labels: 0 },
  { day: 'Fri', orders: 0, labels: 0 },
  { day: 'Sat', orders: 0, labels: 0 },
  { day: 'Sun', orders: 0, labels: 0 },
];

const PLATFORM_DOT = {
  amazon:   'bg-[#FF9900]',
  flipkart: 'bg-[#2874F0]',
  meesho:   'bg-[#F43397]',
  myntra:   'bg-[#FF3F6C]',
};

const STATUS_CONFIG = {
  pending:         { label: 'Pending',         cls: 'badge-orange' },
  processing:      { label: 'Processing',      cls: 'badge-blue'   },
  label_generated: { label: 'Label Generated', cls: 'badge-blue'   },
  shipped:         { label: 'Shipped',         cls: 'badge-green'  },
  delivered:       { label: 'Delivered',       cls: 'badge-green'  },
  returned:        { label: 'Returned',        cls: 'badge-red'    },
  cancelled:       { label: 'Cancelled',       cls: 'badge-red'    },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'badge-gray' };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatCard({ title, value, sub, icon: Icon, iconBg, iconColor, onClick, loading }) {
  return (
    <button onClick={onClick} className="stat-card text-left w-full group">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">
          {loading ? <span className="inline-block h-6 w-16 bg-gray-100 rounded animate-pulse" /> : value}
        </p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
      <div className={`h-11 w-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        <Icon className={`h-5.5 w-5.5 ${iconColor}`} />
      </div>
    </button>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-modal border border-gray-100 px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [syncing, setSyncing] = useState(false);

  /* ── Data state ──────────────────────────────────────── */
  const [recentOrders,  setRecentOrders]  = useState([]);
  const [totalOrders,   setTotalOrders]   = useState(null);
  const [pendingCount,  setPendingCount]  = useState(null);
  const [shippedCount,  setShippedCount]  = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(true);

  const loadData = async () => {
    setStatsLoading(true);
    try {
      const [recentRes, pendingRes, shippedRes] = await Promise.all([
        api.get('/orders', { params: { limit: 7, sortBy: 'createdAt', sortOrder: 'desc' } }),
        api.get('/orders', { params: { limit: 1, status: 'pending' } }),
        api.get('/orders', { params: { limit: 1, status: 'shipped'  } }),
      ]);
      setRecentOrders(Array.isArray(recentRes.data) ? recentRes.data : []);
      setTotalOrders(recentRes.meta?.total ?? recentRes.data?.length ?? 0);
      setPendingCount(pendingRes.meta?.total ?? 0);
      setShippedCount(shippedRes.meta?.total ?? 0);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  /* ── Sync handler ────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/platforms/amazon/sync', { daysAgo: 30 });
      toast.success(`Synced — ${data?.imported ?? 0} new, ${data?.updated ?? 0} updated`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening across your platforms today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/dashboard/label-generator')}
            className="btn-primary btn-sm gap-1.5"
          >
            <TagIcon className="h-3.5 w-3.5" />
            Generate Labels
          </button>
          <button className="btn-secondary btn-sm gap-1.5">
            <DocumentArrowDownIcon className="h-3.5 w-3.5" />
            Download CSV
          </button>
          <button onClick={handleSync} disabled={syncing} className="btn-secondary btn-sm gap-1.5">
            <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Orders'}
          </button>
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={totalOrders ?? '—'}
          loading={statsLoading}
          icon={ShoppingBagIcon}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
          onClick={() => navigate('/dashboard/orders')}
        />
        <StatCard
          title="Pending"
          value={pendingCount ?? '—'}
          sub={pendingCount ? 'Needs label' : undefined}
          loading={statsLoading}
          icon={TagIcon}
          iconBg="bg-warning-50"
          iconColor="text-warning-600"
          onClick={() => navigate('/dashboard/label-generator')}
        />
        <StatCard
          title="Shipped"
          value={shippedCount ?? '—'}
          loading={statsLoading}
          icon={TruckIcon}
          iconBg="bg-success-50"
          iconColor="text-success-600"
        />
        <StatCard
          title="Revenue"
          value="—"
          sub="Analytics coming soon"
          loading={false}
          icon={CurrencyRupeeIcon}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* ── Chart + status row ───────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Orders This Week</h3>
              <p className="text-xs text-gray-400 mt-0.5">Chart analytics coming soon</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary-500 block" />Orders</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success-500 block" />Labels</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={CHART_DATA} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="orders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="labels" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} fill="url(#orders)" dot={false} />
              <Area type="monotone" dataKey="labels"  stroke="#16a34a" strokeWidth={2} fill="url(#labels)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status overview */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Order Status</h3>
          <div className="space-y-3.5">
            {[
              { label: 'Pending',   value: pendingCount,  icon: ClockIcon,       color: 'text-warning-600', bg: 'bg-warning-50' },
              { label: 'Shipped',   value: shippedCount,  icon: TruckIcon,       color: 'text-primary-600', bg: 'bg-primary-50' },
              { label: 'Total',     value: totalOrders,   icon: ShoppingBagIcon, color: 'text-gray-600',    bg: 'bg-gray-50'    },
              { label: 'Delivered', value: null,          icon: CheckCircleIcon, color: 'text-success-600', bg: 'bg-success-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4.5 w-4.5 ${color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
                <p className="text-base font-bold text-gray-900 tabular-nums">
                  {statsLoading
                    ? <span className="inline-block h-4 w-8 bg-gray-100 rounded animate-pulse" />
                    : (value ?? '—')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent orders table ──────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest orders across all platforms</p>
          </div>
          <button onClick={() => navigate('/dashboard/orders')} className="btn-secondary btn-sm">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-root">
            <thead className="table-head">
              <tr>
                <th className="table-th">Order ID</th>
                <th className="table-th">Product</th>
                <th className="table-th hidden sm:table-cell">Platform</th>
                <th className="table-th hidden md:table-cell">Courier</th>
                <th className="table-th">Status</th>
                <th className="table-th hidden sm:table-cell">Date</th>
                <th className="table-th w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    <td className="table-td"><div className="h-3 w-28 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-3 w-40 bg-gray-100 rounded" /></td>
                    <td className="table-td hidden sm:table-cell"><div className="h-3 w-16 bg-gray-100 rounded" /></td>
                    <td className="table-td hidden md:table-cell"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-5 w-16 bg-gray-100 rounded-md" /></td>
                    <td className="table-td hidden sm:table-cell"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td" />
                  </tr>
                ))
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <ShoppingBagIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">No orders yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click <strong>Sync Orders</strong> to import from your connected platforms.</p>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order._id} className="table-row">
                    <td className="table-td font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">
                      {order.orderId || order._id}
                    </td>
                    <td className="table-td max-w-[140px] sm:max-w-[180px]">
                      <p className="truncate text-gray-900 font-medium text-xs">
                        {order.productName || order.items?.[0]?.name || '—'}
                      </p>
                    </td>
                    <td className="table-td hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT[order.platform] || 'bg-gray-400'}`} />
                        <span className="capitalize">{order.platform}</span>
                      </span>
                    </td>
                    <td className="table-td hidden md:table-cell text-xs text-gray-600 capitalize">
                      {order.courierPartner || '—'}
                    </td>
                    <td className="table-td"><StatusBadge status={order.status} /></td>
                    <td className="table-td hidden sm:table-cell text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(order.platformCreatedAt || order.createdAt)}
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => navigate('/dashboard/orders')}
                        className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <EllipsisHorizontalIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
