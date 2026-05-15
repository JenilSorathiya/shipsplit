import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DocumentArrowDownIcon, CalendarDaysIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  TruckIcon, ShoppingBagIcon, ArrowPathIcon, TagIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Platform style map ──────────────────────────────── */
const PLATFORM_STYLE = {
  amazon:   'bg-[#FF9900]/10 text-[#b36b00]',
  flipkart: 'bg-[#2874F0]/10 text-[#1857c7]',
  meesho:   'bg-[#F43397]/10 text-[#c41374]',
  myntra:   'bg-[#FF3F6C]/10 text-[#d0163e]',
};

const COURIER_COLORS = ['#2563eb','#16a34a','#ea580c','#9333ea','#0891b2','#ca8a04'];

const RANGE_OPTIONS = [
  { label: '7 days',  value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

/* ── Custom tooltip ──────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-modal border border-gray-100 px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-modal border border-gray-100 px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="text-gray-500 mt-0.5">{payload[0].value} shipments</p>
    </div>
  );
}

/* ── Summary stat card ───────────────────────────────── */
function SumCard({ label, value, sub, change, positive, icon: Icon, color, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          {loading
            ? <div className="mt-1.5 h-7 w-20 bg-gray-100 rounded animate-pulse" />
            : <p className="mt-1.5 text-2xl font-bold text-gray-900">{value ?? '—'}</p>}
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {change !== undefined && !loading && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${positive ? 'text-success-600' : 'text-red-500'}`}>
          {positive ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
          {Math.abs(change)}% vs previous period
        </div>
      )}
    </div>
  );
}

/* ── Skeleton rows ───────────────────────────────────── */
function SkeletonRows({ cols, rows = 4 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="table-td"><div className="h-3.5 bg-gray-100 rounded w-3/4" /></td>
      ))}
    </tr>
  ));
}

/* ── Main page ───────────────────────────────────────── */
export default function ReportsPage() {
  const [range, setRange] = useState('30d');

  const [summary,     setSummary]     = useState(null);
  const [dailyData,   setDailyData]   = useState([]);
  const [courierData, setCourierData] = useState([]);
  const [skuData,     setSkuData]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, dailyRes, courierRes, skuRes] = await Promise.allSettled([
        api.get('/reports/summary',           { params: { range } }),
        api.get('/reports/orders-by-day',     { params: { range } }),
        api.get('/reports/courier-breakdown', { params: { range } }),
        api.get('/reports/sku-breakdown',     { params: { range } }),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data?.summary ?? summaryRes.value.data ?? {});
      if (dailyRes.status   === 'fulfilled') setDailyData(dailyRes.value.data?.data   ?? dailyRes.value.data   ?? []);
      if (courierRes.status === 'fulfilled') setCourierData(courierRes.value.data?.data ?? courierRes.value.data ?? []);
      if (skuRes.status     === 'fulfilled') setSkuData(skuRes.value.data?.data       ?? skuRes.value.data     ?? []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const resp = await api.get('/reports/export.csv', {
        params: { range, type },
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `shipsplit-${type ?? 'orders'}-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  /* ── Derived values ──────────────────────────────────── */
  const pieData = courierData
    .slice(0, 6)
    .map((c, i) => ({ name: c.courier ?? c.name ?? c._id, value: c.shipments ?? c.count ?? 0, color: COURIER_COLORS[i] }));

  const totalShipments = pieData.reduce((s, c) => s + c.value, 0);
  const pieWithPct = pieData.map((c) => ({ ...c, pct: totalShipments ? Math.round((c.value / totalShipments) * 100) : 0 }));

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ── Header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-sub">Track performance across all platforms and couriers.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 gap-0.5">
            {RANGE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                  ${range === value ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SumCard
          label="Total Orders"
          value={summary?.totalOrders?.toLocaleString('en-IN')}
          loading={loading}
          icon={ShoppingBagIcon}
          color="bg-primary-50 text-primary-600"
        />
        <SumCard
          label="Labels Printed"
          value={summary?.labelsGenerated?.toLocaleString('en-IN')}
          loading={loading}
          icon={TagIcon}
          color="bg-success-50 text-success-600"
        />
        <SumCard
          label="Return Rate"
          value={summary?.returnRate != null ? `${summary.returnRate.toFixed(1)}%` : null}
          sub={summary?.totalReturns ? `${summary.totalReturns} returns` : undefined}
          loading={loading}
          icon={ArrowPathIcon}
          color="bg-warning-50 text-warning-600"
        />
        <SumCard
          label="Avg. Delivery"
          value={summary?.avgDeliveryDays != null ? `${summary.avgDeliveryDays} days` : null}
          sub="Across all couriers"
          loading={loading}
          icon={TruckIcon}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Main charts row ─────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Orders per day bar chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Orders Per Day</h3>
              <p className="text-xs text-gray-400 mt-0.5">Breakdown by platform</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {[['#FF9900','Amazon'],['#2874F0','Flipkart'],['#F43397','Meesho'],['#FF3F6C','Myntra']].map(([c, n]) => (
                <span key={n} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: c }} />
                  {n}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-[230px] bg-gray-50 rounded-xl animate-pulse" />
          ) : dailyData.length === 0 ? (
            <div className="h-[230px] flex items-center justify-center text-sm text-gray-400">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dailyData} barSize={10} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d?.slice(5)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="amazon"   fill="#FF9900" radius={[3,3,0,0]} name="Amazon" />
                <Bar dataKey="flipkart" fill="#2874F0" radius={[3,3,0,0]} name="Flipkart" />
                <Bar dataKey="meesho"   fill="#F43397" radius={[3,3,0,0]} name="Meesho" />
                <Bar dataKey="myntra"   fill="#FF3F6C" radius={[3,3,0,0]} name="Myntra" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Courier pie chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Courier Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Share of shipments</p>
          {loading ? (
            <div className="h-[180px] bg-gray-50 rounded-xl animate-pulse" />
          ) : pieWithPct.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieWithPct} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieWithPct.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieWithPct.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-gray-600">{c.name}</span>
                    </span>
                    <span className="font-semibold text-gray-800">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Exports ─────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Export Reports</h3>
        <p className="text-xs text-gray-400 mb-4">Download detailed CSV reports for the selected period.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Orders CSV',       sub: 'Raw order data with status',          type: 'orders'   },
            { label: 'Courier-wise CSV', sub: 'Delivery rates, ETAs, returns',       type: 'couriers' },
            { label: 'SKU-wise CSV',     sub: 'Product performance report',          type: 'sku'      },
            { label: 'Returns Report',   sub: 'Return reasons & patterns',           type: 'returns'  },
            { label: 'Summary Report',   sub: 'All platforms, all metrics',          type: 'summary'  },
            { label: 'Revenue Report',   sub: 'Platform-wise revenue split',         type: 'revenue'  },
          ].map(({ label, sub, type }) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              disabled={exporting}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group text-left w-full disabled:opacity-50"
            >
              <div className="h-9 w-9 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <DocumentArrowDownIcon className="h-4.5 w-4.5 text-gray-500 group-hover:text-primary-600 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700 transition-colors">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Courier performance table ──────────────── */}
      <div className="table-wrapper">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Courier Performance</h3>
          <p className="text-xs text-gray-400 mt-0.5">Delivery rate and average days to deliver</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-root">
            <thead className="table-head">
              <tr>
                <th className="table-th">Courier Partner</th>
                <th className="table-th">Total Shipments</th>
                <th className="table-th">Delivered</th>
                <th className="table-th">Returns</th>
                <th className="table-th">Delivery Rate</th>
                <th className="table-th">Avg. Days</th>
                <th className="table-th">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <SkeletonRows cols={7} /> : courierData.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No courier data for this period</td></tr>
              ) : courierData.map((row) => {
                const rate = row.deliveryRate ?? (row.delivered && row.shipments ? Math.round((row.delivered / row.shipments) * 100) : 0);
                const barColor = rate >= 95 ? '#16a34a' : rate >= 92 ? '#2563eb' : '#ea580c';
                return (
                  <tr key={row.courier ?? row._id} className="table-row">
                    <td className="table-td"><span className="font-semibold text-gray-900">{row.courier ?? row._id}</span></td>
                    <td className="table-td tabular-nums">{(row.shipments ?? 0).toLocaleString('en-IN')}</td>
                    <td className="table-td tabular-nums text-success-700 font-medium">{(row.delivered ?? 0).toLocaleString('en-IN')}</td>
                    <td className="table-td tabular-nums text-red-600">{row.returns ?? 0}</td>
                    <td className="table-td">
                      <span className={`font-semibold ${rate >= 95 ? 'text-success-700' : rate >= 92 ? 'text-primary-700' : 'text-warning-700'}`}>
                        {rate}%
                      </span>
                    </td>
                    <td className="table-td tabular-nums">{row.avgDays ?? '—'} {row.avgDays ? 'days' : ''}</td>
                    <td className="table-td min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, background: barColor }} />
                        </div>
                        <span className="text-2xs text-gray-400 w-8">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top SKU table ──────────────────────────── */}
      <div className="table-wrapper">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Top SKUs by Volume</h3>
            <p className="text-xs text-gray-400 mt-0.5">Best performing products this period</p>
          </div>
          <button onClick={() => handleExport('sku')} disabled={exporting} className="btn-secondary btn-sm gap-1.5 disabled:opacity-50">
            <DocumentArrowDownIcon className="h-3.5 w-3.5" />
            Export SKU CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-root">
            <thead className="table-head">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">SKU</th>
                <th className="table-th">Product Name</th>
                <th className="table-th">Platform</th>
                <th className="table-th">Orders</th>
                <th className="table-th">Returns</th>
                <th className="table-th">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <SkeletonRows cols={7} /> : skuData.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No SKU data for this period</td></tr>
              ) : skuData.map((row, i) => (
                <tr key={row.sku ?? i} className="table-row">
                  <td className="table-td text-xs font-bold text-gray-400">#{i + 1}</td>
                  <td className="table-td font-mono text-xs font-semibold text-gray-800">{row.sku ?? '—'}</td>
                  <td className="table-td text-xs text-gray-700 max-w-[180px]">
                    <span className="truncate block">{row.product ?? row.name ?? '—'}</span>
                  </td>
                  <td className="table-td">
                    {row.platform ? (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md capitalize ${PLATFORM_STYLE[row.platform] ?? 'bg-gray-100 text-gray-600'}`}>
                        {row.platform}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-td font-semibold tabular-nums">{(row.orders ?? row.count ?? 0).toLocaleString('en-IN')}</td>
                  <td className="table-td tabular-nums text-red-600 text-xs">{row.returns ?? 0}</td>
                  <td className="table-td font-semibold text-success-700">
                    {row.revenue != null ? `₹${Number(row.revenue).toLocaleString('en-IN')}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
