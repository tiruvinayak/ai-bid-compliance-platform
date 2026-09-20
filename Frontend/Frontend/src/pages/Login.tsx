import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { USE_MOCK } from '../services/api';
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck, UserPlus, Landmark } from 'lucide-react';
import type { UserRole } from '../types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [username, setUsername] = useState<string>(USE_MOCK ? 'user@demo.gov.in' : '');
  const [password, setPassword] = useState<string>(USE_MOCK ? 'User@123' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError('');
    if (USE_MOCK) {
      setUsername(role === 'USER' ? 'user@demo.gov.in' : 'officer@demo.gov.in');
      setPassword(role === 'USER' ? 'User@123' : 'Officer@123');
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.login(username.trim(), password);
      navigate(result.user.role === 'USER' ? '/user/dashboard' : '/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      setError(status === 401
        ? 'We could not sign you in. Check your email or user ID and password.'
        : serverMessage || 'Unable to complete sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
      {/* Left Panel - Platform Identity */}
      <div className="relative bg-blue-950 text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between min-h-[600px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-3xs font-bold uppercase tracking-[0.22em] text-blue-200">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            SIH26100 Prototype
          </div>
          <div className="mt-10 space-y-2">
            <Landmark className="w-10 h-10 text-amber-400" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Procurement<br />
              <span className="text-amber-400">Intelligence</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-blue-100">
              AI-assisted bid compliance verification for structured, evidence-led procurement review.
            </p>
          </div>
        </div>
        <div className="relative z-10 space-y-4 mt-12">
          {[
            ['Evidence-driven review', 'Trace every decision to a document and page reference.'],
            ['Human-in-the-loop', 'AI recommends; authorized officers make final decisions.'],
            ['Complete audit trail', 'Preserve a tamper-proof review history for each bid.'],
            ['Government standards', 'Aligned with GFR, GeM policies, and CVC guidelines.']
          ].map(([title, description]) => (
            <div key={title} className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{title}</div>
                <div className="text-xs text-blue-200 mt-0.5">{description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="relative z-10 mt-auto pt-8 border-t border-white/10">
          <p className="text-3xs text-blue-300 tracking-wider uppercase font-medium">
            Government Procurement Intelligence Platform • SIH26100
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="p-8 sm:p-12 lg:p-14 bg-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between gap-4 mb-10">
            <div>
              <p className="text-3xs font-bold uppercase tracking-[0.18em] text-blue-800">Secure Workspace Access</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 tracking-tight">Sign in</h2>
              <p className="mt-1 text-sm text-slate-500">Continue to your procurement review workspace.</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <LockKeyhole className="w-6 h-6 text-blue-900" />
            </div>
          </div>

          {USE_MOCK && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-3xs text-slate-600">
              <div className="font-bold text-slate-800 uppercase tracking-wider mb-3">Development Demo Access</div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <button
                  type="button"
                  className={`text-left p-3 border rounded-lg transition ${
                    selectedRole === 'USER'
                      ? 'border-blue-700 bg-blue-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  onClick={() => handleRoleSelect('USER')}
                >
                  <span className="block font-bold">Bidder</span>
                  user@demo.gov.in
                  <br />
                  User@123
                </button>
                <button
                  type="button"
                  className={`text-left p-3 border rounded-lg transition ${
                    selectedRole !== 'USER'
                      ? 'border-emerald-700 bg-emerald-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  onClick={() => handleRoleSelect('GOVERNMENT OFFICER')}
                >
                  <span className="block font-bold">Officer</span>
                  officer@demo.gov.in
                  <br />
                  Officer@123
                </button>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-6 flex gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email or User ID</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    autoComplete="username"
                    placeholder="name@organisation.gov.in"
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-colors"
                  />
                </div>
              </label>
            </div>

            <div>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-colors"
                  />
                </div>
              </label>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="flex items-start gap-3 mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
              <p className="text-xs leading-6 text-slate-500">
                Government officer access is provisioned through authorized administration.
                Public self-registration is available for bidder accounts only.
              </p>
            </div>
            <Link to="/signup/bidder" className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:text-blue-700 transition-colors">
              <UserPlus className="w-5 h-5" />
              Create a bidder account
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-2 text-3xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Evidence-centric review • Audit logged • GFR compliant
          </div>
        </div>
      </div>
    </section>
  );
};