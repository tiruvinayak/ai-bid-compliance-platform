import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Requirement } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBadge } from '../common/RiskBadge';
import { Search, FileText } from 'lucide-react';

interface RequirementTableProps {
  bidId: string;
  requirements: Requirement[];
}

export const RequirementTable: React.FC<RequirementTableProps> = ({ bidId, requirements }) => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filtered = (requirements || []).filter((req) => {
    const reqIdStr = String(req.requirementId || req.id || '');
    const reqDescStr = String(req.requirement || '');
    const reqSourceStr = String(req.sourceDoc || '');
    const q = searchQuery.toLowerCase();

    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
    const matchesCategory = categoryFilter === 'ALL' || req.category === categoryFilter;
    const matchesSearch = 
      reqIdStr.toLowerCase().includes(q) ||
      reqDescStr.toLowerCase().includes(q) ||
      reqSourceStr.toLowerCase().includes(q);
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set((requirements || []).map((r) => r.category))).filter(Boolean);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden font-sans">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {['ALL', 'PASS', 'FAIL', 'REVIEW', 'MISSING', 'CONFLICT'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterStatus === status
                  ? "bg-blue-900 text-white shadow-2xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search requirement or doc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800 w-48"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
              <th className="py-3 px-4">Req ID</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 max-w-xs">Requirement Criteria</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Risk</th>
              <th className="py-3 px-4">Evidence Document</th>
              <th className="py-3 px-4 text-center">Confidence</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                  No evaluation requirements matched the filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((req) => {
                const reqCode = String(req.requirementId || req.id || '');
                if (!reqCode) return null;
                return (
                  <tr 
                    key={reqCode}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => navigate(`/bids/${bidId}/requirements/${reqCode}`)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{reqCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{req.category}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 line-clamp-2">{req.requirement}</div>
                      <div className="text-3xs text-slate-500 mt-0.5">
                        Required: <span className="font-mono">{req.requiredValue}</span> | Detected: <span className="font-mono text-slate-700 font-bold">{req.detectedValue || 'None'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge risk={req.risk} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1 truncate max-w-xs font-mono text-3xs">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                         <span>{req.sourceDoc || 'Not reported'}</span>
                       </div>
                       <div className="text-3xs text-slate-400">Page {req.pageNumber ?? 'Not reported'}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-700">
                      {req.confidence ?? 0}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bids/${bidId}/requirements/${reqCode}`);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-900 hover:text-white text-slate-800 rounded text-xs font-semibold transition border border-slate-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
