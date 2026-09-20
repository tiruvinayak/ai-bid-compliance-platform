import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { UploadZone } from '../components/documents/UploadZone';
import { DocumentCard } from '../components/documents/DocumentCard';
import { documentService } from '../services/documentService';
import { bidService } from '../services/bidService';
import { analysisService } from '../services/analysisService';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import type { BidderDocument } from '../types';
import { ArrowRight, Cpu } from 'lucide-react';

export const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [documents, setDocuments] = useState<BidderDocument[]>([]);
  const [selectedType, setSelectedType] = useState<string>('GST Certificate');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('This page requires a bid ID.');
        setLoading(false);
        return;
      }
      try {
        const [bid, docs] = await Promise.all([bidService.getBidById(id), documentService.getDocuments(id)]);
        if (!bid) {
          setError(`Bid ${id} was not found.`);
          return;
        }
        setDocuments(docs);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load bid documents.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleFileUpload = async (file: File) => {
    if (!id) throw new Error('This page requires a bid ID.');
    setUploading(true);
    try {
      const uploaded = await documentService.uploadBidderDocument(id, file, selectedType);
      setDocuments((prev) => [...prev, uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleStartAnalysis = async () => {
    if (!id) return;
    setStartingAnalysis(true);
    setError('');
    try {
      await analysisService.startAnalysis(id);
      navigate(`/bids/${id}/analysis`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start bid analysis.');
    } finally {
      setStartingAnalysis(false);
    }
  };

  if (loading) return <LoadingState message="Loading bid document workspace..." />;
  if (error && documents.length === 0) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Upload Bidder Verification Documents Matrix"
        subtitle={`Evaluation Reference Record: ${id}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Document Upload Matrix" }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Select Document Category
            </h3>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-900 mb-4 focus:ring-2 focus:ring-blue-800"
            >
              <option value="GST Certificate">GST Registration Certificate</option>
              <option value="Financial Statement">Audited Financial Statements (P&L, Balance Sheet)</option>
              <option value="Experience Certificate">Past Experience & Completion Certificates</option>
              <option value="OEM Authorization Form">OEM Manufacturer Authorization (MAF)</option>
              <option value="Non-Blacklisting Undertaking">Non-Blacklisting Affidavit</option>
              <option value="ISO Certificate">ISO 27001 Security Certification</option>
            </select>

           <UploadZone
              title={`Upload ${selectedType}`}
              subtitle="PDF file containing mandatory certification or financial statement."
              allowedTypes={['.pdf']}
              onFileUpload={handleFileUpload}
              multiple={false}
              maxFiles={1}
            />
            {uploading && <p className="mt-3 text-xs font-semibold text-blue-900">Uploading document...</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Uploaded Verification Files</h3>
                <p className="text-3xs text-slate-500">Documents submitted by bidder for automated RAG parsing</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                {documents.length} Files Uploaded
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-300 rounded-lg">
                No documents uploaded for this bid yet. Upload documents using the dropzone on the left.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} onRemove={() => handleRemove(doc.id)} />
                ))}
              </div>
            )}

             {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800" role="alert">{error}</div>}
             <div className="pt-6 border-t border-slate-200 mt-6 flex items-center justify-between">
              <div className="text-2xs text-slate-500">
                All files scanned for virus signatures and encrypted at rest.
              </div>

              <button
                 onClick={() => void handleStartAnalysis()}
                 disabled={documents.length === 0 || startingAnalysis}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                 <span>{startingAnalysis ? 'STARTING ANALYSIS...' : 'START AI BID ANALYSIS'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
