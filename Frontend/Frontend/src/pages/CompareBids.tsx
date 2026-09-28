import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { comparisonService } from '../services/comparisonService';
import { bidService } from '../services/bidService';
import type {
  Bid,
  BidComparison,
  BidderComparison,
  RequirementCell,
  RequirementMatrixRow
} from '../types';
import {
  ArrowLeft,
  GitCompare,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

type SortKey = 'NONE' | 'PASS' | 'REVIEW' | 'FAIL' | 'MISSING' | 'RISK' | 'CONFLICT';

export const CompareBids: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bid, setBid] = useState<Bid | null>(null);
  const [comparison, setComparison] = useState<BidComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [prelimFilter, setPrelimFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('NONE');
  const [missingOnly, setMissingOnly] = useState<boolean>(false);
  const [conflictsOnly, setConflictsOnly] = useState<boolean>(false);
  const [highRiskOnly, setHighRiskOnly] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<{ reqId: string; bidId: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!id) {
      setError('Unable to load bidder comparison. Please try again.');
      setLoading(false);
      return;
    }
    try {
      const bidData = await bidService.getBidById(id);
      if (!bidData) throw new Error('not found');
      setBid(bidData);
      const cmp = await comparisonService.getComparison(bidData.tenderId);
      setComparison(cmp);
    } catch {
      setError('Unable to load bidder comparison.\nPlease try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredBidders: BidderComparison[] = useMemo(() => {
    if (!comparison) return [];
    let list = [...comparison.bidders];
    if (prelimFilter !== 'ALL') {
      list = list.filter((b) => b.preliminary.overallStatus === prelimFilter);
    }
    if (missingOnly) list = list.filter((b) => b.compliance.missing > 0);
    if (conflictsOnly) list = list.filter((b) => b.conflictCount > 0);
    if (highRiskOnly) list = list.filter((b) => b.risk.high > 0);
    const comparators: Record<SortKey, ((a: BidderComparison, b: BidderComparison) => number) | null> = {
      NONE: null,
      PASS: (a, b) => b.compliance.pass - a.compliance.pass,
      REVIEW: (a, b) => b.compliance.review - a.compliance.review,
      FAIL: (a, b) => b.compliance.fail - a.compliance.fail,
      MISSING: (a, b) => b.compliance.missing - a.compliance.missing,
      RISK: (a, b) => b.risk.total - a.risk.total,
      CONFLICT: (a, b) => b.conflictCount - a.conflictCount
    };
    const cmp = comparators[sortKey];
    if (cmp) list.sort(cmp);
    return list;
  }, [comparison, prelimFilter, missingOnly, conflictsOnly, highRiskOnly, sortKey]);

  const visibleBidIds = useMemo(() => filteredBidders.map((b) => b.bidId), [filteredBidders]);

  if (loading) return <LoadingState message="Loading Multi-Bidder Comparison..." />;
  if (error) {
    return (
      <ErrorState
        title="Comparison unavailable"
        message={error}
        onRetry={loadData}
      />
    );
  }
  if (!comparison || !bid || !id) {
    return <ErrorState message="Unable to load bidder comparison.\nPlease try again." onRetry={loadData} />;
  }

  const cellFor = (row: RequirementMatrixRow, bidId: string): RequirementCell | undefined =>
    row.cells.find((c) => c.bidId === bidId);

  const toggleExpanded = (reqId: string, bidId: string) => {
    if (expanded && expanded.reqId === reqId && expanded.bidId === bidId) {
      setExpanded(null);
    } else {
      setExpanded({ reqId, bidId });
    }
  };

  const filterChip = (active: boolean, onClick: () => void, label: string) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap cursor-pointer ${
        active
          ? 'bg-blue-900 text-white shadow-xs'
          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        title={`Multi-Bidder Comparison — ${comparison.tenderId}`}
        subtitle={`${comparison.tenderTitle}${comparison.departmentName ? ` | ${comparison.departmentName}` : ''}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Compliance', path: `/bids/${id}/compliance` },
          { label: 'Compare Bids' }
        ]}
        actions={
          <button
            onClick={() => navigate(`/bids/${id}/compliance`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Compliance</span>
          </button>
        }
      />

      {comparison.bidCount === 0 && (
        <EmptyState
          title="No bids"
          message="No bids are currently available for this tender."
        />
      )}

      {comparison.bidCount === 1 && (
        <div className="mb-4 flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            Only one bid is currently available for this tender.
            Multi-bidder comparison requires at least two bids.
          </p>
        </div>
      )}

      {comparison.bidCount > 0 && (
        <>
          {/* ---- Filters ---- */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">Filters</span>
              {filterChip(
                prelimFilter === 'ALL' && !missingOnly && !conflictsOnly && !highRiskOnly,
                () => {
                  setPrelimFilter('ALL');
                  setMissingOnly(false);
                  setConflictsOnly(false);
                  setHighRiskOnly(false);
                },
                'All bidders'
              )}
              {filterChip(prelimFilter === 'PASS', () => setPrelimFilter('PASS'), 'PASS preliminary')}
              {filterChip(prelimFilter === 'REVIEW', () => setPrelimFilter('REVIEW'), 'REVIEW preliminary')}
              {filterChip(prelimFilter === 'FAIL', () => setPrelimFilter('FAIL'), 'FAIL preliminary')}
              {filterChip(missingOnly, () => setMissingOnly((v) => !v), 'Has missing requirements')}
              {filterChip(conflictsOnly, () => setConflictsOnly((v) => !v), 'Has conflicts')}
              {filterChip(highRiskOnly, () => setHighRiskOnly((v) => !v), 'Has high-risk factors')}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label htmlFor="cmp-sort" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Sort by
              </label>
              <select
                id="cmp-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
              >
                <option value="NONE">Default order</option>
                <option value="PASS">Sort by PASS count</option>
                <option value="REVIEW">Sort by REVIEW count</option>
                <option value="FAIL">Sort by FAIL count</option>
                <option value="MISSING">Sort by MISSING count</option>
                <option value="RISK">Sort by risk count</option>
                <option value="CONFLICT">Sort by conflict count</option>
              </select>
            </div>
          </div>

          {filteredBidders.length === 0 ? (
            <EmptyState
              title="No matching bidders"
              message="No bidders matched the selected filters."
              action={
                <button
                  onClick={() => {
                    setPrelimFilter('ALL');
                    setMissingOnly(false);
                    setConflictsOnly(false);
                    setHighRiskOnly(false);
                  }}
                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition cursor-pointer"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <>
              {/* ---- Comparison summary ---- */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-blue-900" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Comparison Summary
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
                        <th className="py-3 px-4">Metric</th>
                        {filteredBidders.map((b) => (
                          <th key={b.bidId} className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span>{b.bidderName}</span>
                              <span className="text-3xs font-normal text-slate-500 normal-case">{b.bidId}</span>
                              <button
                                onClick={() => navigate(`/bids/${b.bidId}/compliance`)}
                                className="inline-flex items-center gap-1 text-blue-800 hover:text-blue-950 font-bold text-3xs underline cursor-pointer self-start"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Bid Details
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Preliminary</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4">
                            {b.preliminary.overallStatus === 'NOT_RUN' ? (
                              <span className="italic text-slate-400">Not run</span>
                            ) : (
                              <StatusBadge status={b.preliminary.overallStatus} size="sm" />
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Requirements passed</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4 font-mono">
                            {b.compliance.pass}/{b.compliance.total}
                            {b.compliance.coveragePercent != null && (
                              <span className="text-slate-400"> ({b.compliance.coveragePercent}%)</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Review</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4 font-mono">{b.compliance.review}</td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Failed</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4 font-mono">{b.compliance.fail}</td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Missing</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4 font-mono">{b.compliance.missing}</td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Conflicts</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4 font-mono">{b.conflictCount}</td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">
                          Risks (H / M / L)
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4 font-mono">
                            {b.risk.high} / {b.risk.medium} / {b.risk.low}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-600">Bid status</td>
                        {filteredBidders.map((b) => (
                          <td key={b.bidId} className="py-3 px-4">{b.status || '—'}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ---- Requirement matrix ---- */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Requirement Comparison
                  </h3>
                  <p className="text-3xs text-slate-500 mt-1">
                    Click a cell to inspect status, values and evidence for that bidder.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
                        <th className="py-3 px-4">Requirement</th>
                        {filteredBidders.map((b) => (
                          <th key={b.bidId} className="py-3 px-4">{b.bidderName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {comparison.requirements.length === 0 ? (
                        <tr>
                          <td colSpan={visibleBidIds.length + 1} className="py-8 text-center text-slate-500 italic">
                            No stored requirements are available for these bids yet.
                          </td>
                        </tr>
                      ) : (
                        comparison.requirements.map((row) => (
                          <React.Fragment key={row.requirementId}>
                            <tr className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-700">{row.requirementId}</div>
                                <div className="text-3xs text-slate-500">{row.description}</div>
                              </td>
                              {visibleBidIds.map((bidId) => {
                                const cell = cellFor(row, bidId);
                                const isOpen = expanded?.reqId === row.requirementId && expanded?.bidId === bidId;
                                return (
                                  <td key={bidId} className="py-2 px-3">
                                    <button
                                      onClick={() => toggleExpanded(row.requirementId, bidId)}
                                      className={`w-full text-left px-2 py-1 rounded transition cursor-pointer ${
                                        isOpen ? 'ring-2 ring-blue-800 bg-blue-50' : 'hover:bg-slate-100'
                                      }`}
                                      title={`Inspect ${row.requirementId} for ${bidId}`}
                                    >
                                      {cell?.status ? (
                                        <StatusBadge status={cell.status} size="sm" />
                                      ) : (
                                        <span className="italic text-slate-400">—</span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                            {expanded && expanded.reqId === row.requirementId && (
                              <tr className="bg-blue-50/50">
                                <td colSpan={visibleBidIds.length + 1} className="py-3 px-4">
                                  {(() => {
                                    const cell = cellFor(row, expanded.bidId);
                                    const bidder = filteredBidders.find((b) => b.bidId === expanded.bidId);
                                    if (!cell) {
                                      return (
                                        <p className="text-xs text-slate-500 italic">
                                          No stored result for this requirement in {expanded.bidId}.
                                        </p>
                                      );
                                    }
                                    return (
                                      <div className="text-xs space-y-2">
                                        <div className="font-bold text-slate-700">
                                          {row.requirementId} — {bidder?.bidderName || expanded.bidId}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div>
                                            <span className="block text-3xs font-bold uppercase text-slate-500">Status</span>
                                            {cell.status ? <StatusBadge status={cell.status} size="sm" /> : <span className="italic text-slate-400">—</span>}
                                          </div>
                                          <div>
                                            <span className="block text-3xs font-bold uppercase text-slate-500">Expected value</span>
                                            <span className="text-slate-800">{cell.expectedValue || row.requiredValue || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="block text-3xs font-bold uppercase text-slate-500">Actual value</span>
                                            <span className="text-slate-800">{cell.actualValue || 'Value unavailable'}</span>
                                          </div>
                                          <div>
                                            <span className="block text-3xs font-bold uppercase text-slate-500">Document</span>
                                            <span className="text-slate-800">
                                              {cell.document || '—'}
                                              {cell.page != null ? ` — Page ${cell.page}` : ''}
                                            </span>
                                          </div>
                                        </div>
                                        {cell.reason && (
                                          <p className="text-3xs text-slate-600">{cell.reason}</p>
                                        )}
                                        {cell.hasEvidence && (
                                          <div className="p-2 bg-white border border-slate-200 rounded text-3xs text-slate-700 space-y-1">
                                            <div className="font-bold uppercase text-slate-500">Evidence</div>
                                            <div>
                                              {cell.evidenceDocument || cell.document}
                                              {cell.evidencePage != null ? ` — Page ${cell.evidencePage}` : ''}
                                            </div>
                                            {cell.evidenceSnippet && (
                                              <div className="italic text-slate-600">"{cell.evidenceSnippet}"</div>
                                            )}
                                            <button
                                              onClick={() =>
                                                navigate(`/bids/${encodeURIComponent(cell.bidId)}/evidence/${encodeURIComponent(row.requirementId)}`)
                                              }
                                              className="inline-flex items-center gap-1 text-blue-800 hover:text-blue-950 font-bold underline cursor-pointer"
                                            >
                                              <Eye className="w-3 h-3" />
                                              View Evidence
                                            </button>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => navigate(`/bids/${encodeURIComponent(cell.bidId)}/compliance`)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded text-3xs font-bold transition cursor-pointer"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          View Bid Details
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ---- Document coverage ---- */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Document Coverage
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
                        <th className="py-3 px-4">Document Category</th>
                        {filteredBidders.map((b) => (
                          <th key={b.bidId} className="py-3 px-4">{b.bidderName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {comparison.documentCoverage.length === 0 ? (
                        <tr>
                          <td colSpan={visibleBidIds.length + 1} className="py-8 text-center text-slate-500 italic">
                            No uploaded document records are available for these bids yet.
                          </td>
                        </tr>
                      ) : (
                        comparison.documentCoverage.map((row) => (
                          <tr key={row.category} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-700">{row.category}</td>
                            {visibleBidIds.map((bidId) => {
                              const cell = row.cells.find((c) => c.bidId === bidId);
                              return (
                                <td key={bidId} className="py-3 px-4">
                                  {cell?.present ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Present" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-rose-500" aria-label="Absent" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ---- Conflict details ---- */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Conflict Details
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {filteredBidders.every((b) => b.conflictCount === 0) ? (
                    <p className="text-xs text-slate-500 italic">
                      No stored conflicts for the selected bidders.
                    </p>
                  ) : (
                    filteredBidders.map((b) => (
                      <div key={b.bidId} className="border border-slate-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">
                            {b.bidderName} <span className="text-slate-400 font-normal">({b.bidId})</span>
                          </span>
                          <span className="text-xs font-mono text-slate-600">
                            {b.conflictCount} conflict{b.conflictCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        {b.conflicts.length > 0 ? (
                          <ul className="space-y-2">
                            {b.conflicts.map((c, i) => (
                              <li key={c.conflictId || i} className="text-3xs text-slate-700 border-t border-slate-100 pt-2">
                                <span className="font-bold">{c.title || c.conflictId || 'Conflict'}</span>
                                {c.requirementId && <span className="text-slate-500"> — {c.requirementId}</span>}
                                {c.riskLevel && (
                                  <span className="ml-2">
                                    <StatusBadge status={c.riskLevel} size="sm" showIcon={false} />
                                  </span>
                                )}
                                {c.status && <div className="text-slate-500">Status: {c.status}</div>}
                                {c.sources.length > 0 && (
                                  <div className="text-slate-500">Sources: {c.sources.join(', ')}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-3xs text-slate-500 italic">No conflicts recorded.</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="text-3xs text-slate-400 mb-8">
                This screen presents factual comparison data drawn from stored analysis results only.
                The final procurement decision rests with the authorized officer.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};
