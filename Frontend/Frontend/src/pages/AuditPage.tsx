import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { auditService } from '../services/auditService';
import { bidService } from '../services/bidService';
import type { AuditEvent } from '../types';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { id } = useParams();

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

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
        const bid = await bidService.getBidById(id);
        if (!bid) throw new Error(`Bid ${id} was not found.`);
        const data = await auditService.getAuditTrail(id);
        setAuditEvents(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load system audit log.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingState message="Fetching Statutory Compliance Audit Trail..." />;
  if (error || !id) return <ErrorState message={error || 'Bid audit data is unavailable.'} />;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'ALERT':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div>
      <PageHeader
        title={`Statutory Audit Ledger & Activity Trail — ${id}`}
        subtitle="Tamper-evident, immutable system compliance timeline for official governance"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Audit Trail" }
        ]}
      />

      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-800">Governance Log Events</h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-200 px-2.5 py-1 rounded">
            {auditEvents.length} Recorded Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor / System User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 max-w-sm">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {auditEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap">
                    {evt.timestamp}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{evt.user}</td>
                  <td className="py-3 px-4 font-semibold text-slate-500 text-3xs uppercase">{evt.userRole}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-900">{evt.action}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{evt.entity}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(evt.status)}
                      <span className="font-bold text-3xs">{evt.status}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-sm text-slate-600 text-3xs leading-relaxed">
                    {evt.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
