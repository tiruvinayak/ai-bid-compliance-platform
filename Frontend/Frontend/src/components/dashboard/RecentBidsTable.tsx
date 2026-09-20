import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bid } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { ArrowRight } from 'lucide-react';

interface RecentBidsTableProps {
  bids: Bid[];
}

export const RecentBidsTable: React.FC<RecentBidsTableProps> = ({ bids }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden font-sans">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Active Tender Bids Under Verification</h2>
          <p className="text-3xs text-slate-500">Government e-Marketplace (GeM) evaluation workflow queue</p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-full">
          {bids.length} Active Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
              <th className="py-3 px-4">Bid ID</th>
              <th className="py-3 px-4">Bidder Name</th>
              <th className="py-3 px-4">Tender RFP ID & Title</th>
              <th className="py-3 px-4 text-center">Compliance Score</th>
              <th className="py-3 px-4">Risk Level</th>
              <th className="py-3 px-4">Verification Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {bids.map((bid) => {
              const displayBidId = bid.bidId || bid.id;
              return (
                <tr 
                  key={bid.id}
                  className="hover:bg-blue-50/40 transition cursor-pointer group"
                  onClick={() => navigate(`/bids/${displayBidId}/compliance`)}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-900 group-hover:underline whitespace-nowrap">
                    {displayBidId}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>{bid.bidderName}</div>
                    <div className="text-3xs font-mono text-slate-500 font-normal">{bid.gstin}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800">{bid.tenderId}</span>
                    <div className="text-3xs text-slate-500 truncate max-w-xs">{bid.tenderTitle}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 font-bold text-sm">
                      <span className={bid.compliancePercentage < 80 ? "text-rose-700" : "text-emerald-700"}>
                        {bid.compliancePercentage}%
                      </span>
                    </div>
                    <div className="w-20 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${bid.compliancePercentage < 80 ? "bg-rose-600" : "bg-emerald-600"}`}
                        style={{ width: `${Math.min(100, Math.max(0, bid.compliancePercentage))}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskBadge risk={bid.riskLevel} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold border ${
                      bid.status === 'Verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}>
                      {bid.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bids/${displayBidId}/compliance`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-900 text-white rounded text-xs font-semibold hover:bg-blue-950 transition cursor-pointer shadow-2xs"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
