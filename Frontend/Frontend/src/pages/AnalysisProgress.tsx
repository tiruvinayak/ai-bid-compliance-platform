import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { CheckCircle2, Loader2, ArrowRight, Cpu } from 'lucide-react';
import { analysisService } from '../services/analysisService';
import type { AnalysisProgress as AnalysisProgressData, AnalysisStage } from '../services/analysisService';
import { bidService } from '../services/bidService';
import type { Bid } from '../types';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';

export const AnalysisProgress: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [stages, setStages] = useState<AnalysisStage[]>([]);
  const [status, setStatus] = useState<AnalysisProgressData['status']>('PENDING');
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let loadedBid: Bid | null = null;

    const poll = async () => {
      if (!id || cancelled) return;
      attempts += 1;
      try {
        if (attempts === 1) loadedBid = await bidService.getBidById(id);
        const progress = await analysisService.getAnalysisProgress(id);
        if (cancelled) return;
        if (!loadedBid) {
          setError(`Bid ${id} was not found.`);
          setLoading(false);
          setPolling(false);
          return;
        }
        setBid(loadedBid);
        setStages(progress.stages);
        setStatus(progress.status);
        setLoading(false);
        if (progress.status === 'COMPLETED' || progress.status === 'FAILED' || attempts >= 60) {
          setPolling(false);
          return;
        }
        timer = setTimeout(() => void poll(), 2000);
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError instanceof Error ? pollError.message : 'Failed to retrieve analysis status.');
          setLoading(false);
          setPolling(false);
        }
      }
    };

    if (!id) {
      setError('This page requires a bid ID.');
      setLoading(false);
      setPolling(false);
    } else {
      void poll();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const percent = stages.length === 0
    ? 0
    : Math.round((stages.filter((stage) => stage.status === 'COMPLETED').length / stages.length) * 100);

  if (loading) return <LoadingState message="Retrieving server analysis status..." />;
  if (error || !bid || !id) return <ErrorState message={error || 'Bid analysis is unavailable.'} />;

  const isFinished = status === 'COMPLETED';

  return (
    <div>
      <PageHeader
        title="AI Bid Compliance RAG Analysis Pipeline"
        subtitle={`Evaluation Reference Record: ${id} | ${bid.tenderTitle}`}
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'AI Bid Analysis' }]}
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-950 text-white p-6 rounded-lg shadow-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-900 rounded-md text-blue-300"><Cpu className="w-6 h-6" /></div>
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-wide text-amber-400">AI BID ANALYSIS {status === 'COMPLETED' ? 'COMPLETE' : status === 'FAILED' ? 'FAILED' : 'IN PROGRESS'}</h2>
                <p className="text-2xs text-slate-400">Status reported by the bid analysis service</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400 font-mono">{percent}%</span>
              <span className="block text-3xs text-slate-400 font-bold uppercase">Pipeline Completed</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Verification Pipeline Stages</h3>
            {polling && <span className="text-3xs text-slate-500">Polling server status (max 2 minutes)</span>}
          </div>
          {status === 'FAILED' && <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">The server reported that analysis failed.</div>}

          <div className="space-y-3">
            {stages.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-300 rounded text-center text-xs text-slate-500">No analysis stages have been reported yet.</div>
            ) : stages.map((stage) => {
              const isCompleted = stage.status === 'COMPLETED';
              const isActive = stage.status === 'IN_PROGRESS';
              return (
                <div key={stage.id} className={`p-4 rounded-lg border flex items-start justify-between gap-4 ${isActive ? 'bg-blue-50/70 border-blue-400' : isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : isActive ? <Loader2 className="w-5 h-5 text-blue-800 animate-spin" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                    </div>
                    <div><h4 className="text-xs font-bold text-slate-900">{stage.label}</h4><p className="text-3xs text-slate-500 mt-0.5">{stage.description}</p></div>
                  </div>
                  <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{stage.status}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button onClick={() => navigate(`/bids/${id}/compliance`)} disabled={!isFinished} className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <span>{isFinished ? 'View Compliance Dashboard' : 'Awaiting Completed Analysis'}</span><ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
