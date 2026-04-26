import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBagIcon, TagIcon, TruckIcon, CurrencyRupeeIcon,
  ArrowUpIcon, ArrowDownIcon, ArrowPathIcon, DocumentArrowDownIcon,
  PlusIcon, EllipsisHorizontalIcon, ArrowTrendingUpIcon,
  CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ── Mock data ────────────────────────────────────────── */
const CHART_DATA = [
  { day: 'Mon', orders: 42, labels: 38 },
  { day: 'Tue', orders: 67, labels: 61 },
  { day: 'Wed', orders: 55, labels: 49 },
  { day: 'Thu', orders: 89, labels: 82 },
  { day: 'Fri', orders: 134, labels: 128 },
  { day: 'Sat', orders: 156, labels: 149 },
  { day: 'Sun', orders: 98, labels: 91 },
];

const RECENT_ORDERS = [
  { id: 'AMZ-406-7823941', product: 'Cotton Kurta Set - Navy Blue XL', sku: 'KRT-NB-XL', platform: 'amazon',   courier: 'Delhivery', status: 'pending',    date: '10 Apr 2026' },
  { id: 'FK-OD-21945678',  product: "Men's Running Shoes - Size 42",  sku: 'SHO-MR-42', platform: 'flipkart', courier: 'Ekart',     status: 'shipped',    date: '10 Apr 2026' },
  { id: 'MSO-28-8834512',  product: 'Floral Printed Saree - Peach',   sku: 'SAR-FP-OS', platform: 'meesho',   courier: 'Shiprocket',status: 'processing', date: '09 Apr 2026' },
  { id: 'MYN-1029384756',  product: 'Slim Fit Jeans - Dark Blue 32',  sku: 'JNS-DB-32', platform: 'myntra',   courier: 'BlueDart',  status: 'delivered',  date: '09 Apr 2026' },
  { id: 'AMZ-406-7812340', product: 'Stainless Steel Water Bottle 1L', sku: 'BTL-SS-1L', platform: 'amazon',   courier: 'Delhivery', status: 'pending',    date: '09 Apr 2026' },
  { id: 'FK-OD-21987654',  product: "Women's Floral Dress - Size M",  sku: 'DRS-WF-M',  platform: 'flipkart', courier: 'Ekart',     status: 'returned',   date: '08 Apr 2026' },
  { id: 'MSO-28-9921334',  product: 'Bamboo Cutting Board Set',       sku: 'CBD-BM-ST', platform: 'meesho',   courier: 'DTDC',      status: 'shipped',    date: '08 Apr 2026' },
];

const PLATFORM_PERF = [
  { name: 'Amazon',   orders: 4821, share: 42, color: '#FF9900', bg: 'bg-[#FF9900]' },
  { name: 'Flipkart', orders: 3104, share: 27, color: '#2874F0', bg: 'bg-[#2874F0]' },
  { name: 'Meesho',   orders: 2287, share: 20, color: '#F43397', bg: 'bg-[#F43397]' },
  { name: 'Myntra',   orders: 1244, share: 11, color: '#FF3F6C', bg: 'bg-[#FF3F6C]' },
];

/* ── Status badge ─────────────────────────────────────── */
const STATUS_CONFIG = {
  pending:    { label: 'Pending',    cls: 'badge-orange', dot: 'bg-warning-500' },
  processing: { label: 'Processing', cls: 'badge-blue',   dot: 'bg-primary-500' },
  shipped:    { label: 'Shipped',    cls: 'badge-green',  dot: 'bg-success-500' },
  delivered:  { label: 'Delivered',  cls: 'badge-green',  dot: 'bg-success-600' },
  returned:   { label: 'Returned',   cls: 'badge-red',    dot: 'bg-red-500' },
};

const PLATFORM_DOT = {
  amazon:   'bg-[#FF9900]',
  flipkart: 'bg-[#2874F0]',
  meesho:   'bg-[#F43397]',
  myntra:   'bg-[#FF3F6C]',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'badge-gray' };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

