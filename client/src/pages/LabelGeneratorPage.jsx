import { useState, useRef, useCallback } from 'react';
import {
  ScissorsIcon, CloudArrowUpIcon, ArrowPathIcon,
  TruckIcon, ShoppingBagIcon, DocumentTextIcon,
  ArchiveBoxIcon, CheckCircleIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';

/* ── Constants ──────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════
   Upload & Split Section
══════════════════════════════════════════════════════════ */
function UploadSplitSection() {
  const [platform,  setPlatform]  = useState('amazon');
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const fileInputRef = useRef(null);

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

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    } catch {
      setError('Download failed. The split may have expired — please re-upload.');
    }
  };

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
          Bulk Split
        </span>
      </div>

      <div className="p-6 space-y-5">

        {/* Platform tabs */}
        <div>
          <label className="form-label text-gray-700 font-semibold mb-2 block">Platform</label>
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
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-primary-100' : 'bg-gray-100'}`}>
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
            {uploading
              ? <><ArrowPathIcon className="h-4 w-4 animate-spin" />Processing…</>
              : <><CloudArrowUpIcon className="h-4 w-4" />Upload &amp; Split PDF</>
            }
          </button>
        )}

        {/* Results */}
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
              <button onClick={removeFile} className="ml-auto text-success-500 hover:text-success-700 transition-colors">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
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
                            <td className="px-3 py-2 text-right font-bold text-gray-900 text-xs">{c.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                            <td className="px-3 py-2 text-right font-bold text-gray-900 text-xs">{p.count}</td>
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

/* ══════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════ */
export default function LabelGeneratorPage() {
  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ScissorsIcon className="h-5 w-5 text-primary-600" />
            Label Splitter
          </h1>
          <p className="page-sub">
            Upload a bulk label PDF from Amazon, Flipkart, Meesho or Myntra — ShipSplit auto-detects couriers &amp; products and creates a downloadable ZIP.
          </p>
        </div>
      </div>

      {/* How-it-works strip */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { step: '1', title: 'Upload PDF', desc: 'Drag in your bulk label PDF from any platform.' },
          { step: '2', title: 'Auto-detect', desc: 'We detect every courier and product automatically.' },
          { step: '3', title: 'Download ZIP', desc: 'Get labels sorted by courier, product, or all in one.' },
        ].map(({ step, title, desc }) => (
          <div key={step} className="card p-4 flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {step}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload & Split */}
      <UploadSplitSection />

      {/* Tip */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <span className="text-gray-400 text-xs mt-0.5">💡</span>
        <p className="text-xs text-gray-500">
          To generate labels for individual orders, go to the <strong>Orders</strong> page and click <strong>Accept Order</strong> — labels are generated automatically, no configuration needed.
        </p>
      </div>
    </div>
  );
}
