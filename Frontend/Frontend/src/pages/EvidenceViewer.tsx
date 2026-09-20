import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { EvidenceCard } from '../components/evidence/EvidenceCard';
import { DocumentPreviewPane } from '../components/evidence/DocumentPreviewPane';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { complianceService } from '../services/complianceService';
import type { EvidenceDetail } from '../types';
import { ArrowLeft } from 'lucide-react';

export const EvidenceViewer: React.FC = () => {
  const navigate = useNavigate();
  const { id, reqId } = useParams();

  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      if (!id || !reqId) {
        setError('This page requires both a bid ID and requirement ID.');
        setLoading(false);
        return;
      }
      try {
        const data = await complianceService.getEvidenceForRequirement(reqId, id);
        setEvidence(data);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve evidence details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reqId, id]);

  if (loading) return <LoadingState message="Extracting OCR & Vector RAG Evidence..." />;
  if (error || !evidence || !id) return <ErrorState message={error || 'Evidence was not found for this requirement.'} />;

  return (
    <div>
      <PageHeader
        title={`Evidence Inspector — Clause ${evidence.requirementId}`}
        subtitle={`Verifying Source Document: ${evidence.sourceDocument} (Page ${evidence.pageNumber})`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Compliance", path: `/bids/${id}/compliance` },
          { label: "Evidence Viewer" }
        ]}
        actions={
          <button
            onClick={() => navigate(`/bids/${id}/compliance`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Matrix</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <EvidenceCard evidence={evidence} />
        </div>

        <div className="lg:col-span-7">
          <DocumentPreviewPane evidence={evidence} />
        </div>
      </div>
    </div>
  );
};
