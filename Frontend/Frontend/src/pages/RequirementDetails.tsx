import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { complianceService } from '../services/complianceService';
import type { Requirement, EvidenceDetail } from '../types';
import { FileText, ArrowRight, ArrowLeft, Search, AlertCircle } from 'lucide-react';

export const RequirementDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id, reqId } = useParams();

  const [req, setReq] = useState<Requirement | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      if (!id || !reqId) {
        setError('This page requires both a bid ID and requirement ID.');
        setLoading(false);
        return;
      }
      try {
        const [reqData, evData] = await Promise.all([
          complianceService.getRequirementById(id, reqId),
          complianceService.getEvidenceForRequirement(reqId, id).catch(() => null)
        ]);
        setReq(reqData);
        setEvidence(evData);
      } catch (err: any) {
        setError(err.message || 'Failed to load requirement details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, reqId]);

  if (loading) return <LoadingState message="Loading Requirement Criteria Breakdown..." />;
  if (error || !req || !id) return <ErrorState message={error || 'Requirement not found for this bid.'} />;

  return (
    <div>
      <PageHeader
        title={`Requirement Inspection — ${req.id}`}
        subtitle={`Evaluation Item for Bid ${id}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Compliance", path: `/bids/${id}/compliance` },
          { label: req.id }
        ]}
        actions={
          <button
            onClick={() => navigate(`/bids/${id}/compliance`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Matrix</span>
          </button>
        }
      />

      <div className="max-w-6xl mx-auto">
        <div className="requirement-grid">
          {/* LEFT PANEL - REQUIREMENT */}
          <div className="requirement-box">
            <div className="flex items-center justify-between mb-4">
              <span className="requirement-id">{req.id}</span>
              <div className="flex items-center gap-2">
                <RiskBadge risk={req.risk} size="md" />
                <StatusBadge status={req.status} size="lg" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Category</span>
                <div className="text-sm font-bold text-slate-900 mt-1">{req.category}</div>
              </div>

              <div>
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Clause Statement</span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5 leading-relaxed">{req.requirement}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Required Minimum Value</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-1">{req.requiredValue}</div>
                </div>
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Detected Value in Submissions</span>
                  <div className={`text-base font-bold font-mono mt-1 ${
                    req.status === 'FAIL' || req.status === 'CONFLICT' ? "text-rose-700" : req.status === 'PASS' ? "text-emerald-700" : "text-amber-700"
                  }`}>
                    {req.detectedValue}
                  </div>
                </div>
              </div>

              {req.mandatory && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-3xs font-extrabold uppercase text-rose-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Mandatory Clause — Non-compliance may result in bid disqualification
                  </span>
                </div>
              )}

              <div className="p-4 bg-slate-900 text-slate-100 rounded-lg">
                <div className="flex items-center justify-between text-3xs text-slate-400 font-semibold mb-1">
                  <span>SYSTEM EVALUATION REASONING & ALGORITHM EXPLANATION</span>
                  <span>Match Confidence: <strong className="text-emerald-400">{req.confidence}%</strong></span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium mt-1">
                  {req.reason}
                </p>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-900" />
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-500">Source Evidence Document</span>
                    <div className="text-xs font-bold text-slate-900 font-mono">
                    {req.sourceDoc || 'Not reported'} — <span className="text-blue-900 font-black">Page {req.pageNumber ?? 'Not reported'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/bids/${id}/evidence/${req.id}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span>OPEN EVIDENCE INSPECTOR</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - EVIDENCE SUMMARY */}
          <div className="requirement-box">
            <div className="flex items-center justify-between mb-4">
              <span className="requirement-id">EVIDENCE SUMMARY</span>
              <span className="text-3xs font-bold uppercase text-slate-400">
                {evidence ? 'EVIDENCE FOUND' : 'NO EVIDENCE RETRIEVED'}
              </span>
            </div>

            {evidence ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">RFP Required Value</span>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-1">{evidence.requiredValue}</div>
                  </div>
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Extracted / Detected Value</span>
                    <div className={`text-sm font-bold font-mono mt-0.5 ${
                      evidence.decision === 'FAIL' || evidence.decision === 'CONFLICT' ? "text-rose-700" : evidence.decision === 'PASS' ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {evidence.detectedValue}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-800" />
                    <div>
                      <span className="text-3xs font-bold uppercase text-slate-400">Source Document & Page</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {evidence.sourceDocument} — <span className="text-blue-900 font-black">Page {evidence.pageNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Extracted Text Snippet (Verified by OCR & RAG Pipeline)
                  </span>
                  <div className="p-4 bg-amber-50/70 border-l-4 border-l-amber-500 border-y border-r border-amber-200/80 rounded-r-md text-xs font-mono text-slate-900 leading-relaxed italic shadow-2xs">
                    {evidence.extractedSnippet}
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-lg">
                  <div className="flex items-center justify-between text-2xs text-slate-400 font-semibold mb-1">
                    <span>AUTOMATED SYSTEM DETERMINATION REASONING</span>
                    <span>Confidence: <strong className="text-emerald-400">{evidence.confidence ?? 0}%</strong></span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {evidence.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Evidence Retrieved</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  The AI verification engine could not locate corroborating evidence for this requirement in the submitted documents.
                </p>
                <div className="mt-4 p-3 bg-slate-100 rounded-lg text-left text-3xs">
                  <span className="font-bold text-slate-700">Possible causes:</span>
                  <ul className="mt-2 space-y-1 text-slate-600">
                    <li>• Document not uploaded or processed</li>
                    <li>• OCR quality insufficient for extraction</li>
                    <li>• Requirement criteria not addressed in submissions</li>
                    <li>• Document format not supported</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
