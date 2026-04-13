import { useState } from 'react';
import { useLabels, useDownloadLabels } from '../../hooks/useLabels';
import { formatDate, getPlatformColor, truncate } from '../../utils/helpers';
import { ArrowDownTrayIcon, CheckIcon } from '@heroicons/react/24/outline';

const STATUS_BADGE = {
  pending:    'badge-yellow',
  processing: 'badge-blue',
  ready:      'badge-green',
  downloaded: 'badge-gray',
  failed:     'badge-red',
};

export default function LabelList() {
  const [selected, setSelected] = useState(new Set());
  const [platform, setPlatform] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLabels({ ...(platform !== 'all' && { platform }), page, limit: 20 });
  const download = useDownloadLabels();
  const labels = data?.labels || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selected.size === labels.length) setSelected(new Set());
    else setSelected(new Set(labels.map((l) => l._id)));
  };

  const handleDownload = () => {
    const ids = selected.size > 0 ? [...selected] : labels.filter((l) => l.status === 'ready').map((l) => l._id);
    if (ids.length === 0) return;
    download.mutate({ ids, config: { pageSize: 'A4', labelsPerPage: 4 } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input w-auto" value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }}>
          {['all', 'amazon', 'flipkart', 'meesho', 'myntra'].map((p) => (
            <option key={p} value={p}>{p === 'all' ? 'All platforms' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <div className="flex-1" />
        {(selected.size > 0 || labels.some((l) => l.status === 'ready')) && (
          <button onClick={handleDownload} disabled={download.isPending} className="btn-primary">
            <ArrowDownTrayIcon className="h-4 w-4" />
            {download.isPending ? 'Downloading…' : selected.size > 0 ? `Download ${selected.size} selected` : 'Download ready labels'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th w-10">
                  <input type="checkbox" checked={selected.size === labels.length && labels.length > 0} onChange={toggleAll} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                </th>
                <th className="table-th">Order ID</th>
                <th className="table-th">AWB</th>
                <th className="table-th">Platform</th>
                <th className="table-th">Status</th>
                <th className="table-th">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-12">Loading…</td></tr>
              ) : labels.length === 0 ? (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-12">No labels yet</td></tr>
              ) : labels.map((label) => {
                const pc = getPlatformColor(label.platform);
                return (
                  <tr key={label._id} className={`hover:bg-gray-50 transition-colors ${selected.has(label._id) ? 'bg-brand-50' : ''}`}>
                    <td className="table-td">
                      <input type="checkbox" checked={selected.has(label._id)} onChange={() => toggleSelect(label._id)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    </td>
                    <td className="table-td font-mono text-xs font-medium">{label.orderId}</td>
                    <td className="table-td font-mono text-xs">{label.awb || '—'}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${pc.bg} ${pc.text}`}>
                        {label.platform.charAt(0).toUpperCase() + label.platform.slice(1)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={STATUS_BADGE[label.status] || 'badge-gray'}>{label.status}</span>
                    </td>
                    <td className="table-td text-gray-400">{formatDate(label.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{total} labels total</p>
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
