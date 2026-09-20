import React, { useState } from 'react';
import type { OfficerReviewRecord } from '../../types';
import { ShieldAlert, Send, FileCheck2, HelpCircle } from 'lucide-react';

interface HumanReviewPanelProps {
  bidId: string;
  reviewRecord: OfficerReviewRecord;
  onSaveReview: (decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CLARIFICATION' | 'UNDER_REVIEW', comment: string) => Promise<void>;
}

export const HumanReviewPanel: React.FC<HumanReviewPanelProps> = ({
  reviewRecord,
  onSaveReview
}) => {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'REQUEST_CLARIFICATION' | 'UNDER_REVIEW'>(
    reviewRecord.finalDecision || 'UNDER_REVIEW'
  );
  const [comment, setComment] = useState<string>(reviewRecord.comment || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveError('');
    setSavedSuccess(false);
    try {
      await onSaveReview(decision, comment);
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The officer decision could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            HUMAN PROCUREMENT OFFICER FINAL DECISION PORTAL
          </h3>
          <p className="text-2xs text-amber-800 mt-0.5 leading-relaxed">
            <strong>Important Governance Protocol:</strong> The AI system acts solely as an advisory evidence analyzer. The Procurement Officer retains 100% legal responsibility and authority for final qualification decisions.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-slate-900 text-slate-100 rounded-lg">
          <span className="text-3xs font-bold uppercase tracking-wider text-blue-400">AI ADVISORY RECOMMENDATION</span>
          <div className="text-sm font-bold text-white mt-1">{reviewRecord.recommendation}</div>
          <p className="text-2xs text-slate-300 mt-1">
             Server-provided advisory recommendation. The final decision remains with the procurement officer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Procurement Officer Determination
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  decision === 'APPROVED'
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>QUALIFY / APPROVE</span>
                </div>
                <p className="text-3xs text-slate-500 mt-1">Override risk and accept bidder eligibility</p>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REQUEST_CLARIFICATION')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  decision === 'REQUEST_CLARIFICATION'
                    ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>SEEK CLARIFICATION</span>
                </div>
                <p className="text-3xs text-slate-500 mt-1">Request bidder to provide missing documents</p>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  decision === 'REJECTED'
                    ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>DISQUALIFY BID</span>
                </div>
                <p className="text-3xs text-slate-500 mt-1">Reject bid due to non-compliance with RFP terms</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Officer Justification & Audit Comments <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter mandatory justification notes for audit log..."
              className="w-full p-3 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800"
              required
            ></textarea>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-3xs text-slate-500">
              Assigned Officer: <strong className="text-slate-800">{reviewRecord.officerName}</strong> ({reviewRecord.officerDesignation})
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Recording Audit Decision..." : "Commit Officer Decision"}</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs font-bold text-emerald-900 text-center animate-in fade-in">
              ✓ Officer decision and justification successfully logged to immutable compliance trail.
            </div>
          )}
          {saveError && <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs font-bold text-rose-900" role="alert">{saveError}</div>}
        </form>
      </div>
    </div>
  );
};
