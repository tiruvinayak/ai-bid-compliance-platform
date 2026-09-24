import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { hierarchyService } from '../services/hierarchyService';
import type { CentralOverview, UserProfile } from '../types';
import {
  Building2,
  Layers,
  FileText,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Landmark
} from 'lucide-react';

export const CentralGovernmentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{ user?: UserProfile }>();
  const user = context?.user;

  const [overview, setOverview] = useState<CentralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await hierarchyService.getOverview();
      setOverview(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load central government overview.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const title =
    user?.role === 'SECTOR_USER'
      ? 'Sector Oversight Console'
      : 'Central Government Procurement Hierarchy';

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title={title}
        subtitle="Sector → Department → Tender navigation with live procurement statistics"
        breadcrumbs={[{ label: 'GeM Platform' }, { label: 'Central Government' }]}
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

      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-700/30 border border-blue-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-white">
                {user?.role === 'SECTOR_USER' ? user.department || 'Assigned Sector' : 'Central Government'}
              </h2>
              <span className="text-3xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-extrabold uppercase">
                {user?.role === 'SECTOR_USER' ? 'SECTOR USER' : 'CENTRAL ADMIN'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Signed in as <strong className="text-slate-200">{user?.name || '—'}</strong> ({user?.email || '—'})
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading government hierarchy statistics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !overview ? (
        <EmptyState title="No hierarchy data" message="Sectors have not been provisioned yet." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="SECTORS"
              value={overview.totalSectors}
              subtitle="Active government sectors"
              icon={<Layers className="w-5 h-5 text-blue-800" />}
              variant="blue"
            />
            <StatCard
              title="DEPARTMENTS"
              value={overview.totalDepartments}
              subtitle="DEMO department structures"
              icon={<Building2 className="w-5 h-5 text-emerald-700" />}
              variant="emerald"
            />
            <StatCard
              title="TOTAL TENDERS"
              value={overview.totalTenders}
              subtitle="Across all accessible sectors"
              icon={<FileText className="w-5 h-5 text-blue-800" />}
              variant="blue"
            />
            <StatCard
              title="ACTIVE TENDERS"
              value={overview.activeTenders}
              subtitle="Open procurement cycles"
              icon={<FileText className="w-5 h-5 text-amber-700" />}
              variant="amber"
            />
            <StatCard
              title="COMPLETED"
              value={overview.completedTenders}
              subtitle="Closed / completed tenders"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
              variant="emerald"
            />
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3">
              Sectors
            </h3>
            {overview.sectors.length === 0 ? (
              <EmptyState title="No sectors visible" message="No sectors are available for this account." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview.sectors.map((sector) => (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => navigate(`/government/sectors/${sector.id}`)}
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:border-blue-800 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">{sector.name}</h4>
                          <span className="text-3xs font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sector.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {sector.description || 'Government procurement sector'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-800 shrink-0" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-lg py-2 border border-slate-100">
                        <div className="text-lg font-black text-slate-900">{sector.tenderCount}</div>
                        <div className="text-3xs font-bold uppercase text-slate-500">Tenders</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg py-2 border border-amber-100">
                        <div className="text-lg font-black text-amber-900">{sector.activeTenderCount}</div>
                        <div className="text-3xs font-bold uppercase text-amber-700">Active</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg py-2 border border-emerald-100">
                        <div className="text-lg font-black text-emerald-900">{sector.completedTenderCount}</div>
                        <div className="text-3xs font-bold uppercase text-emerald-700">Completed</div>
                      </div>
                    </div>
                    <p className="mt-3 text-3xs text-slate-500 font-semibold">
                      {sector.departmentCount} department{sector.departmentCount === 1 ? '' : 's'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {overview.recentTenders.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Recent Tenders
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 uppercase text-3xs tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-bold">Tender ID</th>
                      <th className="px-5 py-3 font-bold">Title</th>
                      <th className="px-5 py-3 font-bold">Sector</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Bidders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentTenders.map((tender) => (
                      <tr
                        key={tender.tenderId}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          if (tender.primaryBidId) {
                            navigate(`/bids/${encodeURIComponent(tender.primaryBidId)}/compliance`);
                          } else if (tender.departmentId) {
                            navigate(`/government/departments/${tender.departmentId}`);
                          }
                        }}
                      >
                        <td className="px-5 py-3 font-mono font-bold text-blue-900">{tender.tenderId}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{tender.title}</td>
                        <td className="px-5 py-3 text-slate-600">{tender.sectorName || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-3xs uppercase">
                            {tender.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-800">{tender.bidderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
