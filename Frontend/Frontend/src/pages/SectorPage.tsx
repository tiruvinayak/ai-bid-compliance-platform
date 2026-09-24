import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { hierarchyService } from '../services/hierarchyService';
import type { SectorDetail } from '../types';
import { Building2, ChevronRight, FileText, RefreshCw } from 'lucide-react';

export const SectorPage: React.FC = () => {
  const { sectorId } = useParams<{ sectorId: string }>();
  const navigate = useNavigate();
  const [sector, setSector] = useState<SectorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!sectorId) return;
    setLoading(true);
    setError('');
    try {
      const data = await hierarchyService.getSector(sectorId);
      setSector(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sector.');
    } finally {
      setLoading(false);
    }
  }, [sectorId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title={sector?.name || 'Sector'}
        subtitle={sector?.description || 'Sector departments and tender statistics'}
        breadcrumbs={[
          { label: 'Central Government', path: '/government' },
          { label: sector?.name || 'Sector' }
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
        <LoadingState message="Loading sector departments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !sector ? (
        <EmptyState title="Sector not found" message="The requested sector could not be loaded." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="DEPARTMENTS"
              value={sector.departmentCount}
              icon={<Building2 className="w-5 h-5 text-blue-800" />}
            />
            <StatCard
              title="TENDERS"
              value={sector.tenderCount}
              icon={<FileText className="w-5 h-5 text-blue-800" />}
            />
            <StatCard
              title="ACTIVE"
              value={sector.activeTenderCount}
              variant="amber"
              icon={<FileText className="w-5 h-5 text-amber-700" />}
            />
            <StatCard
              title="COMPLETED"
              value={sector.completedTenderCount}
              variant="emerald"
              icon={<FileText className="w-5 h-5 text-emerald-700" />}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Departments
              </h3>
              <span className="text-3xs font-mono font-bold text-slate-500">{sector.code}</span>
            </div>
            {sector.departments.length === 0 ? (
              <EmptyState title="No departments" message="No departments are registered under this sector." />
            ) : (
              <div className="divide-y divide-slate-100">
                {sector.departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => navigate(`/government/departments/${dept.id}`)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 transition flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{dept.name}</div>
                      <p className="text-xs text-slate-500 mt-0.5">{dept.description || 'DEMO department'}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-3xs font-bold uppercase text-slate-500">
                        <span>Tenders: {dept.tenderCount}</span>
                        <span className="text-amber-700">Active: {dept.activeTenderCount}</span>
                        <span className="text-emerald-700">Completed: {dept.completedTenderCount}</span>
                        <span>Officers: {dept.officerCount}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
