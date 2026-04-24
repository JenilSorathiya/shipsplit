import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon, ChevronRightIcon, ChevronLeftIcon, TagIcon,
  DocumentArrowDownIcon, EyeIcon, Cog6ToothIcon,
  TruckIcon, ShoppingBagIcon, QrCodeIcon, IdentificationIcon,
  ArrowPathIcon, InformationCircleIcon, CloudArrowUpIcon,
  ScissorsIcon, ArchiveBoxIcon, DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import api from '../utils/api';

/* ══════════════════════════════════════════════════════
   Upload & Split Labels Section
══════════════════════════════════════════════════════ */

const PLATFORMS = [
  { id: 'amazon',   label: 'Amazon',   color: 'text-[#b36b00]',  bg: 'bg-[#FF9900]/10', activeBg: 'bg-[#FF9900]',  activeText: 'text-white' },
  { id: 'flipkart', label: 'Flipkart', color: 'text-[#1857c7]',  bg: 'bg-[#2874F0]/10', activeBg: 'bg-[#2874F0]',  activeText: 'text-white' },
  { id: 'meesho',   label: 'Meesho',   color: 'text-[#c41374]',  bg: 'bg-[#F43397]/10', activeBg: 'bg-[#F43397]',  activeText: 'text-white' },
  { id: 'myntra',   label: 'Myntra',   color: 'text-[#d0163e]',  bg: 'bg-[#FF3F6C]/10', activeBg: 'bg-[#FF3F6C]',  activeText: 'text-white' },
];

