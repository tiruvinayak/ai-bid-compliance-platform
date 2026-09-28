import React, { useCallback, useEffect, useState } from 'react';
import { Building2, PlayCircle, Loader2, HelpCircle, AlertTriangle, CheckCircle2, AlertOctagon, CloudOff, FlaskConical, Clock } from 'lucide-react';
import { verificationService } from '../../services/verificationService';
import type { GovernmentVerificationResult, VerificationStatus } from '../../types';

interface GovernmentVerificationProps {
  bidId: string;
}

const PROVIDER_ORDER = ['GST', 'PAN', 'MCA', 'EPFO_ESIC', 'DIGILOCKER'] as const;

const providerLabels: Record<string, string> = {
  GST: 'GST',
  PAN: 'PAN / Income Tax',
  MCA: 'MCA',
  EPFO_ESIC: 'EPFO / ESIC',
  DIGILOCKER: 'DigiLocker'
};

const statusStyles: Record<VerificationStatus, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 },
  SANDBOX: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', icon: FlaskConical },
  NOT_VERIFIED: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: AlertOctagon },
  MISMATCH: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: AlertOctagon },
  UNAVAILABLE: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: CloudOff },
  ERROR: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', icon: AlertTriangle },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock }
};

export const GovernmentVerification: React.FC<GovernmentVerificationProps> = ({ bidId }) => {
  const [results, setResults] = useState<GovernmentVerificationResult[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const loadStored = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await verificationService.getVerification(bidId);
      setResults(response.results);
      setLastChecked(response.checkedAt);
    } catch (err: any) {
      setError(err.message || 'Unable to load government verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const runVerification = async () => {
    setRunning(true);
    setError('');
    try {
      const response = await verificationService.runVerification(bidId);
      setResults(response.results);
      setLastChecked(response.checkedAt);
    } catch (err: any) {
      setError(err.message || 'Unable to run government verification. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  // Merge stored results onto the canonical provider order; never-run providers show PENDING.
  const byProvider = new Map(results.map((r) => [r.provider, r]));
  const rows = PROVIDER_ORDER.map((code) => byProvider.get(code) ?? ({
    provider: code,
    displayName: providerLabels[code],
    status: 'PENDING' as const,
    message: results.length === 0 && !loading
      ? 'No verification has been run for this bid yet.'
      : null,
    referenceType: null,
    referenceValue: null,
    verifiedName: null,
    verifiedStatus: null,
    verifiedDate: null,
    mismatchReason: null,
    source: null,
    checkedAt: null,
    evidenceReference: null
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Government Verification
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              External registry checks (GST, PAN, MCA, EPFO/ESIC, DigiLocker) — officer only
            </p>
          </div>
        </div>
        <button
          onClick={runVerification}
          disabled={running || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-800 hover:bg-indigo-900 disabled:opacity-60 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          <span>{running ? 'Running…' : 'Run Verification'}</span>
        </button>
      </div>

      <div className="p-5">
        <div className="mb-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          External provider results are shown with their true status. Providers report{' '}
          <span className="font-bold text-slate-700">UNAVAILABLE</span> when official API credentials
          are not configured — a provider that was never contacted is never shown as a success.
          Sandbox responses are labelled <span className="font-bold text-sky-700">SANDBOX</span>,
          never as production government verification.
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">Loading verification status…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const style = statusStyles[row.status] || statusStyles.PENDING;
              const Icon = style.icon;
              return (
                <div key={row.provider} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" data-testid={`gov-row-${row.provider}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${style.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{row.displayName}</h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-bold uppercase ${style.bg} ${style.text} border ${style.border}`}
                        >
                          <Icon className="w-3 h-3" />
                          {row.status}
                        </span>
                      </div>
                      {row.message && (
                        <p className="text-xs text-slate-500 mt-1">{row.message}</p>
                      )}
                      {row.referenceType && row.referenceValue && (
                        <p className="text-3xs text-slate-400 mt-1">
                          {row.referenceType}: <span className="font-mono">{row.referenceValue}</span> (masked)
                        </p>
                      )}
                      {row.verifiedName && (
                        <p className="text-xs text-slate-600 mt-1">
                          Name on record: <span className="font-semibold">{row.verifiedName}</span>
                        </p>
                      )}
                      {row.source && (
                        <p className="text-3xs text-slate-400 mt-0.5">Source: {row.source}</p>
                      )}
                    </div>
                  </div>
                  {!row.message && !row.referenceValue && !row.verifiedName && (
                    <HelpCircle className="w-4 h-4 text-slate-300 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {lastChecked && (
          <div className="mt-4 text-3xs text-slate-400">
            Last run: {new Date(lastChecked).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};
