import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentBidsTable } from '../components/dashboard/RecentBidsTable';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { bidService } from '../services/bidService';
import type { Bid, UserProfile } from '../types';
import { FileText, Cpu, Clock, ShieldAlert, PlusCircle, Building2, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{ user?: UserProfile }>();
  const officer = context?.user;

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchBids = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bidService.getBids();
      setBids(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tender bids database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // Dynamically calculated metrics from database records
  const totalEvaluated = bids.length;
  const activeAnalyses = bids.filter(b => b.status === 'Analyzing').length;
  const pendingReviews = bids.filter(b => b.status === 'Review Required' || b.status === 'Draft').length;
  const highRiskBids = bids.filter(b => b.riskLevel === 'HIGH').length;

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="Procurement Officer Evaluation Command Center"
        subtitle="Integrated Bid Compliance, Document RAG Analysis & Risk Verification Suite"
        breadcrumbs={[{ label: "GeM Platform" }, { label: "Officer Dashboard" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBids}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md text-xs font-bold transition cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/bids/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Create New Tender RFP</span>
            </button>
          </div>
        }
      />

      {/* OFFICER PROFILE CONTEXT BANNER */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-700/30 border border-blue-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-white">
                 {officer?.department || 'Department not reported'}
              </h2>
              <span className="text-3xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-extrabold uppercase">
                GOVT EVALUATOR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
               Logged in Officer: <strong className="text-slate-200">{officer?.name || 'Name not reported'}</strong> ({officer?.email || 'Email not reported'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-xs text-slate-300">
           <span>Officer ID: <strong className="text-white font-mono">{officer?.officerId || 'Not reported'}</strong></span>
        </div>
      </div>

      {/* Dynamic Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL BIDS IN QUEUE"
          value={totalEvaluated}
          subtitle="FY 2025-26 Procurement Queue"
          icon={<FileText className="w-5 h-5 text-blue-800" />}
          variant="blue"
        />
        <StatCard
          title="ACTIVE AI ANALYSES"
          value={activeAnalyses}
          subtitle="RAG & OCR Pipeline Running"
          icon={<Cpu className="w-5 h-5 text-emerald-700" />}
          variant="emerald"
        />
        <StatCard
          title="PENDING OFFICER REVIEWS"
          value={pendingReviews}
          subtitle="Human Review Recommended"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          variant="amber"
        />
        <StatCard
          title="HIGH-RISK BIDS FLAGGED"
          value={highRiskBids}
          subtitle="Financial & Legal Non-Compliance"
          icon={<ShieldAlert className="w-5 h-5 text-rose-700" />}
          variant="rose"
        />
      </div>

      {/* Active Bids Database Table */}
      {loading ? (
        <LoadingState message="Fetching Active Tender Bids Database..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBids} />
      ) : (
        <RecentBidsTable bids={bids} />
      )}
    </div>
  );
};
