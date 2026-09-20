import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { helpdeskService } from '../services/helpdeskService';
import type { HelpdeskFAQ } from '../types';
import { ErrorState } from '../components/common/ErrorState';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  ChevronDown, 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  FileQuestion,
  Headphones
} from 'lucide-react';


export const Helpdesk: React.FC = () => {
  const [faqs, setFaqs] = useState<HelpdeskFAQ[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  // Query Form State
  const [name, setName] = useState<string>(() => localStorage.getItem('gem_user_name') || '');
  const [email, setEmail] = useState<string>(() => localStorage.getItem('gem_user_email') || '');
  const [category, setCategory] = useState<string>('Document Upload Help');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await helpdeskService.getFAQs();
        setFaqs(data);
       } catch (err) {
         setLoadError(err instanceof Error ? err.message : 'Unable to load helpdesk FAQs.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setSubmittedTicket(null);
    setSubmitError('');

    try {
      const res = await helpdeskService.submitQuery({
        name,
        email,
        category,
        message
      });
      setSubmittedTicket(res.ticketId);
      setMessage('');
     } catch (err) {
       setSubmitError(err instanceof Error ? err.message : 'Unable to submit support query.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="GeM Helpdesk & Support Center"
        subtitle="Need help? Browse common procurement FAQs, upload assistance, verification guidance, or submit a support query."
        breadcrumbs={[
          { label: "GeM Platform" },
          { label: "Helpdesk" }
        ]}
      />

      {loadError && <ErrorState message={loadError} />}
      {submitError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded text-xs" role="alert">{submitError}</div>}

      {/* TOP SUPPORT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="p-3 bg-blue-50 text-blue-900 rounded-lg shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Email Support</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">support-sih26100@gem.gov.in</div>
            <p className="text-3xs text-slate-500 mt-1">24x7 Official Procurement Helpdesk Email</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">Toll-Free Helpline</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">1800-419-3436 / +91-11-23348890</div>
            <p className="text-3xs text-slate-500 mt-1">Monday – Saturday (09:00 AM to 06:00 PM IST)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="p-3 bg-purple-50 text-purple-800 rounded-lg shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider">AI Verification Help</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">Automated Ticket Resolution</div>
            <p className="text-3xs text-slate-500 mt-1">Track document parsing & verification status</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: FAQ ACCORDION */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <FileQuestion className="w-5 h-5 text-blue-900" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Frequently Asked Questions</h3>
                <p className="text-3xs text-slate-500">Common questions regarding document upload, AI parsing, and role access</p>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading helpdesk FAQs...</div>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => {
                  const isExpanded = expandedFaq === faq.id;
                  return (
                    <div key={faq.id} className="border border-slate-200 rounded-lg overflow-hidden transition">
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                        className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-950 border border-blue-200 shrink-0">
                            {faq.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{faq.question}</h4>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL: SUBMIT TICKET FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <MessageSquare className="w-5 h-5 text-blue-900" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Submit Support Ticket</h3>
                <p className="text-3xs text-slate-500">Need specific help? Send a query to technical support</p>
              </div>
            </div>

            {submittedTicket && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Support Ticket Submitted!</span>
                </div>
                <div>Ticket ID: <strong className="font-mono text-slate-900">{submittedTicket}</strong></div>
                <p className="text-3xs text-emerald-700 font-medium">Support team will review your query within 24 hours.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-3xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  Query Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="Document Upload Help">Document Upload Help</option>
                  <option value="Verification Help">Verification & Compliance Help</option>
                  <option value="Account Help">Account & Role Access Help</option>
                  <option value="Technical Bug Report">Technical Bug Report</option>
                </select>
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  Your Message / Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or query in detail..."
                  className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting Ticket...' : 'Submit Query'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
