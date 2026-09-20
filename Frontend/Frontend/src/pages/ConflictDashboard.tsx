import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { ConflictCard } from '../components/conflicts/ConflictCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { conflictService } from '../services/conflictService';
import { bidService } from '../services/bidService';
import type { ConflictItem } from '../types';
import { AlertOctagon, UserCheck } from 'lucide-react';

export const ConflictDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
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
        const data = await conflictService.getConflicts(id);
        setConflicts(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load document conflict registry.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingState message="Cross-Referencing Document Discrepancies..." />;
  if (error || !id) return <ErrorState message={error || 'Bid conflict data is unavailable.'} />;

  return (
    <div>
      <PageHeader
        title={`Cross-Document Conflict & Discrepancy Matrix — ${id}`}
        subtitle="Automated cross-validation between bidder filings and official government database registries"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Conflicts Matrix" }
        ]}
        actions={
          <button
            onClick={() => navigate(`/bids/${id}/review`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Open Officer Review</span>
          </button>
        }
      />

      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 mb-6 flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider">
            AUTOMATED DATA INCONSISTENCY DETECTION PROTOCOL
          </h3>
          <p className="text-2xs text-purple-800 mt-0.5">
            The platform automatically compares numbers across uploaded audited financial balance sheets, GSTR-3B tax returns, MCA company filings, and experience certificates. Discrepancies are flagged for mandatory human review.
          </p>
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
          <div className="text-emerald-800 font-bold text-sm">No conflicts detected</div>
          <p className="text-xs text-emerald-700">All cross-document figures, corporate identifiers, tax returns, and certification records match consistently without data discrepancies.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onInspectDetails={() => navigate(`/bids/${id}/evidence/${conflict.requirementId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
