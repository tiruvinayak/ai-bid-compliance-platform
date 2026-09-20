import React from 'react';
import type { EvidenceDetail } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { FileText, Search } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceDetail;
  onOpenPreview?: () => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, onOpenPreview }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-2xs font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            {evidence.requirementId}
          </span>
          <h3 className="text-sm font-bold text-slate-900 mt-1">{evidence.requirementTitle}</h3>
        </div>
        <StatusBadge status={evidence.decision} size="lg" />
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-500">RFP Required Value</span>
            <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">{evidence.requiredValue}</div>
          </div>
          <div>
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-500">Extracted / Detected Value</span>
             <div className={`text-sm font-bold font-mono mt-0.5 ${
               evidence.decision === 'FAIL' || evidence.decision === 'CONFLICT' ? "text-rose-700" : evidence.decision === 'PASS' ? "text-emerald-700" : "text-amber-700"
             }`}>
              {evidence.detectedValue}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-800" />
            <div>
              <span className="text-3xs font-bold uppercase text-slate-500">Source Document & Page</span>
              <div className="text-xs font-bold text-slate-900 font-mono">
                {evidence.sourceDocument} — <span className="text-blue-900 font-black">Page {evidence.pageNumber}</span>
              </div>
            </div>
          </div>
          {onOpenPreview && (
            <button
              onClick={onOpenPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white rounded text-xs font-semibold hover:bg-blue-950 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Inspect Document Page</span>
            </button>
          )}
        </div>

        <div>
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Extracted Text Snippet (Verified by OCR & RAG Pipeline)
          </span>
          <div className="p-4 bg-amber-50/70 border-l-4 border-l-amber-500 border-y border-r border-amber-200/80 rounded-r-md text-xs font-mono text-slate-900 leading-relaxed italic shadow-2xs">
            {evidence.extractedSnippet}
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-slate-100 rounded-lg">
          <div className="flex items-center justify-between text-2xs text-slate-400 font-semibold mb-1">
            <span>AUTOMATED SYSTEM DETERMINATION REASONING</span>
             <span>Confidence: <strong className="text-emerald-400 font-bold">{evidence.confidence ?? 0}%</strong></span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {evidence.reason}
          </p>
        </div>
      </div>
    </div>
  );
};
