import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { User, Building2, Mail, Phone, Lock, FileText, AlertCircle, Loader2, UserCheck, ShieldCheck, Landmark, CheckCircle2 } from 'lucide-react';

export const BidderSignup: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    gstin: '',
    registrationNo: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!formData.organization.trim()) {
      setError('Organization / Company Name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid official email address.');
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.registerBidder({
        name: formData.name,
        organization: formData.organization,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        gstin: formData.gstin,
        registrationNo: formData.registrationNo
      });
      navigate('/user/dashboard');
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(serverMsg || 'Registration failed. Email address may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Full Name *', placeholder: 'e.g. Ramesh Kumar', icon: User, required: true },
    { name: 'organization', label: 'Organization / Company Name *', placeholder: 'e.g. ABC Technologies Pvt Ltd', icon: Building2, required: true },
    { name: 'email', label: 'Official Email *', placeholder: 'ramesh@abctech.com', icon: Mail, type: 'email', required: true },
    { name: 'mobile', label: 'Mobile Number *', placeholder: '9876543210', icon: Phone, type: 'tel', required: true },
    { name: 'gstin', label: 'GSTIN Number', placeholder: '07AABCT1234F1Z5', icon: FileText, uppercase: true },
    { name: 'registrationNo', label: 'Company Registration No. (CIN)', placeholder: 'U72900DL2019PTC345678', icon: FileText, uppercase: true },
    { name: 'password', label: 'Password *', placeholder: '••••••••••••', icon: Lock, type: 'password', required: true },
    { name: 'confirmPassword', label: 'Confirm Password *', placeholder: '••••••••••••', icon: Lock, type: 'password', required: true },
  ];

  return (
    <section className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
      {/* Left Panel - Platform Identity */}
      <div className="relative bg-slate-900 text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between min-h-[600px] hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-3xs font-bold uppercase tracking-[0.22em] text-blue-200">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            SIH26100 Prototype
          </div>
          <div className="mt-10 space-y-2">
            <Landmark className="w-10 h-10 text-amber-400" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Bidder<br />
              <span className="text-amber-400">Registration</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-blue-100">
              Create your bidder account to participate in government tenders and submit bids for compliance verification.
            </p>
          </div>
        </div>
        <div className="relative z-10 space-y-4 mt-12">
          {[
            ['Single account', 'One account for all GeM tenders and bids.'],
            ['Secure documents', 'Encrypted upload and AI-assisted verification.'],
            ['Real-time tracking', 'Monitor compliance status and review progress.'],
            ['Government recognized', 'Aligned with GeM and GFR procurement standards.']
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
            National Procurement Verification Portal • SIH26100
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="p-8 sm:p-12 lg:p-14 bg-white">
        <div className="max-w-xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-10">
            <div>
              <p className="text-3xs font-bold uppercase tracking-[0.18em] text-blue-800">Bidder Account Creation</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 tracking-tight">Register as Bidder</h2>
              <p className="mt-1 text-sm text-slate-500">Complete the form to create your procurement account.</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-amber-600" />
            </div>
          </div>

          <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <ShieldCheck className="w-4 h-4 text-blue-900" />
            <span>Role: Bidder / Applicant</span>
          </div>

          {error && (
            <div role="alert" className="mb-6 flex gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-extrabold uppercase block text-3xs text-rose-600 mb-1">Registration Rejected</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map((field, idx) => {
              const isLastTwo = idx >= fields.length - 2;
              return (
                <div key={field.name} className={isLastTwo && idx === fields.length - 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : idx >= fields.length - 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
                  <label className={isLastTwo ? '' : 'block'}>
                    <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{field.label}</span>
                    <div className="relative">
                      <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={field.type || 'text'}
                        name={field.name}
                        required={field.required}
                        value={formData[field.name as keyof typeof formData]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-colors {field.uppercase ? 'uppercase' : ''}"
                        style={{ textTransform: field.uppercase ? 'uppercase' : 'none' }}
                      />
                    </div>
                  </label>
                </div>
              );
            })}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Bidder Account…</span>
                </>
              ) : (
                <span>Register Bidder Account</span>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-center text-sm text-slate-600">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-blue-900 hover:text-blue-700 transition-colors">
                Sign In Here
              </Link>
            </p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-3xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Evidence-centric review • Audit logged • GFR compliant
          </div>
        </div>
      </div>
    </section>
  );
};