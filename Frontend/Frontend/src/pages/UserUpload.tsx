import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { UploadZone } from '../components/documents/UploadZone';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentDetailModal } from '../components/documents/DocumentDetailModal';
import { documentService } from '../services/documentService';
import { bidService } from '../services/bidService';
import type { BidderDocument, Bid } from '../types';
import { ShieldCheck, Info, CheckCircle, ArrowRight, Building2 } from 'lucide-react';

export const UserUpload: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<BidderDocument[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedBidId, setSelectedBidId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('GST Certificate');
  const [selectedDoc, setSelectedDoc] = useState<BidderDocument | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const [docs, bList] = await Promise.all([
          documentService.getUserDocuments(),
          bidService.getBids()
        ]);
        setDocuments(docs);
        setBids(bList);
         if (bList.length > 0) {
            const requestedBidId = searchParams.get('bidId');
            const requestedBid = bList.find((bid) => (bid.bidId || bid.id) === requestedBidId);
            setSelectedBidId(requestedBid ? (requestedBid.bidId || requestedBid.id) : (bList[0].bidId || bList[0].id));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load bidder upload data.');
      }
    };
    load();
  }, [searchParams]);

  // Poll for document status updates while any document is in PROCESSING state
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.processingStatus === 'PROCESSING' || (d.progressPercentage != null && d.progressPercentage < 100));
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const freshDocs = await documentService.getUserDocuments();
        setDocuments(freshDocs);
        if (selectedDoc) {
          const updatedSelected = freshDocs.find((d) => d.id === selectedDoc.id);
          if (updatedSelected) setSelectedDoc(updatedSelected);
        }
       } catch {
         // The next bounded poll retries status refresh; the upload workspace
         // remains usable when a transient refresh fails.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, selectedDoc]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setNotification('');
    setError('');
    try {
      if (!selectedBidId) throw new Error('Select an allocated tender before uploading.');
      const uploaded = await documentService.uploadBidderDocument(selectedBidId, file, selectedType);
      setDocuments((prev) => [uploaded, ...prev]);
      setNotification(`Uploaded ${file.name} successfully for Tender ${selectedBidId} as ${selectedType}.`);
      setTimeout(() => setNotification(''), 5000);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed. Please verify the file and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

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
        title="Upload Procurement Verification Documents"
        subtitle="Submit mandatory bidder credentials, financial statements, and technical certificates for automated AI verification."
        breadcrumbs={[
          { label: "User Dashboard", path: "/user/dashboard" },
          { label: "Upload Documents" }
        ]}
      />

      {/* FRONTEND vs BACKEND BOUNDARY BANNER */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-blue-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 border border-amber-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-wide uppercase">Multi-Format Verification Matrix</h3>
                <span className="text-3xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded uppercase">
                  ACTIVE PIPELINE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                 The current verification pipeline accepts <strong>PDF</strong> files for official evaluation. Other formats can be added when OCR adapters are enabled.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 px-4 py-3 rounded-lg border border-slate-700/80 text-2xs text-slate-300 max-w-sm">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
              <Info className="w-3.5 h-3.5" />
              <span>Allocated Tender Target</span>
            </div>
            <span>Documents uploaded here will be routed to the allocated Government Officer evaluating this tender.</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
      {error && <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-lg text-xs font-semibold" role="alert">{error}</div>}

      {/* UPLOAD LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select Tender & Document Category & Drop Zone */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-900" />
                <span>Target Government Tender / RFP</span>
              </label>
              <select
                value={selectedBidId}
                onChange={(e) => setSelectedBidId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900"
              >
                {bids.map((b) => (
                    <option key={b.id} value={b.bidId || b.id}>
                      {(b.bidId || b.id)} - {b.tenderTitle}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">
                Select Document Category
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-900"
              >
                <option value="GST Certificate">GST Registration Certificate (GSTIN)</option>
                <option value="Financial Statement">Audited Financial Statements (P&L, Balance Sheet)</option>
                <option value="Financial Spreadsheet">Financial Ledger & Tax Reconciliation (XLS/XLSX/CSV)</option>
                <option value="Experience Certificate">Past Experience & Completion Work Orders (DOCX/PDF)</option>
                <option value="OEM Authorization Form">OEM Manufacturer Authorization (MAF)</option>
                <option value="Non-Blacklisting Undertaking">Non-Blacklisting Affidavit (₹100 Stamp Paper)</option>
                <option value="ISO Certificate">ISO 27001 Security Certification</option>
                <option value="Technical Proposal">Technical Architecture Presentation (PPTX/PDF)</option>
                <option value="MSME Certificate">MSME Udyam Registration Certificate</option>
                <option value="Identity Document">Company PAN & Director Identity Proof</option>
              </select>
            </div>

             {selectedBidId ? <UploadZone
              title={`Upload ${selectedType}`}
              subtitle="Drag and drop your document file here or click to choose file."
               allowedTypes={['.pdf']}
              onFileUpload={handleFileUpload}
              maxFiles={10}
             /> : <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">No allocated tenders are available for document submission.</div>}

            {uploading && (
              <div className="mt-3 text-center text-xs font-bold text-blue-900 animate-pulse">
                Uploading and parsing document contents for Tender {selectedBidId}...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Uploaded Document List & Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Submitted Verification Matrix</h3>
                <p className="text-3xs text-slate-500">Documents submitted for automated OCR & compliance parsing</p>
              </div>
              <span className="text-xs font-bold text-blue-950 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                 {documents.filter((document) => !document.bidId || document.bidId === selectedBidId).length} Uploaded Files
              </span>
            </div>

            <DocumentList
               documents={documents.filter((document) => !document.bidId || document.bidId === selectedBidId)}
              onRemove={handleRemove}
              onViewDetails={(doc) => setSelectedDoc(doc)}
            />

            <div className="pt-6 border-t border-slate-200 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-3xs text-slate-500 font-medium">
                All files encrypted at rest & audit logged for official government evaluation.
              </div>

              <button
                onClick={() => navigate('/user/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Return to User Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};
