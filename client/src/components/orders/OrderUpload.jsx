import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUploadOrders } from '../../hooks/useOrders';

const PLATFORMS = ['amazon', 'flipkart', 'meesho', 'myntra'];

export default function OrderUpload({ onClose }) {
  const [platform, setPlatform] = useState('');
  const [file, setFile] = useState(null);
  const upload = useUploadOrders();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
    onDrop: (accepted) => setFile(accepted[0] || null),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!platform || !file) return;
    await upload.mutateAsync({ platform, file });
    onClose?.();
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="label">Platform</label>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)} required>
          <option value="">Select platform…</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      <div>
        <label className="label">CSV File</label>
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
              <p className="text-sm text-gray-500">Drag & drop CSV or <span className="text-brand-600 font-medium">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Platform order export CSV</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!platform || !file || upload.isPending}
          className="btn-primary"
        >
          {upload.isPending ? 'Uploading…' : 'Upload Orders'}
        </button>
      </div>
    </div>
  );
}
