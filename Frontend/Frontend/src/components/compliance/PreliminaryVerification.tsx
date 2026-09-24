import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, FileText, Clock, AlertCircle } from 'lucide-react';
import type { PreliminaryVerificationCheck, PreliminaryVerificationSummary } from '../../types';

interface PreliminaryVerificationProps {
  summary: PreliminaryVerificationSummary;
  checks: PreliminaryVerificationCheck[];
}

const checkTypeLabels: Record<string, string> = {
  DOCUMENT_VALIDITY: 'Document Validity',
  REQUIRED_DOCUMENT: 'Required Evidence',
  EXPIRY_DATE: 'Expiry Validation',
  FIELD_COMPLETENESS: 'Required Fields',
  CROSS_PAGE_CONSISTENCY: 'Cross-page Consistency',
};

const checkTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  DOCUMENT_VALIDITY: FileText,
  REQUIRED_DOCUMENT: FileText,
  EXPIRY_DATE: Clock,
  FIELD_COMPLETENESS: HelpCircle,
  CROSS_PAGE_CONSISTENCY: AlertCircle,
};

const statusColors: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  PASS: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 },
  REVIEW: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: AlertTriangle },
  FAIL: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: XCircle },
  MISSING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: HelpCircle },
  CONFLICT: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: AlertCircle },
};

export const PreliminaryVerification: React.FC<PreliminaryVerificationProps> = ({ summary, checks }) => {
  const { overallStatus, summary: summaryCounts } = summary;

  const OverallStatusIcon = statusColors[overallStatus]?.icon || HelpCircle;
  const statusStyle = statusColors[overallStatus] || statusColors.REVIEW;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className={`px-5 py-3 border-b border-slate-200 bg-slate-50 ${statusStyle.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${statusStyle.bg} border ${statusStyle.border} flex items-center justify-center shrink-0`}>
              <OverallStatusIcon className={`w-5 h-5 ${statusStyle.text}`} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                Preliminary Integrity Verification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated document integrity checks run before deep compliance evaluation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              <OverallStatusIcon className="w-3.5 h-3.5" />
              Overall: {overallStatus}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-center">
              <div className="text-2xl font-black text-emerald-800">{summaryCounts.pass}</div>
              <div className="text-3xs font-bold uppercase text-emerald-700">PASS</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-center">
              <div className="text-2xl font-black text-amber-800">{summaryCounts.review}</div>
              <div className="text-3xs font-bold uppercase text-amber-700">REVIEW</div>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 border border-rose-100 text-center">
              <div className="text-2xl font-black text-rose-800">{summaryCounts.fail}</div>
              <div className="text-3xs font-bold uppercase text-rose-700">FAIL</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-center">
              <div className="text-2xl font-black text-amber-800">{summaryCounts.missing}</div>
              <div className="text-3xs font-bold uppercase text-amber-700">MISSING</div>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 border border-rose-100 text-center">
              <div className="text-2xl font-black text-rose-800">{summaryCounts.conflict}</div>
              <div className="text-3xs font-bold uppercase text-rose-700">CONFLICT</div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {checks.map((check) => {
              const checkStatusStyle = statusColors[check.status] || statusColors.REVIEW;
              const CheckTypeIcon = checkTypeIcons[check.checkType] || HelpCircle;

              return (
                <div key={check.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${checkStatusStyle.bg} border ${checkStatusStyle.border} flex items-center justify-center shrink-0`}>
                      <CheckTypeIcon className={`w-5 h-5 ${checkStatusStyle.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{checkTypeLabels[check.checkType] || check.checkType}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-bold uppercase ${checkStatusStyle.bg} ${checkStatusStyle.text} border ${checkStatusStyle.border}`}>
                          {(() => {
                            const IconComponent = statusColors[check.status]?.icon || HelpCircle;
                            return <IconComponent className="w-3 h-3" />;
                          })()}
                          {check.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{check.message}</p>
                    </div>
                  </div>

                  {(check.fieldName || check.expectedValue || check.actualValue || check.sourcePage || check.evidenceReference) && (
                    <div className="sm:ml-12 flex flex-wrap gap-3 text-xs text-slate-500">
                      {check.fieldName && (
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <span className="font-medium text-slate-700">Field:</span> {check.fieldName}
                        </span>
                      )}
                      {check.expectedValue && (
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <span className="font-medium text-slate-700">Expected:</span> {check.expectedValue}
                        </span>
                      )}
                      {check.actualValue && (
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <span className="font-medium text-slate-700">Actual:</span> {check.actualValue}
                        </span>
                      )}
                      {check.sourcePage && (
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <span className="font-medium text-slate-700">Page:</span> {check.sourcePage}
                        </span>
                      )}
                      {check.evidenceReference && (
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <span className="font-medium text-slate-700">Document:</span> {check.evidenceReference}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};