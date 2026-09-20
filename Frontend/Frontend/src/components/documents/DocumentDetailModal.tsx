import React from 'react';
import { X, CheckCircle2, AlertCircle, FileText, ShieldCheck, Download } from 'lucide-react';
import type { BidderDocument } from '../../types';
import { UploadProgress } from './UploadProgress';


interface DocumentDetailModalProps {
  document: BidderDocument | null;
  onClose: () => void;
  onDownload?: (document: BidderDocument) => void | Promise<void>;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ document, onClose, onDownload }) => {
  if (!document) return null;

  const unitText = document.unitLabel;
  const countVal = document.pageCount ?? document.sectionCount ?? document.sheetCount ?? document.slideCount ?? document.recordCount;
  const stages = document.stages || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-lg text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-wide uppercase">Document Verification Details</h3>
              <p className="text-3xs text-slate-400 font-mono">Reference ID: {document.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Main Info Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xs font-bold uppercase text-slate-500 tracking-wider">Filename</span>
                <h4 className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">{document.filename}</h4>
              </div>
              <span className={`px-2.5 py-1 rounded text-3xs font-extrabold uppercase border ${
                document.processingStatus === 'PROCESSED' || document.processingStatus === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : document.processingStatus === 'FAILED'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {document.processingStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-3xs text-slate-500 font-semibold uppercase block">Category / Type</span>
                <span className="font-bold text-slate-800">{document.docType}</span>
              </div>

              <div>
                <span className="text-3xs text-slate-500 font-semibold uppercase block">Format & Size</span>
                <span className="font-bold text-slate-800">{document.fileFormat} • {document.fileSize}</span>
              </div>

              <div>
                <span className="text-3xs text-slate-500 font-semibold uppercase block">{unitText} Extracted</span>
                 <span className="font-bold text-blue-900">{countVal != null && unitText ? `${countVal} ${unitText}` : 'Not reported'}</span>
              </div>

              <div>
                <span className="text-3xs text-slate-500 font-semibold uppercase block">Completion</span>
                 <span className="font-bold text-emerald-700">{document.progressPercentage != null ? `${document.progressPercentage}%` : 'Not reported'}</span>
              </div>
            </div>
          </div>

          {/* Pipeline Component */}
          <UploadProgress document={document} />

          {/* Stage Logs */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-900 tracking-wider mb-3">
              Automated Parsing & Content Detection Audit
            </h4>
            <div className="space-y-2">
              {stages.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded text-xs text-slate-500">No parsing stages were reported by the server.</div>
              ) : stages.map((stg, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded text-xs">
                  <div className="flex items-center gap-2.5">
                    {stg.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">{stg.name}</div>
                      <div className="text-3xs text-slate-500">{stg.details}</div>
                    </div>
                  </div>
                  {stg.timestamp && (
                    <span className="text-3xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {stg.timestamp}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-3xs text-blue-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
              <span>Backend validation authoritative • Parsed data ready for Officer review.</span>
            </div>
             <span className="font-bold font-mono">{document.uploadedBy || 'Uploader not reported'}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <div className="flex items-center gap-2">
            {onDownload && /^\d+$/.test(document.id) && (
              <button
                onClick={() => void onDownload(document)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
