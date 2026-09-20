import React from 'react';
import { FileText, EyeOff } from 'lucide-react';
import type { EvidenceDetail } from '../../types';

interface DocumentPreviewPaneProps {
  evidence: EvidenceDetail;
}

export const DocumentPreviewPane: React.FC<DocumentPreviewPaneProps> = ({ evidence }) => (
  <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[420px]">
    <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center gap-2 text-slate-300 text-xs">
      <FileText className="w-4 h-4 text-blue-400" />
      <span className="font-bold text-white truncate">{evidence.sourceDocument || 'Source document not reported'}</span>
    </div>
    <div className="flex-1 p-8 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <EyeOff className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-white">Document preview unavailable</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          The backend returned evidence metadata, but no document preview or file URL. No document content is being simulated here.
        </p>
        <div className="mt-6 text-left bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
          <div><span className="text-3xs uppercase font-bold text-slate-500">Source document</span><p className="text-slate-200 mt-1 break-words">{evidence.sourceDocument || 'Not reported'}</p></div>
          <div><span className="text-3xs uppercase font-bold text-slate-500">Source page</span><p className="text-slate-200 mt-1">{evidence.pageNumber > 0 ? evidence.pageNumber : 'Not reported'}</p></div>
          <div><span className="text-3xs uppercase font-bold text-slate-500">Evidence snippet</span><p className="text-slate-200 mt-1 whitespace-pre-wrap break-words">{evidence.extractedSnippet || 'Not reported'}</p></div>
        </div>
      </div>
    </div>
  </div>
);
