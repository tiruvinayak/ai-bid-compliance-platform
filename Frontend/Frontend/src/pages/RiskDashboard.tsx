import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { ExecutiveRiskSummary } from '../components/risk/ExecutiveRiskSummary';
import { RiskCategoryCard } from '../components/risk/RiskCategoryCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { riskService } from '../services/riskService';
import { bidService } from '../services/bidService';
import type { RiskCategorySummary, Bid } from '../types';
import { UserCheck } from 'lucide-react';

export const RiskDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [bid, setBid] = useState<Bid | null>(null);
  const [riskCategories, setRiskCategories] = useState<RiskCategorySummary[]>([]);
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
        const [bidData, risksData] = await Promise.all([
          bidService.getBidById(id),
          riskService.getRiskSummary(id)
        ]);
        if (!bidData) throw new Error(`Bid ${id} was not found.`);
        setBid(bidData);
        setRiskCategories(risksData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load risk analysis dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingState message="Computing Multi-Vector Risk Exposure Score..." />;
  if (error || !bid || !id) return <ErrorState message={error || 'Bid risk data is unavailable.'} />;

  const derivedFactors = riskCategories.flatMap(c => c.factors || []).filter(Boolean);
  const topFactors = derivedFactors.length > 0 ? derivedFactors : ["No elevated risk factors detected."];

  return (
    <div>
      <PageHeader
        title={`Risk & Vulnerability Assessment — ${bid.id}`}
        subtitle={`Bidder: ${bid.bidderName} | Executive Risk Matrix`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Risk Matrix" }
        ]}
        actions={
          <button
            onClick={() => navigate(`/bids/${id}/review`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Proceed to Officer Decision</span>
          </button>
        }
      />

      <ExecutiveRiskSummary
        bidId={bid.id}
        overallRisk={bid.riskLevel}
        factors={topFactors}
      />

      {riskCategories.length === 0 ? (
        <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
          <div className="text-emerald-800 font-bold text-sm">No risks detected</div>
          <p className="text-xs text-emerald-700">All submitted bidder documents and credentials meet mandatory verification criteria without flagged risk exposures.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {riskCategories.map((catSummary, idx) => (
            <RiskCategoryCard key={idx} categorySummary={catSummary} />
          ))}
        </div>
      )}
    </div>
  );
};
