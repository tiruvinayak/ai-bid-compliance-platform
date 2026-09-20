import React from 'react';
import { Bell, Search, ShieldCheck, Landmark, UserCheck, Building2, ExternalLink, Menu } from 'lucide-react';
import type { UserProfile } from '../../types';
import { Link } from 'react-router-dom';

interface HeaderProps {
  user: UserProfile;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onMenuClick }) => {
  const isUserRole = user.role === 'USER';

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs no-print font-sans">
      {/* Platform Title / Context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 text-slate-800">
          <Landmark className="w-5 h-5 text-blue-900 shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-950 uppercase tracking-tight">
                National Procurement Verification Portal
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase ${
                isUserRole 
                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                  : 'bg-blue-50 text-blue-950 border-blue-300'
              }`}>
                {isUserRole ? 'BIDDER' : 'GOVT OFFICER'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              GeM Integrated Compliance & AI Risk Assessment System (SIH26100)
            </span>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded px-3 py-1.5 w-80 focus-within:ring-2 focus-within:ring-blue-900 focus-within:bg-white transition">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search Tender ID, GSTIN, Criteria, RFPs..."
          className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full font-sans"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Security Audit Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300/80 rounded text-[10px] font-bold uppercase tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Audit Logging Active</span>
        </div>

        {/* Quick Link to Govt Portal Rules */}
         {!isUserRole && <Link 
          to="/government-instructions"
          className="hidden md:flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-950 hover:underline"
        >
          <span>GFR Rules</span>
          <ExternalLink className="w-3 h-3" />
         </Link>}

        {/* Notification Bell */}
        <button 
          className="relative p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer" 
          title="System Audit Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white"></span>
        </button>

        <div className="h-5 w-px bg-slate-200"></div>

        {/* Profile Card */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-extrabold text-xs shadow-2xs">
            {isUserRole ? <UserCheck className="w-4 h-4 text-amber-600" /> : <Building2 className="w-4 h-4 text-blue-900" />}
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
              {user.department || user.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
