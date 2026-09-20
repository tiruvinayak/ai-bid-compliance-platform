import React from 'react';
import type { BidderDocument } from '../../types';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Eye, 
  FileSpreadsheet, 
  FileCode, 
  Image as ImageIcon, 
  Presentation 
} from 'lucide-react';


interface DocumentCardProps {
  document: BidderDocument;
  onRemove?: () => void;
  onViewDetails?: (doc: BidderDocument) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onRemove, onViewDetails }) => {
  const getFormatIcon = () => {
    const fmt = document.fileFormat?.toUpperCase() || document.filename.split('.').pop()?.toUpperCase();
    switch (fmt) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'XLS':
      case 'XLSX':
      case 'CSV':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'DOC':
      case 'DOCX':
      case 'TXT':
        return <FileCode className="w-5 h-5 text-blue-600" />;
      case 'PPT':
      case 'PPTX':
        return <Presentation className="w-5 h-5 text-amber-600" />;

      case 'JPG':
      case 'JPEG':
      case 'PNG':
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const getUnitInfo = () => {
     if (document.pageCount != null) return `${document.pageCount} Pages`;
     if (document.sectionCount != null) return `${document.sectionCount} Sections`;
     if (document.sheetCount != null) return `${document.sheetCount} Sheets`;
     if (document.slideCount != null) return `${document.slideCount} Slides`;
     if (document.recordCount != null) return `${document.recordCount} Records`;
    return null;
  };

  const getStatusBadge = () => {
    switch (document.processingStatus) {
      case 'PROCESSED':
      case 'COMPLETED':
         return (
          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-3xs font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>PROCESSED</span>
          </span>
        );
      case 'PROCESSING':
      case 'UPLOADING':
         return (
          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded text-3xs font-bold animate-pulse">
            <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
            <span>PROCESSING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-3xs font-bold">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>FAILED</span>
          </span>
        );
       default:
         return <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-3xs font-bold">{document.processingStatus || document.uploadStatus || 'UNKNOWN'}</span>;
    }
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between shadow-2xs hover:border-slate-300 transition font-sans gap-3">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2.5 bg-slate-100 rounded-lg shrink-0 border border-slate-200">
          {getFormatIcon()}
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900 truncate">{document.filename}</h4>
            <span className="text-3xs px-1.5 py-0.2 rounded font-mono font-bold bg-slate-100 border border-slate-300 text-slate-700 uppercase">
               {document.fileFormat || 'Not reported'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-3xs text-slate-500 mt-0.5 font-mono">
            <span className="font-semibold text-slate-700">{document.docType}</span>
            <span>•</span>
            <span>{document.fileSize}</span>
            {getUnitInfo() && (
              <>
                <span>•</span>
                <span className="text-blue-900 font-bold">{getUnitInfo()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end sm:self-auto">
        {getStatusBadge()}

        {onViewDetails && (
          <button
            onClick={() => onViewDetails(document)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded text-3xs font-bold transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        )}

        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
            title="Remove document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
