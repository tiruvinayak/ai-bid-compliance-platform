import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface ExecutiveRiskSummaryProps {
  bidId: string;
  overallRisk: RiskLevel;
  factors: string[];
}

export const ExecutiveRiskSummary: React.FC<ExecutiveRiskSummaryProps> = ({
  bidId,
  overallRisk,
  factors
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-rose-950 text-white rounded-lg p-6 shadow-md border border-rose-900 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-900/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-900/80 border border-rose-700 text-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-wide text-rose-100 uppercase">
              WHY IS THIS BID RISKY?
            </h2>
            <p className="text-2xs text-rose-300">Executive Summary for Procurement Officer</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-rose-900/90 px-3 py-1.5 rounded border border-rose-700 text-xs font-bold">
          <span>OVERALL DETERMINATION:</span>
          <span className="text-rose-200 font-extrabold">{overallRisk} RISK</span>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {factors.map((factor, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs text-rose-100 font-medium">
            <span className="w-5 h-5 rounded-full bg-rose-900 border border-rose-700 text-rose-200 text-3xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span>{factor}</span>
          </div>
        ))}
      </div>

      <div className="bg-rose-900/60 p-4 rounded-md border border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-3xs font-bold uppercase tracking-wider text-rose-300">RECOMMENDED OFFICER ACTION</span>
          <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>MANUAL REVIEW REQUIRED (DO NOT AUTO-APPROVE)</span>
          </div>
        </div>

        <button
          onClick={() => navigate(`/bids/${bidId}/review`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition shadow-sm cursor-pointer shrink-0"
        >
          <UserCheck className="w-4 h-4" />
          <span>Review Issues</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
