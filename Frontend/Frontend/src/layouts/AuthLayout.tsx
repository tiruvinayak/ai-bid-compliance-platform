import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="w-full px-5 sm:px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-blue-950 flex items-center justify-center text-white font-black text-sm tracking-wider shadow-sm">
            PI
          </div>
          <div>
            <div className="flex items-center gap-2"><span className="text-xs font-black text-slate-950 uppercase tracking-wider">Procurement Intelligence</span><span className="text-3xs px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold uppercase">SIH26100</span></div>
            <p className="text-3xs text-slate-500 font-medium">AI-Assisted Procurement Bid Compliance Verification Platform</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-3xs font-bold uppercase tracking-wider text-slate-500"><ShieldCheck className="w-4 h-4 text-emerald-700" /> Secure prototype workspace</div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Outlet />
      </main>

      <footer className="py-3 px-6 border-t border-slate-200 bg-white text-center text-3xs text-slate-500">
        SIH26100 prototype • Government procurement compliance and evidence review
      </footer>
    </div>
  );
};
