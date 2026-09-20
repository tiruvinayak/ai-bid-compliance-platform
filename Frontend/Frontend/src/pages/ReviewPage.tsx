import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { HumanReviewPanel } from '../components/review/HumanReviewPanel';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { reportService } from '../services/reportService';
import { bidService } from '../services/bidService';
import type { OfficerReviewRecord, Bid } from '../types';
import { FileSpreadsheet } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [bid, setBid] = useState<Bid | null>(null);
  const [reviewRecord, setReviewRecord] = useState<OfficerReviewRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      if (!id) {
        setError('This page requires a bid ID.');
        setLoading(false);
        return;
      }
      try {
        const [bData, rData] = await Promise.all([
          bidService.getBidById(id),
          reportService.getOfficerReview(id)
        ]);
        setBid(bData);
        setReviewRecord(rData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load officer review record.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSaveReview = async (decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CLARIFICATION' | 'UNDER_REVIEW', comment: string): Promise<void> => {
    if (!reviewRecord || !id) return;
    const updated = await reportService.saveOfficerReview(id, {
      finalDecision: decision,
      comment
    });
    setReviewRecord(updated);
  };

  if (loading) return <LoadingState message="Loading Human Review Panel..." />;
  if (error || !bid || !reviewRecord) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title={`Human Procurement Officer Final Review — ${bid.id}`}
        subtitle={`Bidder: ${bid.bidderName} | Tender RFP: ${bid.tenderId}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Compliance", path: `/bids/${id}/compliance` },
          { label: "Officer Review" }
        ]}
        actions={
          <button
            onClick={() => navigate(`/bids/${id}/report`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Generate Executive Report</span>
          </button>
        }
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <HumanReviewPanel
          bidId={bid.id}
          reviewRecord={reviewRecord}
          onSaveReview={handleSaveReview}
        />
      </div>
    </div>
  );
};
