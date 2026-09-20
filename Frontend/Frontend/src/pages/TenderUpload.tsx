import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { UploadZone } from '../components/documents/UploadZone';
import { DocumentCard } from '../components/documents/DocumentCard';
import { documentService } from '../services/documentService';
import { bidService } from '../services/bidService';
import type { BidderDocument } from '../types';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

export const TenderUpload: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [tenderDoc, setTenderDoc] = useState<BidderDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyBid = async () => {
      if (!id) {
        setError('This page requires a bid ID.');
        setLoading(false);
        return;
      }
      try {
        const bid = await bidService.getBidById(id);
        if (!bid) setError(`Bid ${id} was not found.`);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load bid.');
      } finally {
        setLoading(false);
      }
    };
    void verifyBid();
  }, [id]);


  const handleFileUpload = async (file: File) => {
    if (!id) throw new Error('This page requires a bid ID.');
    const uploaded = await documentService.uploadTenderDocument(id, file);
    setTenderDoc(uploaded);
  };

  if (loading) return <LoadingState message="Verifying tender record..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Upload Tender RFP Specification Document"
        subtitle={`Evaluation Reference Record: ${id}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Upload Tender RFP" }
        ]}
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs">
          <UploadZone
            title="Upload GeM Official Tender Specification PDF"
            subtitle="Upload the official RFP PDF document containing mandatory evaluation criteria, financial turnover limits, and technical requirements."
            allowedTypes={['.pdf']}
            onFileUpload={handleFileUpload}
            multiple={false}
            maxFiles={1}
          />
        </div>

        {tenderDoc && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold bg-emerald-50 border border-emerald-200 p-3 rounded">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>✓ Tender Specification Uploaded & Validated via GeM Parser Engine</span>
            </div>

            <DocumentCard document={tenderDoc} onRemove={() => setTenderDoc(null)} />

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => navigate(`/bids/${id}/upload-documents`)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Continue to Bidder Document Upload</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
