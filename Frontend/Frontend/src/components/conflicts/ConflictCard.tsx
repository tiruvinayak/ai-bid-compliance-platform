import React from 'react';
import type { ConflictItem } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { AlertOctagon } from 'lucide-react';

interface ConflictCardProps {
  conflict: ConflictItem;
  onInspectDetails?: () => void;
}

export const ConflictCard: React.FC<ConflictCardProps> = ({ conflict, onInspectDetails }) => {
  return (
    <div className="bg-white rounded-lg border border-purple-200 shadow-2xs overflow-hidden mb-4 font-sans">
      <div className="px-6 py-4 bg-purple-50/60 border-b border-purple-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-3xs font-extrabold text-purple-800 uppercase tracking-wider">POTENTIAL CONFLICT DETECTED</span>
            <h3 className="text-sm font-bold text-slate-900">{conflict.title || "Cross-Document Data Discrepancy"}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RiskBadge risk={conflict.riskLevel} size="sm" />
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded text-3xs font-extrabold uppercase">
            {conflict.status || "MANUAL VERIFICATION REQUIRED"}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-xs text-slate-700 font-medium leading-relaxed">
          {conflict.explanation}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="space-y-1">
            <span className="text-3xs font-bold uppercase text-slate-500">1. Bidder Submitted Document</span>
            <div className="text-xs font-mono font-bold text-slate-900 truncate">{conflict.submittedDocument || "bidder_certificate.pdf"}</div>
            <div className="p-2.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-blue-900">
              Declared Value: <span className="font-extrabold text-blue-950">{conflict.submittedValue || "GSTIN29ABCDE1234F1Z5"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-3xs font-bold uppercase text-slate-500">2. External Verification Registry</span>
            <div className="text-xs font-mono font-bold text-slate-900 truncate">{conflict.verificationSource || "bidder_financial.pdf"}</div>
            <div className="p-2.5 bg-white border border-rose-300 rounded text-xs font-mono font-bold text-rose-700">
              Verified Source Value: <span className="font-extrabold text-rose-950">{conflict.verificationValue || "07AABCT1234F1Z5"}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-3xs text-slate-500">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 font-semibold">Sources cross-referenced:</span>
            {(conflict.sources || []).slice(0, 5).map((src, i) => (
              <span key={i} className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold shrink-0">
                {src.split('/').pop()}
              </span>
            ))}
          </div>

          {onInspectDetails && (
            <button
              onClick={onInspectDetails}
              className="px-3 py-1.5 bg-purple-900 hover:bg-purple-950 text-white rounded text-xs font-bold transition shadow-2xs cursor-pointer shrink-0 self-end"
            >
              View Inconsistency Evidence
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