const COURIER_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700', 'bg-yellow-100 text-yellow-700',
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadSplitSection() {
  const [platform,   setPlatform]   = useState('amazon');
  const [file,       setFile]       = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const fileInputRef = useRef(null);

  /* ── File selection helpers ─────────────────────────── */
  const acceptFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File too large — maximum 50 MB.');
      return;
    }
    setError(null);
    setResult(null);
    setProgress(0);
    setFile(f);
  };

  const onFileChange = (e) => acceptFile(e.target.files?.[0]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Upload handler ─────────────────────────────────── */
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('labelPDF', file);
      formData.append('platform', platform);

      const { data } = await api.post('/labels/split-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.min(90, Math.round((e.loaded * 90) / e.total)));
        },
      });
      setProgress(100);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  /* ── Download handler ───────────────────────────────── */
  const handleDownload = async (type) => {
    if (!result?.splitId) return;
    try {
      const response = await api.get(
        `/labels/split-download/${result.splitId}?type=${type}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `shipsplit_${type}_labels.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Download failed. The split may have expired — please re-upload.');
    }
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <ScissorsIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Upload &amp; Split Labels</h2>
          <p className="text-xs text-primary-100">Auto-detect couriers &amp; products from your bulk PDF</p>
        </div>
        <span className="ml-auto badge bg-white/20 text-white border-transparent text-xs px-2.5 py-1 rounded-full font-semibold">
          New
        </span>
      </div>

      <div className="p-6 space-y-5">

        {/* Platform tabs */}
        <div>
          <label className="form-label text-gray-700 font-semibold mb-2 block">
            Platform
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const active = platform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150
                    ${active
                      ? `${p.activeBg} ${p.activeText} border-transparent shadow-sm`
                      : `${p.bg} ${p.color} border-transparent hover:border-current/20`
                    }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drop zone */}
        {!file ? (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed
              cursor-pointer transition-all duration-200
              ${dragging
                ? 'border-primary-400 bg-primary-50 scale-[1.01]'
                : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50/60 bg-white'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors
              ${dragging ? 'bg-primary-100' : 'bg-gray-100'}`}>
              <CloudArrowUpIcon className={`h-7 w-7 ${dragging ? 'text-primary-600' : 'text-gray-400'}`} />
            </div>
            <div className="text-center">
              <p className={`text-sm font-semibold ${dragging ? 'text-primary-600' : 'text-gray-700'}`}>
                {dragging ? 'Drop your PDF here' : 'Drop your bulk label PDF here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">or <span className="text-primary-600 font-medium">click to browse</span></p>
              <p className="text-2xs text-gray-300 mt-2">PDF only · max 50 MB · up to 500 pages</p>
            </div>
          </div>
        ) : (
          /* File selected card */
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <DocumentTextIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
            </div>
            {!uploading && (
              <button
                onClick={removeFile}
                className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <XMarkIcon className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-primary-500" />
                {progress < 90 ? 'Uploading…' : 'Processing pages…'}
              </span>
              <span className="font-semibold text-primary-600">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700">
            <XMarkIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Upload button */}
        {!result && (
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary w-full justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <><ArrowPathIcon className="h-4 w-4 animate-spin" />Processing…</>
            ) : (
              <><CloudArrowUpIcon className="h-4 w-4" />Upload &amp; Split PDF</>
            )}
          </button>
        )}

        {/* Results card */}
        {result && (
          <div className="space-y-4 animate-slide-up">
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 bg-success-50 border border-success-100 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-success-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-success-800">
                  Split Complete! {result.totalPages} label{result.totalPages !== 1 ? 's' : ''} found
                </p>
                <p className="text-xs text-success-600 mt-0.5">
                  Platform: <span className="font-semibold capitalize">{result.platform}</span>
                  {' · '}
                  {result.couriers?.length} courier{result.couriers?.length !== 1 ? 's' : ''} detected
                </p>
              </div>
              <button
                onClick={removeFile}
                className="ml-auto text-success-500 hover:text-success-700 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Courier table */}
              {result.couriers?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TruckIcon className="h-3.5 w-3.5 text-gray-400" />
                    By Courier
                  </h3>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2">Courier</th>
                          <th className="text-right text-xs font-semibold text-gray-500 px-3 py-2">Labels</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {result.couriers.map((c, i) => (
                          <tr key={c.name} className="hover:bg-gray-50/60">
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${COURIER_COLORS[i % COURIER_COLORS.length]}`}>
                                {c.name}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-bold text-gray-900 text-xs">{c.count}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Product table */}
              {result.products?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingBagIcon className="h-3.5 w-3.5 text-gray-400" />
                    By Product / SKU
                  </h3>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2">Product / SKU</th>
                          <th className="text-right text-xs font-semibold text-gray-500 px-3 py-2">Labels</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {result.products.slice(0, 8).map((p) => (
                          <tr key={p.name} className="hover:bg-gray-50/60">
                            <td className="px-3 py-2 text-xs text-gray-700 max-w-[160px]">
                              <span className="truncate block" title={p.name}>{p.name}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-bold text-gray-900 text-xs">{p.count}</span>
                            </td>
                          </tr>
                        ))}
                        {result.products.length > 8 && (
                          <tr>
                            <td colSpan={2} className="px-3 py-2 text-center text-xs text-gray-400">
                              +{result.products.length - 8} more…
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Download buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => handleDownload('courier')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <TruckIcon className="h-4 w-4" />
                By Courier
              </button>
              <button
                onClick={() => handleDownload('product')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <ShoppingBagIcon className="h-4 w-4" />
                By Product
              </button>
              <button
                onClick={() => handleDownload('all')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <ArchiveBoxIcon className="h-4 w-4" />
                All Labels
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Config data ─────────────────────────────────────── */
const SPLIT_TYPES = [
  {
    id: 'sku',
    label: 'SKU Wise',
    desc: 'Split labels by product SKU — ideal for multi-SKU orders.',
    icon: QrCodeIcon,
    tag: 'Popular',
  },
  {
    id: 'courier',
    label: 'Courier Wise',
    desc: 'Group labels by courier partner for easy handover.',
    icon: TruckIcon,
    tag: null,
  },
  {
    id: 'product',
    label: 'Product Wise',
    desc: 'Split by product category or type.',
    icon: ShoppingBagIcon,
    tag: null,
  },
  {
    id: 'order',
    label: 'Order ID Wise',
    desc: 'One label per order ID — simplest sorting.',
    icon: IdentificationIcon,
    tag: null,
  },
];

const COURIERS = [
  { id: 'delhivery',  name: 'Delhivery',  logo: '🚚', rating: 4.6, eta: '2–4 days', zones: 'Pan India', connected: true },
  { id: 'shiprocket', name: 'Shiprocket', logo: '🚀', rating: 4.4, eta: '3–5 days', zones: 'Pan India', connected: true },
  { id: 'bluedart',   name: 'BlueDart',   logo: '🔵', rating: 4.8, eta: '1–3 days', zones: 'Metro+',    connected: false },
  { id: 'dtdc',       name: 'DTDC',       logo: '📦', rating: 4.2, eta: '3–6 days', zones: 'Pan India', connected: true },
  { id: 'ekart',      name: 'Ekart',      logo: '🛒', rating: 4.3, eta: '2–4 days', zones: 'Pan India', connected: true },
  { id: 'xpressbees', name: 'XpressBees', logo: '🐝', rating: 4.5, eta: '2–4 days', zones: 'Pan India', connected: false },
];

const LABEL_SIZES = [
  { id: 'A4_4',    label: 'A4 — 4 per page',  desc: 'Standard',   w: 'Half A4',    preview: '2×2 grid' },
  { id: 'A4_2',    label: 'A4 — 2 per page',  desc: 'Large',      w: 'Half A4',    preview: '2×1 grid' },
  { id: 'A4_1',    label: 'A4 — Full page',   desc: 'Extra large',w: 'Full A4',    preview: '1×1' },
  { id: 'A6_1',    label: 'A6 — Single',      desc: 'Thermal',    w: 'A6',         preview: '1×1' },
  { id: 'CUSTOM',  label: 'Custom Size',       desc: 'Enter dims', w: '—',          preview: '—' },
];

const SAMPLE_ORDERS = Array.from({ length: 12 }, (_, i) => {
  const platforms = ['amazon', 'flipkart', 'meesho', 'myntra'];
  const couriers  = ['Delhivery', 'Shiprocket', 'BlueDart', 'DTDC', 'Ekart'];
  const skus      = ['KRT-NB-XL', 'SHO-MR-42', 'SAR-FP-OS', 'JNS-DB-32', 'BTL-SS-1L', 'DRS-WF-M'];
  const plt       = platforms[i % 4];
  const pfxMap    = { amazon: 'AMZ-406', flipkart: 'FK-OD', meesho: 'MSO-28', myntra: 'MYN' };
  return {
    id:      `${pfxMap[plt]}-${(7800000 + i * 137).toString()}`,
    sku:     skus[i % skus.length],
    product: ['Cotton Kurta Set', "Men's Running Shoes", 'Floral Saree', 'Slim Fit Jeans', 'Water Bottle', "Women's Dress"][i % 6],
    platform: plt,
    courier:  couriers[i % 5],
    awb:      `DL${(40000000 + i * 7).toString()}`,
    qty:      (i % 3) + 1,
  };
});

const PLATFORM_STYLE = {
  amazon:   'bg-[#FF9900]/10 text-[#b36b00]',
  flipkart: 'bg-[#2874F0]/10 text-[#1857c7]',
  meesho:   'bg-[#F43397]/10 text-[#c41374]',
  myntra:   'bg-[#FF3F6C]/10 text-[#d0163e]',
};

/* ── Step progress bar ───────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Select Orders' },
  { id: 2, label: 'Split Type' },
  { id: 3, label: 'Courier' },
  { id: 4, label: 'Label Settings' },
  { id: 5, label: 'Preview & Download' },
];

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const done   = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`step-circle ${done ? 'step-circle-done' : active ? 'step-circle-active' : 'step-circle-pending'}`}>
                {done ? <CheckIcon className="h-4 w-4" /> : <span>{step.id}</span>}
              </div>
              <span className={`text-xs font-medium hidden sm:block whitespace-nowrap
                ${active ? 'text-primary-600' : done ? 'text-success-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 mx-2 ${step.id < current ? 'bg-success-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1: Select orders ───────────────────────────── */
function Step1({ selected, setSelected }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? SAMPLE_ORDERS.filter((o) => o.id.includes(search) || o.sku.includes(search) || o.product.toLowerCase().includes(search.toLowerCase()))
    : SAMPLE_ORDERS;

  const allSel = filtered.length > 0 && filtered.every((o) => selected.has(o.id));
  const toggle    = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(filtered.map((o) => o.id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Select Orders</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose which orders to generate labels for.</p>
        </div>
        {selected.size > 0 && (
          <span className="badge badge-blue">{selected.size} selected</span>
        )}
      </div>

      <div className="relative">
        <input
          className="form-input pl-9"
          placeholder="Search by Order ID, SKU, or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      <div className="table-wrapper">
        <table className="table-root">
          <thead className="table-head">
            <tr>
              <th className="table-th-check">
                <input type="checkbox" checked={allSel} onChange={toggleAll} />
              </th>
              <th className="table-th">Order ID</th>
              <th className="table-th">Product</th>
              <th className="table-th">SKU</th>
              <th className="table-th">Platform</th>
              <th className="table-th">Courier</th>
              <th className="table-th">AWB</th>
              <th className="table-th">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((o) => (
              <tr key={o.id} className={selected.has(o.id) ? 'table-row-selected' : 'table-row'}>
                <td className="table-td-check">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                </td>
                <td className="table-td font-mono text-xs font-semibold text-gray-800">{o.id}</td>
                <td className="table-td text-xs text-gray-700 max-w-[140px]"><span className="truncate block">{o.product}</span></td>
                <td className="table-td font-mono text-xs text-gray-500">{o.sku}</td>
                <td className="table-td">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md capitalize ${PLATFORM_STYLE[o.platform]}`}>
                    {o.platform}
                  </span>
                </td>
                <td className="table-td text-xs">{o.courier}</td>
                <td className="table-td font-mono text-xs text-gray-400">{o.awb}</td>
                <td className="table-td text-center text-xs font-medium">{o.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Step 2: Split type ──────────────────────────────── */
function Step2({ splitType, setSplitType }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">Choose Split Type</h2>
        <p className="text-sm text-gray-500 mt-0.5">How should the labels be organized in the output PDF?</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {SPLIT_TYPES.map((s) => {
          const Icon = s.icon;
          const active = splitType === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSplitType(s.id)}
              className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150
                ${active ? 'border-primary-500 bg-primary-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
            >
              {s.tag && (
                <span className="absolute top-3 right-3 badge badge-blue text-2xs">{s.tag}</span>
              )}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${active ? 'text-primary-700' : 'text-gray-900'}`}>{s.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
              {active && (
                <CheckCircleIcon className="absolute bottom-3 right-3 h-4 w-4 text-primary-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 3: Courier ─────────────────────────────────── */
function Step3({ selectedCourier, setSelectedCourier }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">Choose Courier Partner</h2>
        <p className="text-sm text-gray-500 mt-0.5">Select the courier service for label generation.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {COURIERS.map((c) => {
          const active = selectedCourier === c.id;
          return (
            <button
              key={c.id}
              onClick={() => c.connected && setSelectedCourier(c.id)}
              disabled={!c.connected}
              className={`relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150
                ${active ? 'border-primary-500 bg-primary-50/50 shadow-sm' : ''}
                ${c.connected ? 'hover:border-gray-300 hover:bg-gray-50 border-gray-200' : 'border-gray-100 opacity-50 cursor-not-allowed bg-gray-50'}`}
            >
              {!c.connected && (
                <span className="absolute top-2.5 right-2.5 badge badge-gray text-2xs">Not Connected</span>
              )}
              {active && (
                <CheckCircleIcon className="absolute top-2.5 right-2.5 h-4 w-4 text-primary-500" />
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                  {c.logo}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${active ? 'text-primary-700' : 'text-gray-900'}`}>{c.name}</p>
                  <p className="text-xs text-gray-500">{c.zones}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">ETA: <span className="font-medium text-gray-700">{c.eta}</span></span>
                <span className="flex items-center gap-0.5 text-warning-600 font-semibold">
                  ★ {c.rating}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
        <InformationCircleIcon className="h-4 w-4 text-primary-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary-700">
          Connect more couriers in <span className="font-semibold">Settings → Courier Partners</span> to unlock all options.
        </p>
      </div>
    </div>
  );
}

/* ── Step 4: Label settings ──────────────────────────── */
function Step4({ settings, setSettings }) {
  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-900">Label Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Customize what appears on the label and output format.</p>
      </div>

      {/* Label size */}
      <div>
        <label className="form-label text-gray-800 font-semibold">Label Size / Layout</label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {LABEL_SIZES.map((sz) => {
            const active = settings.size === sz.id;
            return (
              <button
                key={sz.id}
                onClick={() => update('size', sz.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all
                  ${active ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {/* Mini page preview */}
                <div className={`h-10 w-8 rounded border-2 flex-shrink-0 flex items-center justify-center
                  ${active ? 'border-primary-400 bg-primary-100/50' : 'border-gray-300 bg-gray-50'}`}>
                  <div className={`text-2xs font-bold ${active ? 'text-primary-600' : 'text-gray-400'}`}>
                    {sz.id === 'A4_4' ? '4' : sz.id === 'A4_2' ? '2' : sz.id === 'A6_1' ? 'A6' : sz.id === 'CUSTOM' ? '?' : '1'}
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-semibold ${active ? 'text-primary-700' : 'text-gray-800'}`}>{sz.label}</p>
                  <p className="text-2xs text-gray-400 mt-0.5">{sz.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom size inputs */}
        {settings.size === 'CUSTOM' && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Width (mm)</label>
              <input className="form-input" type="number" placeholder="100" value={settings.customW} onChange={(e) => update('customW', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Height (mm)</label>
              <input className="form-input" type="number" placeholder="150" value={settings.customH} onChange={(e) => update('customH', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Label fields */}
      <div>
        <label className="form-label text-gray-800 font-semibold mb-3 block">Label Content</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { key: 'showProductName', label: 'Product Name',    desc: 'Print product title on label' },
            { key: 'showSKU',         label: 'SKU / MSKU',      desc: 'Include seller SKU code' },
            { key: 'showOrderId',     label: 'Order ID',        desc: 'Print platform order number' },
            { key: 'showAWB',         label: 'AWB Number',      desc: 'Include courier AWB' },
            { key: 'showBarcode',     label: 'Barcode',         desc: 'Generate scannable barcode' },
            { key: 'showQty',         label: 'Quantity',        desc: 'Show item quantity' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={!!settings[key]}
                  onChange={(e) => update(key, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Additional options */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Return Address</label>
          <input className="form-input" placeholder="Your business address" value={settings.returnAddress} onChange={(e) => update('returnAddress', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Custom Note on Label</label>
          <input className="form-input" placeholder="e.g. Handle with care" value={settings.note} onChange={(e) => update('note', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

/* ── Step 5: Preview & download ──────────────────────── */
function Step5({ selected, splitType, courier, settings, onDownload, downloading }) {
  const courierObj = COURIERS.find((c) => c.id === courier);
  const sizeObj    = LABEL_SIZES.find((s) => s.id === settings.size);
  const splitObj   = SPLIT_TYPES.find((s) => s.id === splitType);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900">Preview & Download</h2>
        <p className="text-sm text-gray-500 mt-0.5">Review your configuration before generating the PDF.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Summary card */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
            Configuration Summary
          </h3>
          {[
            { label: 'Orders selected',  value: `${selected.size} orders` },
            { label: 'Split type',       value: splitObj?.label || '—' },
            { label: 'Courier partner',  value: courierObj?.name || '—' },
            { label: 'Label size',       value: sizeObj?.label || '—' },
            { label: 'Estimated pages',  value: `~${Math.ceil(selected.size / (settings.size === 'A4_4' ? 4 : settings.size === 'A4_2' ? 2 : 1))} pages` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Label preview mockup */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <EyeIcon className="h-4 w-4 text-gray-400" />
            Label Preview
          </h3>
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-4 font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="font-bold text-gray-900 uppercase text-2xs tracking-widest">ShipSplit Label</span>
              <span className="text-2xs text-gray-400">{sizeObj?.label}</span>
            </div>
            <div className="border-t border-dashed border-gray-300 pt-1.5 space-y-1">
              {settings.showOrderId     && <div><span className="text-gray-400">ORDER: </span><span className="font-bold">AMZ-406-7823941</span></div>}
              {settings.showProductName && <div><span className="text-gray-400">ITEM:  </span><span>Cotton Kurta Set XL</span></div>}
              {settings.showSKU         && <div><span className="text-gray-400">SKU:   </span><span>KRT-NB-XL</span></div>}
              {settings.showAWB         && <div><span className="text-gray-400">AWB:   </span><span>DL40000007</span></div>}
              {settings.showQty         && <div><span className="text-gray-400">QTY:   </span><span>1</span></div>}
            </div>
            {settings.showBarcode && (
              <div className="border-t border-dashed border-gray-300 pt-2 flex gap-0.5">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className={`${i % 3 === 0 ? 'w-1' : 'w-0.5'} h-6 bg-gray-800 rounded-sm`} />
                ))}
              </div>
            )}
            {settings.note && (
              <div className="border-t border-dashed border-gray-300 pt-1.5 text-center italic text-gray-500 text-2xs">{settings.note}</div>
            )}
          </div>
        </div>
      </div>

      {/* Content checklist */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Included on label</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'showProductName', label: 'Product Name' },
            { key: 'showSKU',         label: 'SKU' },
            { key: 'showOrderId',     label: 'Order ID' },
            { key: 'showAWB',         label: 'AWB' },
            { key: 'showBarcode',     label: 'Barcode' },
            { key: 'showQty',         label: 'Quantity' },
          ].map(({ key, label }) => (
            <span key={key} className={settings[key] ? 'badge-green' : 'badge-gray opacity-50'}>
              {settings[key] ? <CheckIcon className="h-3 w-3" /> : null}
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Download button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onDownload}
          disabled={downloading || selected.size === 0}
          className="btn-primary btn-lg flex-1 justify-center shadow-sm"
        >
          {downloading ? (
            <><ArrowPathIcon className="h-5 w-5 animate-spin" />Generating PDF…</>
          ) : (
            <><DocumentArrowDownIcon className="h-5 w-5" />Download Labels PDF ({selected.size} labels)</>
          )}
        </button>
        <button className="btn-secondary btn-lg">
          <EyeIcon className="h-4 w-4" />
          Preview PDF
        </button>
      </div>

      {selected.size === 0 && (
        <p className="text-sm text-center text-warning-600 bg-warning-50 border border-warning-100 rounded-xl py-3">
          No orders selected. Go back to Step 1 and select at least one order.
        </p>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */
export default function LabelGeneratorPage() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(1);
  const [done, setDone]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* Step state */
  const [selected,       setSelected]       = useState(new Set());
  const [splitType,      setSplitType]      = useState('sku');
  const [courier,        setCourier]        = useState('delhivery');
  const [settings,       setSettings]       = useState({
    size: 'A4_4', customW: '', customH: '',
    showProductName: true, showSKU: true, showOrderId: true,
    showAWB: true, showBarcode: true, showQty: false,
    returnAddress: '', note: '',
  });

  const canNext = () => {
    if (step === 1) return selected.size > 0;
    if (step === 2) return !!splitType;
    if (step === 3) return !!courier;
    return true;
  };

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDone(true);
    }, 2500);
  };

  /* ── Success screen ──────────────────────────────── */
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-slide-up">
        <div className="h-20 w-20 rounded-full bg-success-100 flex items-center justify-center mb-5">
          <CheckCircleIcon className="h-12 w-12 text-success-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Labels Downloaded!</h2>
        <p className="text-gray-500 mt-2 max-w-sm">
          <span className="font-semibold">{selected.size} labels</span> have been generated and the PDF has been downloaded to your device.
        </p>
        <div className="flex gap-3 mt-8">
          <button onClick={() => { setDone(false); setStep(1); setSelected(new Set()); }} className="btn-secondary">
            Generate More
          </button>
          <button onClick={() => navigate('/dashboard/orders')} className="btn-primary">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      {/* ── Header ──────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-primary-600" />
            Label Generator
          </h1>
          <p className="page-sub">Generate shipping labels in 5 simple steps.</p>
        </div>
      </div>

      {/* ── Upload & Split section ───────────────── */}
      <UploadSplitSection />

      {/* ── Divider ─────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium px-2">or generate from orders below</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ── Step bar ──────────────────────────────── */}
      <div className="card p-5">
        <StepBar current={step} />
      </div>

      {/* ── Step content ─────────────────────────── */}
      <div className="card p-6">
        {step === 1 && <Step1 selected={selected} setSelected={setSelected} />}
        {step === 2 && <Step2 splitType={splitType} setSplitType={setSplitType} />}
        {step === 3 && <Step3 selectedCourier={courier} setSelectedCourier={setCourier} />}
        {step === 4 && <Step4 settings={settings} setSettings={setSettings} />}
        {step === 5 && (
          <Step5
            selected={selected}
            splitType={splitType}
            courier={courier}
            settings={settings}
            onDownload={handleDownload}
            downloading={downloading}
          />
        )}
      </div>

      {/* ── Nav buttons ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step === 1 ? navigate('/dashboard/orders') : setStep(s => s - 1)}
          className="btn-secondary gap-2"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {step === 1 ? 'Back to Orders' : 'Previous'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>
          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
