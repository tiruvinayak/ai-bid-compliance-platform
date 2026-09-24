import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { hierarchyService } from '../services/hierarchyService';
import type { DepartmentDetail, HierarchyTender } from '../types';
import { FileText, RefreshCw, Users } from 'lucide-react';

export const DepartmentPage: React.FC = () => {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    setError('');
    try {
      const data = await hierarchyService.getDepartment(departmentId);
      setDepartment(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load department.');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const openTender = (tender: HierarchyTender) => {
    // Reuse existing bid/tender verification suite — do not create a duplicate detail page.
    if (tender.primaryBidId) {
      navigate(`/bids/${encodeURIComponent(tender.primaryBidId)}/compliance`);
      return;
    }
    setError(`Tender ${tender.tenderId} has no linked bidder evaluation record yet.`);
  };

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title={department?.name || 'Department'}
        subtitle={department?.description || 'Department tenders and assigned officers'}
        breadcrumbs={[
          { label: 'Central Government', path: '/government' },
          ...(department?.sectorId
            ? [{ label: department.sectorName || 'Sector', path: `/government/sectors/${department.sectorId}` }]
            : []),
          { label: department?.name || 'Department' }
        ]}
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {loading ? (
        <LoadingState message="Loading department tenders..." />
      ) : error && !department ? (
        <ErrorState message={error} onRetry={load} />
      ) : !department ? (
        <EmptyState title="Department not found" message="The requested department could not be loaded." />
      ) : (
        <>
          {error && <ErrorState message={error} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="TENDERS" value={department.tenderCount} icon={<FileText className="w-5 h-5 text-blue-800" />} />
            <StatCard title="ACTIVE" value={department.activeTenderCount} variant="amber" icon={<FileText className="w-5 h-5 text-amber-700" />} />
            <StatCard title="COMPLETED" value={department.completedTenderCount} variant="emerald" icon={<FileText className="w-5 h-5 text-emerald-700" />} />
            <StatCard title="OFFICERS" value={department.officers.length} icon={<Users className="w-5 h-5 text-blue-800" />} />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Assigned Officers
              </h3>
            </div>
            {department.officers.length === 0 ? (
              <div className="px-5 py-6 text-xs text-slate-500">No officers currently assigned to this department.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {department.officers.map((officer) => (
                  <li key={officer.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{officer.name}</div>
                      <div className="text-xs text-slate-500">{officer.designation || officer.role}</div>
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      {officer.officerId || officer.email}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Tender List
              </h3>
            </div>
            {department.tenders.length === 0 ? (
              <EmptyState title="No tenders" message="No tenders are registered under this department yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 uppercase text-3xs tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-bold">Tender ID</th>
                      <th className="px-5 py-3 font-bold">Title</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Deadline</th>
                      <th className="px-5 py-3 font-bold">Bidders</th>
                      <th className="px-5 py-3 font-bold">Officer</th>
                      <th className="px-5 py-3 font-bold">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {department.tenders.map((tender) => (
                      <tr
                        key={tender.tenderId}
                        className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer"
                        onClick={() => openTender(tender)}
                        title={tender.primaryBidId ? 'Open existing tender evaluation' : 'No linked bid yet'}
                      >
                        <td className="px-5 py-3 font-mono font-bold text-blue-900">{tender.tenderId}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800 max-w-xs truncate">{tender.title}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-3xs uppercase">
                            {tender.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 font-mono">{tender.closingDate || '—'}</td>
                        <td className="px-5 py-3 font-bold text-slate-800">{tender.bidderCount}</td>
                        <td className="px-5 py-3 text-slate-600">{tender.assignedOfficerName || 'Unassigned'}</td>
                        <td className="px-5 py-3 text-slate-600">{tender.complianceStatus || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
