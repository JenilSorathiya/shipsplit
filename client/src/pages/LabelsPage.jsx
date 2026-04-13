import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import LabelList from '../components/labels/LabelList';
import LabelProcessor from '../components/labels/LabelProcessor';
import Modal from '../components/ui/Modal';

export default function LabelsPage() {
  const [processorOpen, setProcessorOpen] = useState(false);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Labels</h1>
          <p className="text-sm text-gray-500 mt-0.5">Process, split, and download shipping labels.</p>
        </div>
        <button onClick={() => setProcessorOpen(true)} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Process Labels
        </button>
      </div>

      <LabelList />

      <Modal open={processorOpen} onClose={() => setProcessorOpen(false)} title="Process Shipping Labels">
        <LabelProcessor onClose={() => setProcessorOpen(false)} />
      </Modal>
    </div>
  );
}
