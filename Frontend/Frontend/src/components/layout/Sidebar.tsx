import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FolderCheck, 
  HelpCircle, 
  User, 
  LogOut, 
  ChevronRight, 
  ChevronDown,
  FileCheck2,
  FileSearch,
  Eye,
  AlertTriangle,
  GitCompare,
  FileBarChart2,
  History,
  ShieldCheck,
  PlusCircle,
  Landmark,
  Bot,
  X
} from 'lucide-react';
import type { Bid, UserProfile } from '../../types';

interface SidebarProps {
  user: UserProfile;
  activeBidId?: string;
  activeBid?: Bid | null;
  isOpen?: boolean;
  onClose?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeBidId, activeBid, isOpen = false, onClose, onLogout }) => {
  const isUserRole = user.role === 'USER';
  const [evaluationOpen, setEvaluationOpen] = useState<boolean>(true);
  const bidPath = (suffix: string) => activeBidId ? `/bids/${encodeURIComponent(activeBidId)}${suffix}` : '/dashboard';

  return (
    <>
      {isOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden" />}
      <aside className={`w-64 bg-slate-950 text-slate-200 flex flex-col border-r border-slate-800/80 shrink-0 h-screen sticky top-0 no-print font-sans select-none z-50 transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0 fixed left-0 top-0' : '-translate-x-full fixed left-0 top-0 lg:static'}`}>
      {/* Official Government Platform Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-blue-900 border border-amber-500/60 flex items-center justify-center text-amber-400 font-extrabold text-sm tracking-wider shadow-sm shrink-0">
            <Landmark className="w-5 h-5 text-amber-400" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-white uppercase">GeM PORTAL</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">SIH26100</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">Bid Compliance & Audit Platform</p>
          </div>
          <button type="button" onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white" aria-label="Close navigation">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Role Pill Indicator */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-extrabold tracking-wider">
        <span className="text-slate-400 uppercase">CONSOLE:</span>
        <span className={`px-2 py-0.5 rounded font-extrabold uppercase border ${
          isUserRole 
            ? 'bg-amber-950/80 text-amber-300 border-amber-800/70' 
            : 'bg-blue-950 text-blue-300 border-blue-700/80'
        }`}>
          {isUserRole ? 'BIDDER APPLICANT' : 'GOVT AUDIT OFFICER'}
        </span>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {isUserRole ? (
          /* ================= BIDDER / APPLICANT NAVIGATION ================= */
          <>
            <div className="px-3 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              BIDDER WORKSPACE
            </div>

            <NavLink
              to="/user/dashboard"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
                  isActive 
                    ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>Bidder Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </NavLink>

            <NavLink
              to="/user/upload"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
                  isActive 
                    ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload Bid Documents</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </NavLink>

            <NavLink
              to="/user/uploads"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
                  isActive 
                    ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <FolderCheck className="w-4 h-4 text-sky-400" />
                <span>My Submitted Bids</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </NavLink>
          </>
        ) : (
          /* ================= GOVERNMENT OFFICER NAVIGATION ================= */
          <>
            <div className="px-3 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              OFFICER EVALUATION CONSOLE
            </div>

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
                  isActive 
                    ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>Overview Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </NavLink>

            <NavLink
              to="/bids/create"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
                  isActive 
                    ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Publish New Tender</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </NavLink>

            {/* Collapsible Active Evaluation Suite */}
            <div className="pt-2">
              <button
                onClick={() => setEvaluationOpen(!evaluationOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-bold text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Compliance Suite</span>
                </div>
                {evaluationOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {evaluationOpen && (
                <div className="ml-3 pl-3 border-l border-slate-800 my-1 space-y-1">
                  <NavLink
                     to={bidPath('/compliance')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Compliance Grid</span>
                  </NavLink>

                   <NavLink
                     to={bidPath('/requirements/REQ-001')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Requirement Rules</span>
                  </NavLink>

                   <NavLink
                     to={bidPath('/evidence/REQ-001')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <FileSearch className="w-3.5 h-3.5 text-amber-400" />
                    <span>Evidence Inspector</span>
                  </NavLink>

         {!isUserRole && <NavLink
                     to={bidPath('/risks')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Risk & Fraud Matrix</span>
         </NavLink>}

                  <NavLink
                     to={bidPath('/conflicts')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <GitCompare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Conflict Audit</span>
                  </NavLink>

                  <NavLink
                     to={bidPath('/report')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <FileBarChart2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Executive Report</span>
                  </NavLink>

                  <NavLink
                     to={bidPath('/audit')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition ${
                        isActive 
                          ? "bg-blue-900/90 text-blue-100 font-bold border-l-2 border-blue-400" 
                          : "text-slate-300 hover:text-white hover:bg-slate-900"
                      }`
                    }
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Trail Log</span>
                  </NavLink>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= INSTITUTIONAL AI & RESOURCES ================= */}
        <div className="pt-4 pb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          INSTITUTIONAL AI & RULES
        </div>

        {!isUserRole && (
          <NavLink
            to="/government-instructions"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
                isActive 
                  ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Government AI Assistant</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </NavLink>
        )}

        <NavLink
          to="/helpdesk"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
              isActive 
                ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Procurement Helpdesk</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </NavLink>

        <NavLink
          to="/account"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition ${
              isActive 
                ? "bg-blue-900 text-white shadow-xs border-l-2 border-amber-500" 
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-amber-400" />
             <span>Account</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </NavLink>
      </nav>

      {/* Active Bid Target Card for Officers */}
       {!isUserRole && activeBid && (
         <div className="mx-3 my-2 p-2.5 bg-slate-900/90 rounded border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-0.5">
            <span>TARGET BID</span>
            <span className="text-amber-400 font-mono font-extrabold">{activeBidId}</span>
          </div>
             <div className="text-xs font-bold text-white truncate">{activeBid.tenderTitle}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AI Verification Active</span>
          </div>
         </div>
       )}

      {/* Bottom User Profile Bar */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded bg-blue-900 border border-blue-700 text-blue-100 flex items-center justify-center font-extrabold text-xs shrink-0">
            {user.name ? user.name.substring(0, 2).toUpperCase() : 'GO'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-100 truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.department || user.role}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign Out of Platform"
          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      </aside>
    </>
  );
};
