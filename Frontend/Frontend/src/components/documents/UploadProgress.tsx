import React from 'react';
import { CheckCircle2, Loader2, FileCheck, AlertCircle } from 'lucide-react';
import type { BidderDocument } from '../../types';

interface UploadProgressProps {
  document: BidderDocument;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ document }) => {
  const stages = document.stages || [];
  const status = document.processingStatus || document.uploadStatus || 'UNKNOWN';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-sans">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-blue-900" />
          <span className="text-xs font-bold text-slate-900 uppercase">Server Processing Status</span>
        </div>
        <span className="text-3xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">{status}</span>
      </div>

      {stages.length === 0 ? (
        <p className="text-xs text-slate-500">No processing stages were reported by the server.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-3xs font-medium">
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
              {stage.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : status === 'FAILED' ? <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />}
              <span className={stage.completed ? 'text-slate-900 font-bold' : 'text-slate-500'}>{stage.name}</span>
              {stage.details && <span className="text-slate-400 truncate">{stage.details}</span>}
            </div>
          ))}
        </div>
      )}

      {document.progressPercentage != null && <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-700 rounded-full" style={{ width: `${Math.min(100, Math.max(0, document.progressPercentage))}%` }} /></div>}
    </div>
  );
};
