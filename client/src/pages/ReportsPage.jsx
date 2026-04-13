import { useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DocumentArrowDownIcon, CalendarDaysIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  TruckIcon, ShoppingBagIcon, ArrowPathIcon, TagIcon,
} from '@heroicons/react/24/outline';

/* ── Mock data ─────────────────────────────────────────── */
const DAILY_DATA = [
  { date: 'Apr 1',  amazon: 42, flipkart: 28, meesho: 19, myntra: 11 },
  { date: 'Apr 2',  amazon: 55, flipkart: 34, meesho: 25, myntra: 14 },
  { date: 'Apr 3',  amazon: 38, flipkart: 22, meesho: 16, myntra:  9 },
  { date: 'Apr 4',  amazon: 67, flipkart: 41, meesho: 31, myntra: 18 },
  { date: 'Apr 5',  amazon: 84, flipkart: 52, meesho: 38, myntra: 22 },
  { date: 'Apr 6',  amazon: 91, flipkart: 58, meesho: 44, myntra: 25 },
  { date: 'Apr 7',  amazon: 73, flipkart: 47, meesho: 35, myntra: 20 },
  { date: 'Apr 8',  amazon: 62, flipkart: 39, meesho: 28, myntra: 17 },
  { date: 'Apr 9',  amazon: 78, flipkart: 49, meesho: 36, myntra: 21 },
  { date: 'Apr 10', amazon: 89, flipkart: 55, meesho: 41, myntra: 24 },
];

const COURIER_PIE = [
  { name: 'Delhivery',  value: 38, color: '#2563eb' },
  { name: 'Shiprocket', value: 24, color: '#16a34a' },
  { name: 'BlueDart',   value: 18, color: '#ea580c' },
  { name: 'DTDC',       value: 12, color: '#9333ea' },
  { name: 'Ekart',      value:  8, color: '#0891b2' },
];

const SKU_DATA = [
  { sku: 'KRT-NB-XL', product: 'Cotton Kurta Set XL',       platform: 'amazon',   orders: 342, returns: 12, revenue: '₹1,02,258' },
  { sku: 'SHO-MR-42', product: "Men's Running Shoes Sz 42", platform: 'flipkart', orders: 287, returns:  8, revenue: '₹85,913'  },
  { sku: 'SAR-FP-OS', product: 'Floral Printed Saree OS',   platform: 'meesho',   orders: 251, returns: 22, revenue: '₹75,299'  },
  { sku: 'JNS-DB-32', product: 'Slim Fit Jeans Dark Blue',  platform: 'myntra',   orders: 198, returns:  6, revenue: '₹69,300'  },
  { sku: 'BTL-SS-1L', product: 'Stainless Steel Bottle 1L', platform: 'amazon',   orders: 176, returns:  4, revenue: '₹52,624'  },
  { sku: 'DRS-WF-M',  product: "Women's Floral Dress M",    platform: 'flipkart', orders: 154, returns: 11, revenue: '₹46,200'  },
];

const COURIER_TABLE = [
  { courier: 'Delhivery',  shipments: 4381, delivered: 4102, returns: 127, rate: '93.7%', avgDays: 2.8 },
  { courier: 'Shiprocket', shipments: 2764, delivered: 2530, returns:  98, rate: '91.5%', avgDays: 3.2 },
  { courier: 'BlueDart',   shipments: 2073, delivered: 1981, returns:  42, rate: '95.6%', avgDays: 1.9 },
  { courier: 'DTDC',       shipments: 1382, delivered: 1244, returns:  76, rate: '90.0%', avgDays: 3.7 },
  { courier: 'Ekart',      shipments:  921, delivered:  842, returns:  38, rate: '91.4%', avgDays: 3.1 },
];

const PLATFORM_STYLE = {
  amazon:   'bg-[#FF9900]/10 text-[#b36b00]',
  flipkart: 'bg-[#2874F0]/10 text-[#1857c7]',
  meesho:   'bg-[#F43397]/10 text-[#c41374]',
  myntra:   'bg-[#FF3F6C]/10 text-[#d0163e]',
};

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
      <p className="text-gray-500 mt-0.5">{payload[0].value}% of shipments</p>
    </div>
  );
}

