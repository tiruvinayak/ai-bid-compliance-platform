import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { authService } from '../services/authService';
import type { UserProfile } from '../types';
import { ErrorState } from '../components/common/ErrorState';
import { ShieldCheck, Mail, Building, Calendar, Lock, Phone, BadgeCheck, FileText, UserCheck, Building2 } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await authService.getCurrentUser();
        setUser(profile);
       } catch (err) {
         setError(err instanceof Error ? err.message : 'Unable to load account details.');
      }
    };
    load();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!user) {
    return <div className="p-8 text-center text-xs text-slate-500 font-sans">Loading account details...</div>;
  }

  const isUserRole = user.role === 'USER';

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="User Account & Session Profile"
        subtitle="Manage session credentials, active portal roles, and security authorization metadata."
        breadcrumbs={[
          { label: "GeM Platform" },
          { label: "Account" }
        ]}
      />

      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Profile Banner Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-900 border-2 border-amber-500 flex items-center justify-center font-extrabold text-xl text-amber-400 shadow-md shrink-0">
              {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{user.name}</span>
                {isUserRole ? (
                  <UserCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <Building2 className="w-4 h-4 text-emerald-400" />
                )}
              </h2>
               <div className="text-xs text-slate-400 mt-0.5">{user.designation || 'Designation not reported'}</div>
            </div>
          </div>

          <span className={`px-3.5 py-1.5 rounded-full text-2xs font-extrabold uppercase border text-center shrink-0 ${
            isUserRole
              ? 'bg-amber-950 text-amber-300 border-amber-800/80 shadow-xs'
              : 'bg-blue-950 text-blue-300 border-blue-800/80 shadow-xs'
          }`}>
            {isUserRole ? 'USER / BIDDER ACCOUNT' : 'GOVERNMENT OFFICER ACCOUNT'}
          </span>
        </div>

        {/* Profile Details Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active User Role */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg text-blue-900 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Active User Role</span>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {isUserRole ? 'BIDDER (SUPPLIER)' : 'GOVERNMENT OFFICER'}
                </div>
                <p className="text-3xs text-slate-500 mt-1">
                  {isUserRole
                    ? 'Authorized to upload & track bidder document submissions for tender allocation.'
                    : 'Authorized to evaluate tender bids, inspect compliance evidence & issue audit reviews.'}
                </p>
              </div>
            </div>

            {/* Email Login */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-900 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Official Email Identifier</span>
                <div className="text-xs font-extrabold text-slate-900 font-mono mt-0.5 truncate">{user.email}</div>
                <p className="text-3xs text-slate-500 mt-1">Authenticated session identity token</p>
              </div>
            </div>

            {/* Department / Organization */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
              <div className="p-2.5 bg-purple-100 rounded-lg text-purple-900 shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">
                  {isUserRole ? 'Organization / Company Name' : 'Ministry / Department'}
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                   {user.organization || user.department || 'Organization not reported'}
                </div>
                <p className="text-3xs text-slate-500 mt-1">Registered public sector / corporate entity</p>
              </div>
            </div>

            {/* Mobile Contact */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
              <div className="p-2.5 bg-sky-100 rounded-lg text-sky-900 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Registered Mobile Contact</span>
                <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                   {user.mobile || 'Not reported'}
                </div>
                <p className="text-3xs text-slate-500 mt-1">Verified mobile contact for notifications</p>
              </div>
            </div>

            {/* Role-Specific Identifiers */}
            {!isUserRole ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3 md:col-span-2">
                <div className="p-2.5 bg-amber-100 rounded-lg text-amber-900 shrink-0">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Officer Verification Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                    <div>
                      <span className="text-3xs text-slate-500 block">Officer ID:</span>
                       <span className="text-xs font-mono font-bold text-slate-900">{user.officerId || 'Not reported'}</span>
                    </div>
                    <div>
                      <span className="text-3xs text-slate-500 block">Designation:</span>
                       <span className="text-xs font-bold text-slate-900">{user.designation || 'Not reported'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3 md:col-span-2">
                <div className="p-2.5 bg-amber-100 rounded-lg text-amber-900 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="w-full">
                  <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Company Tax & Registration Credentials</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                    <div>
                      <span className="text-3xs text-slate-500 block">GSTIN Number:</span>
                       <span className="text-xs font-mono font-bold text-slate-900">{user.gstin || 'Not reported'}</span>
                    </div>
                    <div>
                      <span className="text-3xs text-slate-500 block">Company Reg No (CIN):</span>
                       <span className="text-xs font-mono font-bold text-slate-900">{user.registrationNo || 'Not reported'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Status & Last Login */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3 md:col-span-2">
              <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-900 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Account Status & Session Info</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                    Active Session
                  </span>
                  <span className="text-xs text-slate-700 font-mono font-medium">
                     Last Authenticated: {user.lastLogin || 'Not reported'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-slate-700 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-950">Public Procurement Security & Audit Compliance</div>
              <p className="text-3xs text-slate-600 mt-0.5">
                Your authorization session is protected with 256-bit JWT security. In accordance with government procurement regulations, passwords are never stored or exposed in plaintext.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
