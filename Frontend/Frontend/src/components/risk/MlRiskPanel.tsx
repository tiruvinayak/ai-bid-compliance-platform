import React, { useCallback, useEffect, useState } from 'react';
import { Brain, Loader2, Info, Layers } from 'lucide-react';
import { mlRiskService } from '../../services/mlRiskService';
import type { MlRiskResponse } from '../../types';

interface MlRiskPanelProps {
  bidId: string;
  ruleBasedRisk: string | null;
}

const featureLabels: Record<string, string> = {
  requirementsPassed: 'Requirements passed',
  requirementsReview: 'Requirements requiring review',
  requirementsFailed: 'Requirements failed',
  requirementsMissing: 'Requirements missing',
  preliminaryFailCount: 'Preliminary checks failed',
  preliminaryReviewCount: 'Preliminary checks in review',
  expiredDocumentCount: 'Expired documents',
  conflictCount: 'Conflicts detected',
  riskFactorCount: 'Risk factors recorded',
  highRiskCount: 'High-risk categories',
  mediumRiskCount: 'Medium-risk categories',
  lowRiskCount: 'Low-risk categories',
  documentCount: 'Documents uploaded',
  evidenceCoverage: 'Evidence coverage'
};

export const MlRiskPanel: React.FC<MlRiskPanelProps> = ({ bidId, ruleBasedRisk }) => {
  const [ml, setMl] = useState<MlRiskResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await mlRiskService.assessMlRisk(bidId);
      setMl(response);
    } catch (err: any) {
      setError(err.message || 'Unable to compute ML risk assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5 mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Computing ML-indicated risk features…
        </div>
      </div>
    );
  }

  if (error || !ml) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5 mb-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg px-3 py-2">
          {error || 'ML risk assessment is unavailable.'}
        </div>
      </div>
    );
  }

  const features = ml.features;
  const featureEntries = (Object.keys(featureLabels) as (keyof typeof featureLabels)[])
    .map((key) => ({
      key,
      label: featureLabels[key],
      value: features[key as keyof typeof features] as number
    }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden mb-6" data-testid="ml-risk-panel">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              ML Risk Assessment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Decision support only — separate from the rule-based risk engine
            </p>
          </div>
        </div>
        {ml.status === 'AVAILABLE' && ml.modelVersion && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-3xs font-bold bg-violet-50 text-violet-800 border border-violet-200">
            Model: {ml.modelVersion}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Side-by-side: deterministic vs ML — never merged into one score. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-3xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Existing Rule-Based Risk
            </div>
            <div className="text-lg font-black text-slate-800">{ruleBasedRisk || 'NOT_RUN'}</div>
            <div className="text-3xs text-slate-400 mt-1">Deterministic engine (unchanged)</div>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <div className="text-3xs font-bold uppercase tracking-wider text-violet-700 mb-1">
              ML-Indicated Risk
            </div>
            {ml.status === 'AVAILABLE' ? (
              <>
                <div className="text-lg font-black text-violet-900">{ml.riskLevel}</div>
                <div className="text-3xs text-violet-600 mt-1">
                  Model: {ml.modelVersion} · prediction {ml.prediction != null ? (ml.prediction * 100).toFixed(1) + '%' : '—'}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-black text-slate-500">NOT_AVAILABLE</div>
                <div className="text-3xs text-slate-500 mt-1">{ml.reason}</div>
              </>
            )}
          </div>
        </div>

        {ml.status !== 'AVAILABLE' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            <span className="font-bold">MODEL STATUS: NOT TRAINED</span> — insufficient validated
            labeled historical dataset. No probability is generated without a validated trained model.
          </div>
        )}

        {ml.status === 'AVAILABLE' && ml.contributingFeatures.length > 0 && (
          <div>
            <div className="text-3xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Contributing features
            </div>
            <ul className="space-y-1.5">
              {ml.contributingFeatures.map((c) => (
                <li key={c.feature} className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded px-3 py-1.5">
                  <span>{featureLabels[c.feature] || c.feature}</span>
                  <span className="font-mono text-3xs text-slate-500">
                    value {c.value}
                    {c.contribution != null ? ` · contribution ${c.contribution.toFixed(3)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-3xs text-slate-400 mt-2">
              Listed as contributing features of the model — not causal findings.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-3xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <Layers className="w-3.5 h-3.5" />
            Computed features (feature version {ml.featureVersion})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {featureEntries.map((f) => (
              <div key={f.key} className="bg-slate-50 border border-slate-100 rounded px-2.5 py-2" title={f.label}>
                <div className="text-sm font-black text-slate-800">
                  {f.key === 'evidenceCoverage' ? `${Math.round(f.value * 100)}%` : f.value}
                </div>
                <div className="text-3xs text-slate-500 leading-tight">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-3xs text-indigo-800">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            ML output is decision support only: <span className="font-bold">Model-indicated risk: {ml.status === 'AVAILABLE' ? ml.riskLevel : 'NOT_AVAILABLE'}</span>.
            It does not replace the rule-based risk engine, ranks no bidders, and declares no winner.
            The officer remains responsible for review.
          </span>
        </div>
      </div>
    </div>
  );
};
