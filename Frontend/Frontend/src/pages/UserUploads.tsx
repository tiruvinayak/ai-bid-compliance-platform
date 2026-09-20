import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { documentService } from '../services/documentService';
import type { BidderDocument } from '../types';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentDetailModal } from '../components/documents/DocumentDetailModal';
import { ErrorState } from '../components/common/ErrorState';
import { Search, FolderCheck, CheckCircle2, Clock, XCircle, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserUploads: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<BidderDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<BidderDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await documentService.getUserDocuments();
        setDocuments(docs);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load uploads.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const filteredDocs = useMemo(() => {
    let result = documents;

    if (statusFilter !== 'ALL') {
      result = result.filter(d => d.processingStatus === statusFilter || d.uploadStatus === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        d =>
          d.filename.toLowerCase().includes(q) ||
          d.docType.toLowerCase().includes(q) ||
          (d.fileFormat ? d.fileFormat.toLowerCase().includes(q) : false)

      );
    }

    return result;
  }, [searchTerm, statusFilter, documents]);

  const handleDownload = async (document: BidderDocument) => {
    const blob = await documentService.downloadDocument(document.id);
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="My Uploaded Procurement Documents"
        subtitle="Manage and review all submitted bidder files, track automated extraction stages, and inspect verification readiness."
        breadcrumbs={[
          { label: "User Dashboard", path: "/user/dashboard" },
          { label: "My Uploads" }
        ]}
        actions={
          <button
            onClick={() => navigate('/user/upload')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Upload New Document</span>
          </button>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by filename, document category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ALL ({documents.length})
          </button>

          <button
            onClick={() => setStatusFilter('PROCESSED')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'PROCESSED'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETED ({documents.filter(d => d.processingStatus === 'PROCESSED' || d.processingStatus === 'COMPLETED').length})
          </button>

          <button
            onClick={() => setStatusFilter('PROCESSING')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'PROCESSING'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            PROCESSING ({documents.filter(d => d.processingStatus === 'PROCESSING').length})
          </button>

          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'FAILED'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            FAILED ({documents.filter(d => d.processingStatus === 'FAILED').length})
          </button>
        </div>
      </div>

      {/* DOCUMENT LIST */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FolderCheck className="w-4 h-4 text-blue-900" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase">Document Repository Vault</h3>
          </div>
          <span className="text-3xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            Showing {filteredDocs.length} of {documents.length} Files
          </span>
        </div>

         {loading ? (
           <div className="p-8 text-center text-xs text-slate-500">Loading document vault...</div>
         ) : error ? (
           <ErrorState message={error} />
         ) : (
          <DocumentList
            documents={filteredDocs}
            onViewDetails={(doc) => setSelectedDoc(doc)}
          />
        )}
      </div>

      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};
