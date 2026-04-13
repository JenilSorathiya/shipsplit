import { useState } from 'react';
import { useOrders, useDeleteOrder } from '../../hooks/useOrders';
import { formatDate, getPlatformColor, getOrderStatusBadge, truncate } from '../../utils/helpers';
import { TrashIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const PLATFORMS = ['all', 'amazon', 'flipkart', 'meesho', 'myntra'];
const STATUSES = ['all', 'pending', 'processed', 'label_generated', 'shipped', 'delivered', 'returned', 'cancelled'];

export default function OrderList() {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const params = {
    ...(search && { search }),
    ...(platform !== 'all' && { platform }),
    ...(status !== 'all' && { status }),
    page,
    limit: 20,
  };

  const { data, isLoading } = useOrders(params);
  const deleteOrder = useDeleteOrder();
  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search order ID, AWB…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-auto" value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }}>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p === 'all' ? 'All platforms' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Order ID</th>
                <th className="table-th">Platform</th>
                <th className="table-th">AWB</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Status</th>
                <th className="table-th">Date</th>
                <th className="table-th w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="table-td text-center text-gray-400 py-12">Loading orders…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="table-td text-center text-gray-400 py-12">No orders found</td></tr>
              ) : orders.map((order) => {
                const pc = getPlatformColor(order.platform);
                return (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-xs font-medium text-gray-900">{order.orderId}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${pc.bg} ${pc.text}`}>
                        {order.platform.charAt(0).toUpperCase() + order.platform.slice(1)}
                      </span>
                    </td>
                    <td className="table-td font-mono text-xs">{order.awb || '—'}</td>
                    <td className="table-td">{truncate(order.customerName, 22)}</td>
                    <td className="table-td">
                      <span className={getOrderStatusBadge(order.status)}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td text-gray-400">{formatDate(order.createdAt)}</td>
                    <td className="table-td">
                      <button
                        onClick={() => deleteOrder.mutate(order._id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{total} orders total</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-xs text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