/* ── Stat card ────────────────────────────────────────── */
function StatCard({ title, value, sub, change, positive, icon: Icon, iconBg, iconColor, onClick }) {
  return (
    <button onClick={onClick} className="stat-card text-left w-full group">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {change !== undefined && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className={`inline-flex items-center text-xs font-semibold ${positive ? 'text-success-600' : 'text-red-500'}`}>
              {positive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
              {change}%
            </span>
            <span className="text-xs text-gray-400">vs last week</span>
          </div>
        )}
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
      <div className={`h-11 w-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        <Icon className={`h-5.5 w-5.5 ${iconColor}`} />
      </div>
    </button>
  );
}

/* ── Custom tooltip for chart ─────────────────────────── */
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

/* ── Main page ────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
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
        {/* Quick actions */}
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
          value="11,456"
          change={12.4}
          positive={true}
          icon={ShoppingBagIcon}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
          onClick={() => navigate('/dashboard/orders')}
        />
        <StatCard
          title="Pending Labels"
          value="243"
          sub="Needs attention"
          icon={TagIcon}
          iconBg="bg-warning-50"
          iconColor="text-warning-600"
          onClick={() => navigate('/dashboard/label-generator')}
        />
        <StatCard
          title="Shipped Today"
          value="89"
          change={8.2}
          positive={true}
          icon={TruckIcon}
          iconBg="bg-success-50"
          iconColor="text-success-600"
        />
        <StatCard
          title="Monthly Revenue"
          value="₹8.4L"
          change={3.1}
          positive={false}
          icon={CurrencyRupeeIcon}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* ── Alert banner ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-warning-50 border border-warning-200 rounded-xl">
        <div className="flex items-center gap-3 flex-1">
          <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 flex-shrink-0" />
          <p className="text-sm text-warning-800">
            <span className="font-semibold">243 orders</span> have pending labels — generate and download before dispatch.
          </p>
        </div>
        <button onClick={() => navigate('/dashboard/label-generator')} className="btn-warning btn-sm flex-shrink-0 text-xs self-start sm:self-auto">
          Generate Now
        </button>
      </div>

      {/* ── Chart + platform breakdown ───────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Orders This Week</h3>
              <p className="text-xs text-gray-400 mt-0.5">Orders & labels generated per day</p>
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
              <Area type="monotone" dataKey="labels" stroke="#16a34a" strokeWidth={2} fill="url(#labels)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Platform breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Platform Split</h3>
          <div className="space-y-3.5">
            {PLATFORM_PERF.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.bg}`} />
                    <span className="font-medium text-gray-700">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{p.orders.toLocaleString('en-IN')}</span>
                    <span className="text-gray-400 ml-1 text-xs">{p.share}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.share}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Summary donut */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total this month</p>
              <p className="text-lg font-bold text-gray-900">11,456</p>
            </div>
            <div className="flex items-center gap-1 text-success-600 text-sm font-semibold">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              +12.4%
            </div>
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
              {RECENT_ORDERS.map((order) => (
                <tr key={order.id} className="table-row">
                  <td className="table-td font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">{order.id}</td>
                  <td className="table-td max-w-[140px] sm:max-w-[180px]">
                    <p className="truncate text-gray-900 font-medium text-xs">{order.product}</p>
                  </td>
                  <td className="table-td hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT[order.platform]}`} />
                      <span className="capitalize">{order.platform}</span>
                    </span>
                  </td>
                  <td className="table-td hidden md:table-cell text-xs text-gray-600">{order.courier}</td>
                  <td className="table-td"><StatusBadge status={order.status} /></td>
                  <td className="table-td hidden sm:table-cell text-xs text-gray-400 whitespace-nowrap">{order.date}</td>
                  <td className="table-td">
                    <button className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                      <EllipsisHorizontalIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Status overview row ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'To Process',  value: 243,  icon: ClockIcon,         color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'In Transit',  value: 1847, icon: TruckIcon,         color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Delivered',   value: 8932, icon: CheckCircleIcon,   color: 'text-success-600', bg: 'bg-success-50' },
          { label: 'Returned',    value: 312,  icon: ArrowPathIcon,     color: 'text-red-600',     bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
