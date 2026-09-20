import React from 'react';
import type { RiskCategorySummary } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { AlertCircle } from 'lucide-react';

interface RiskCategoryCardProps {
  categorySummary: RiskCategorySummary;
}

export const RiskCategoryCard: React.FC<RiskCategoryCardProps> = ({ categorySummary }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{categorySummary.category} Evaluation</span>
          <RiskBadge risk={categorySummary.riskLevel} size="sm" />
        </div>

        <p className="text-xs font-semibold text-slate-700 mb-3">{categorySummary.summary}</p>

        <ul className="space-y-2 mb-4">
          {categorySummary.factors.map((factor, idx) => (
            <li key={idx} className="flex items-start gap-2 text-2xs text-slate-600">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500">
        <span>Risk Exposure Index</span>
        <span className="font-mono font-bold text-slate-800">{categorySummary.score} / 100</span>
      </div>
    </div>
  );
};
