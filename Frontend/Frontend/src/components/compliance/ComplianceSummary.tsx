import React from 'react';
import { RiskBadge } from '../common/RiskBadge';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, AlertOctagon } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface ComplianceSummaryProps {
  total: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  missingCount: number;
  conflictCount: number;
  compliancePercentage: number;
  riskLevel: RiskLevel;
}

export const ComplianceSummary: React.FC<ComplianceSummaryProps> = ({
  total,
  passCount,
  failCount,
  reviewCount,
  missingCount,
  conflictCount,
  compliancePercentage,
  riskLevel
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-slate-100 bg-slate-50 shadow-inner">
            <div className="text-center">
              <span className={`text-2xl font-black ${compliancePercentage < 80 ? "text-rose-700" : "text-emerald-700"}`}>
                {compliancePercentage}%
              </span>
              <span className="block text-3xs font-bold uppercase text-slate-400">Score</span>
            </div>
          </div>
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Overall Assessment</span>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">Bid Evaluation Metric</h2>
            <div className="flex items-center gap-3 mt-2">
              <RiskBadge risk={riskLevel} size="lg" />
              <span className="text-xs text-slate-600 font-medium">
                {failCount + conflictCount > 0 ? "Requires Manual Officer Intervention" : "Automated Verification Passed"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-800 font-bold text-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASS</span>
            </div>
            <span className="text-xl font-extrabold text-emerald-900">{passCount}</span>
          </div>

          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-800 font-bold text-xs mb-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>FAIL</span>
            </div>
            <span className="text-xl font-extrabold text-rose-900">{failCount}</span>
          </div>

           <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-center">
             <div className="flex items-center justify-center gap-1 text-blue-800 font-bold text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>REVIEW</span>
            </div>
             <span className="text-xl font-extrabold text-blue-900">{reviewCount}</span>
          </div>

           <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-center">
             <div className="flex items-center justify-center gap-1 text-amber-800 font-bold text-xs mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>MISSING</span>
            </div>
             <span className="text-xl font-extrabold text-amber-900">{missingCount}</span>
          </div>

          <div className="p-3 rounded-md bg-purple-50 border border-purple-200 text-center col-span-2 sm:col-span-1">
            <div className="flex items-center justify-center gap-1 text-purple-900 font-bold text-xs mb-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>CONFLICT</span>
            </div>
            <span className="text-xl font-extrabold text-purple-900">{conflictCount}</span>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between text-2xs text-slate-500">
        <span>Total Evaluated RFP Requirements: <strong className="text-slate-800 font-bold">{total}</strong></span>
        <span>RAG Pipeline Verification Engine v2.6 (GeM Compliance Standard)</span>
      </div>
    </div>
  );
};
