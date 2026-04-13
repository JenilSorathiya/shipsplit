import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useUploadLabels, useGenerateLabels } from '../../hooks/useLabels';

const PLATFORMS = ['amazon', 'flipkart', 'meesho', 'myntra'];
const PAGE_SIZES = ['A4', 'A6', 'Letter'];
const LABELS_PER_PAGE_OPTIONS = { A4: [1, 2, 4, 6], A6: [1], Letter: [1, 2, 4] };

export default function LabelProcessor({ onClose }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'generate'
  const [platform, setPlatform] = useState('');
  const [file, setFile] = useState(null);
  const [pageSize, setPageSize] = useState('A4');
  const [labelsPerPage, setLabelsPerPage] = useState(4);

  const upload = useUploadLabels();
  const generate = useGenerateLabels();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDrop: (accepted) => setFile(accepted[0] || null),
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!platform || !file) return;
    await upload.mutateAsync({ platform, file });
    onClose?.();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    await generate.mutateAsync({ platform, pageSize, labelsPerPage });
    onClose?.();
  };

  const isPending = upload.isPending || generate.isPending;

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        {[['upload', 'Upload PDF Labels'], ['generate', 'Generate from Orders']].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors
              ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Platform */}
      <div>
        <label className="label">Platform</label>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">Select platform…</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {mode === 'upload' ? (
        <div>
          <label className="label">Label PDF</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <DocumentIcon className="h-5 w-5 text-brand-500" />
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <CloudArrowUpIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drop PDF or <span className="text-brand-600 font-medium">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Cog6ToothIcon className="h-4 w-4" />
            Output Configuration
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Page Size</label>
              <select className="input" value={pageSize} onChange={(e) => { setPageSize(e.target.value); setLabelsPerPage(LABELS_PER_PAGE_OPTIONS[e.target.value][0]); }}>
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Labels per Page</label>
              <select className="input" value={labelsPerPage} onChange={(e) => setLabelsPerPage(Number(e.target.value))}>
                {(LABELS_PER_PAGE_OPTIONS[pageSize] || [1]).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={mode === 'upload' ? handleUpload : handleGenerate}
          disabled={!platform || (mode === 'upload' && !file) || isPending}
          className="btn-primary"
        >
          {isPending ? 'Processing…' : mode === 'upload' ? 'Process Labels' : 'Generate Labels'}
        </button>
      </div>
    </div>
  );
}
