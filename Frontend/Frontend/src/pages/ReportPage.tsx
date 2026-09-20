import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { bidService } from '../services/bidService';
import { complianceService } from '../services/complianceService';
import { riskService } from '../services/riskService';
import { conflictService } from '../services/conflictService';
import { reportService } from '../services/reportService';
import type { Bid, Requirement, OfficerReviewRecord } from '../types';
import { Printer, Download } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const { id } = useParams();

  const [bid, setBid] = useState<Bid | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [review, setReview] = useState<OfficerReviewRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>('');

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
        const [bData, reqsData, , , revData] = await Promise.all([
          bidService.getBidById(id),
          complianceService.getRequirements(id),
          riskService.getRiskSummary(id),
          conflictService.getConflicts(id),
          reportService.getOfficerReview(id)
        ]);
        setBid(bData);
        setRequirements(reqsData);
        setReview(revData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to assemble executive compliance report.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const generateAndPrint = async () => {
    if (!id) return;
    setGenerating(true);
    setError('');
    try {
      const result = await reportService.generateReport(id);
      setGeneratedAt(result.generatedAt);
      window.print();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const generateAndDownload = async () => {
    if (!id) return;
    setGenerating(true);
    setError('');
    try {
      const result = await reportService.generateReport(id);
      setGeneratedAt(result.generatedAt);
      if (result.downloadUrl && result.downloadUrl !== '#') {
        const blob = await reportService.downloadReport(result.downloadUrl);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `${id}-compliance-report.html`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      } else {
        window.print();
      }
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingState message="Compiling Executive Verification Report Document..." />;
  if (error || !bid || !id) return <ErrorState message={error || 'Bid report data is unavailable.'} />;

  return (
    <div>
      <PageHeader
        title={`Executive Bid Evaluation & Audit Report — ${bid.id}`}
        subtitle="Official GeM Governance & Statutory Compliance Verification Document"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Executive Report" }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
               onClick={() => void generateAndPrint()}
               disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
               <span>{generating ? 'Generating Report...' : 'Print Report PDF'}</span>
            </button>
            <button
               onClick={() => void generateAndDownload()}
               disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
               <span>Download Report</span>
            </button>
          </div>
         }
      />

      {generatedAt && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">Report generated successfully at {generatedAt}.</div>}

      <div className="bg-white rounded-lg border border-slate-300 shadow-md p-8 max-w-4xl mx-auto space-y-8 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-amber-600 text-white font-black text-xl flex items-center justify-center">
              GeM
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 uppercase tracking-wide">
                GOVERNMENT E-MARKETPLACE (GeM)
              </h1>
              <p className="text-2xs text-slate-600 font-bold uppercase">
                BID COMPLIANCE & ELIGIBILITY EVALUATION CERTIFICATE
              </p>
            </div>
          </div>
          <div className="text-right text-3xs font-mono text-slate-500">
            <div>REPORT REF: <strong className="text-slate-900">{bid.id}-RPT</strong></div>
            <div>DATE: {new Date().toLocaleDateString()}</div>
             <div className="text-slate-600 font-bold mt-0.5">SYSTEM-GENERATED</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
          <div>
            <h3 className="text-3xs font-bold uppercase text-slate-500 mb-1">TENDER SPECIFICATION DETAILS</h3>
            <div className="font-bold text-slate-900">{bid.tenderTitle}</div>
            <div className="text-2xs text-slate-600 mt-1">Ref ID: <span className="font-mono">{bid.tenderId}</span></div>
            <div className="text-2xs text-slate-600">Procuring Dept: {bid.department}</div>
          </div>
          <div>
            <h3 className="text-3xs font-bold uppercase text-slate-500 mb-1">APPLICANT BIDDER INFORMATION</h3>
            <div className="font-bold text-slate-900">{bid.bidderName}</div>
            <div className="text-2xs text-slate-600 mt-1">GSTIN: <span className="font-mono">{bid.gstin}</span></div>
            <div className="text-2xs text-slate-600">CIN Reg: <span className="font-mono">{bid.registrationNo}</span></div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
            I. EXECUTIVE EVALUATION SUMMARY
          </h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-3xs font-bold uppercase text-slate-500">Overall Score</span>
              <div className="text-xl font-black text-rose-700 mt-1">{bid.compliancePercentage}%</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-3xs font-bold uppercase text-slate-500">Risk Assessment</span>
              <div className="mt-1"><RiskBadge risk={bid.riskLevel} size="sm" /></div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-3xs font-bold uppercase text-slate-500">Failed Criteria</span>
              <div className="text-xl font-black text-rose-700 mt-1">{bid.failCount} Clauses</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-3xs font-bold uppercase text-slate-500">Flagged Conflicts</span>
              <div className="text-xl font-black text-purple-900 mt-1">{bid.conflictCount} Discrepancies</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
            II. CLAUSE-BY-CLAUSE EVALUATION RESULTS
          </h3>
          <table className="w-full text-left text-2xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase">
                <th className="py-2 px-3 border-r">Req ID</th>
                <th className="py-2 px-3 border-r">Category</th>
                <th className="py-2 px-3 border-r">Clause Description</th>
                <th className="py-2 px-3 border-r">Required vs Detected</th>
                <th className="py-2 px-3">Determination</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td className="py-2 px-3 font-mono font-bold border-r">{req.requirementId || req.id}</td>
                  <td className="py-2 px-3 border-r">{req.category}</td>
                  <td className="py-2 px-3 border-r max-w-xs">{req.requirement}</td>
                  <td className="py-2 px-3 font-mono text-3xs border-r">
                    Req: {req.requiredValue}<br />Det: <strong className="text-slate-900">{req.detectedValue}</strong>
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge status={req.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {review && (
          <div className="p-4 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              III. PROCUREMENT OFFICER FINAL VERIFICATION DETERMINATION
            </h3>
            <div className="text-xs font-bold text-slate-100">
               Officer Action: <span className="text-amber-400 font-extrabold">{review.finalDecision || 'Not decided'}</span>
            </div>
            <p className="text-2xs text-slate-300 italic">
               "{review.comment || 'No officer comment recorded.'}"
            </p>
            <div className="pt-2 border-t border-slate-800 text-3xs text-slate-400 flex justify-between">
              <span>Auditor: {review.officerName} ({review.officerDesignation})</span>
              <span>Logged at: {review.updatedAt}</span>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-3xs text-slate-400 font-mono">
          <span>COMPLIANCE SUITE SIH-26100 — GOVERNMENT E-MARKETPLACE</span>
           <span>{requirements.length} REQUIREMENT{requirements.length === 1 ? '' : 'S'}</span>
        </div>
      </div>
    </div>
  );
};