/* ── Summary stat card ───────────────────────────────── */
function SumCard({ label, value, sub, change, positive, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {change !== undefined && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${positive ? 'text-success-600' : 'text-red-500'}`}>
          {positive ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
          {change}% vs previous period
        </div>
      )}
    </div>
  );
}

/* ── Export button ───────────────────────────────────── */
function ExportBtn({ label, sub }) {
  return (
    <button className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group text-left w-full">
      <div className="h-9 w-9 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
        <DocumentArrowDownIcon className="h-4.5 w-4.5 text-gray-500 group-hover:text-primary-600 transition-colors" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700 transition-colors">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </button>
  );
}

/* ── Main page ───────────────────────────────────────── */
export default function ReportsPage() {
  const [range, setRange] = useState('30d');

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ── Header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-sub">Track performance across all platforms and couriers.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range picker */}
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
          <button className="btn-secondary btn-sm gap-1.5">
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            Custom Range
          </button>
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SumCard label="Total Orders"    value="11,521"  sub="Apr 1–10" change={12.4} positive={true}  icon={ShoppingBagIcon}      color="bg-primary-50 text-primary-600" />
        <SumCard label="Labels Printed"  value="10,847"  sub="94.1% coverage" change={9.8}  positive={true}  icon={TagIcon}              color="bg-success-50 text-success-600" />
        <SumCard label="Return Rate"     value="3.2%"    sub="368 returns"    change={0.4}  positive={false} icon={ArrowPathIcon}        color="bg-warning-50 text-warning-600" />
        <SumCard label="Avg. Delivery"   value="2.9 days" sub="Across all couriers"         icon={TruckIcon}            color="bg-purple-50 text-purple-600" />
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
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={DAILY_DATA} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="amazon"   fill="#FF9900" radius={[3,3,0,0]} name="Amazon" />
              <Bar dataKey="flipkart" fill="#2874F0" radius={[3,3,0,0]} name="Flipkart" />
              <Bar dataKey="meesho"   fill="#F43397" radius={[3,3,0,0]} name="Meesho" />
              <Bar dataKey="myntra"   fill="#FF3F6C" radius={[3,3,0,0]} name="Myntra" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Courier pie chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Courier Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Share of shipments</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={COURIER_PIE}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {COURIER_PIE.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {COURIER_PIE.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-gray-600">{c.name}</span>
                </span>
                <span className="font-semibold text-gray-800">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Exports ─────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Export Reports</h3>
        <p className="text-xs text-gray-400 mb-4">Download detailed CSV reports for the selected period.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ExportBtn label="Summary Report"    sub="All platforms, all metrics" />
          <ExportBtn label="Courier-wise CSV"  sub="Delivery rates, ETAs, returns" />
          <ExportBtn label="SKU-wise CSV"      sub="Product performance report" />
          <ExportBtn label="Orders CSV"        sub="Raw order data with status" />
          <ExportBtn label="Returns Report"    sub="Return reasons & patterns" />
          <ExportBtn label="Revenue Report"    sub="Platform-wise revenue split" />
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
              {COURIER_TABLE.map((row) => {
                const rate = parseFloat(row.rate);
                const barColor = rate >= 95 ? '#16a34a' : rate >= 92 ? '#2563eb' : '#ea580c';
                return (
                  <tr key={row.courier} className="table-row">
                    <td className="table-td">
                      <span className="font-semibold text-gray-900">{row.courier}</span>
                    </td>
                    <td className="table-td tabular-nums">{row.shipments.toLocaleString('en-IN')}</td>
                    <td className="table-td tabular-nums text-success-700 font-medium">{row.delivered.toLocaleString('en-IN')}</td>
                    <td className="table-td tabular-nums text-red-600">{row.returns}</td>
                    <td className="table-td">
                      <span className={`font-semibold ${rate >= 95 ? 'text-success-700' : rate >= 92 ? 'text-primary-700' : 'text-warning-700'}`}>
                        {row.rate}
                      </span>
                    </td>
                    <td className="table-td tabular-nums">{row.avgDays} days</td>
                    <td className="table-td min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: row.rate, background: barColor }} />
                        </div>
                        <span className="text-2xs text-gray-400 w-8">{row.rate}</span>
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
          <button className="btn-secondary btn-sm gap-1.5">
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
              {SKU_DATA.map((row, i) => (
                <tr key={row.sku} className="table-row">
                  <td className="table-td text-xs font-bold text-gray-400">#{i + 1}</td>
                  <td className="table-td font-mono text-xs font-semibold text-gray-800">{row.sku}</td>
                  <td className="table-td text-xs text-gray-700 max-w-[180px]">
                    <span className="truncate block">{row.product}</span>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md capitalize ${PLATFORM_STYLE[row.platform]}`}>
                      {row.platform}
                    </span>
                  </td>
                  <td className="table-td font-semibold tabular-nums">{row.orders.toLocaleString('en-IN')}</td>
                  <td className="table-td tabular-nums text-red-600 text-xs">{row.returns}</td>
                  <td className="table-td font-semibold text-success-700">{row.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
