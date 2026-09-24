import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { ComplianceSummary } from '../components/compliance/ComplianceSummary';
import { RequirementTable } from '../components/compliance/RequirementTable';
import { PreliminaryVerification } from '../components/compliance/PreliminaryVerification';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { complianceService } from '../services/complianceService';
import { bidService } from '../services/bidService';
import type { Bid, Requirement, PreliminaryVerificationSummary, PreliminaryVerificationCheck } from '../types';
import { ShieldAlert, UserCheck } from 'lucide-react';

export const ComplianceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [bid, setBid] = useState<Bid | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [preliminarySummary, setPreliminarySummary] = useState<PreliminaryVerificationSummary | null>(null);
  const [preliminaryChecks, setPreliminaryChecks] = useState<PreliminaryVerificationCheck[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!id) {
      setError('This page requires a bid ID.');
      setLoading(false);
      return;
    }
    try {
      const [bidData, reqsData, preliminaryData] = await Promise.all([
        bidService.getBidById(id),
        complianceService.getRequirements(id),
        complianceService.getPreliminaryVerification(id)
      ]);
      if (!bidData) throw new Error(`Bid ${id} was not found.`);
      setBid(bidData);
      setRequirements(reqsData);
      if (preliminaryData) {
        setPreliminarySummary(preliminaryData.summary);
        setPreliminaryChecks(preliminaryData.checks);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance records.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState message="Loading Bid Compliance Evaluation Matrix..." />;
  if (error || !bid || !id) return <ErrorState message={error || 'Bid compliance data is unavailable.'} onRetry={loadData} />;

  // The bid summary is the authoritative evaluation snapshot. The requirement
  // endpoint may be paginated or incomplete, so do not recompute an official
  // score from the currently rendered rows.
  const hasAuthoritativeSummary = typeof bid.totalRequirements === 'number' && bid.totalRequirements > 0;
  const totalRequirements = hasAuthoritativeSummary ? bid.totalRequirements : requirements.length;
  const passCount = hasAuthoritativeSummary ? bid.passCount : requirements.filter((r) => r.status === 'PASS').length;
  const failCount = hasAuthoritativeSummary ? bid.failCount : requirements.filter((r) => r.status === 'FAIL').length;
  const reviewCount = hasAuthoritativeSummary ? bid.reviewCount : requirements.filter((r) => r.status === 'REVIEW').length;
  const missingCount = hasAuthoritativeSummary ? bid.missingCount : requirements.filter((r) => r.status === 'MISSING').length;
  const conflictCount = hasAuthoritativeSummary ? bid.conflictCount : requirements.filter((r) => r.status === 'CONFLICT').length;
  const computedCompliancePercentage = typeof bid.compliancePercentage === 'number'
    ? bid.compliancePercentage
    : totalRequirements > 0 ? Math.round((passCount / totalRequirements) * 1000) / 10 : 0;

  return (
    <div>
      <PageHeader
        title={`Compliance Evaluation Dashboard — ${bid.id}`}
        subtitle={`Bidder: ${bid.bidderName} | Tender: ${bid.tenderId}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Compliance Evaluation" }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/bids/${id}/risks`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Risk & Conflicts</span>
            </button>
            <button
              onClick={() => navigate(`/bids/${id}/review`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Officer Review</span>
            </button>
          </div>
        }
      />

      {preliminarySummary && preliminaryChecks.length > 0 && (
        <PreliminaryVerification
          summary={preliminarySummary}
          checks={preliminaryChecks}
        />
      )}

      <ComplianceSummary
        total={totalRequirements}
        passCount={passCount}
        failCount={failCount}
        reviewCount={reviewCount}
        missingCount={missingCount}
        conflictCount={conflictCount}
        compliancePercentage={computedCompliancePercentage}
        riskLevel={bid.riskLevel}
      />

      <RequirementTable bidId={bid.id} requirements={requirements} />
    </div>
  );
};
