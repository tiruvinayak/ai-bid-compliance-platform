import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { documentService } from '../services/documentService';
import { bidService } from '../services/bidService';
import { BidderAssistant } from '../components/compliance/BidderAssistant';
import type { BidderDocument, UserProfile, Bid } from '../types';
import { 
  FileText, 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ShieldCheck, 
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Presentation,
  Building2,
  FolderCheck,
  Bot
} from 'lucide-react';

type DashboardTab = 'tenders' | 'documents' | 'assistant';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{ user?: UserProfile }>();
  const user = context?.user;

  const [documents, setDocuments] = useState<BidderDocument[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<DashboardTab>('tenders');
  const [selectedBidId, setSelectedBidId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docs, bList] = await Promise.all([
          documentService.getUserDocuments(),
          bidService.getBids()
        ]);
        setDocuments(docs);
        setBids(bList);
        if (bList.length > 0) {
          setSelectedBidId(bList[0].bidId || bList[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load bidder dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Dynamically calculated statistics from document data
  const totalCount = documents.length;
  const uploadedCount = documents.filter(d => d.uploadStatus === 'UPLOADED' || d.uploadStatus === 'PROCESSED' || d.uploadStatus === 'PROCESSING').length;
  const processingCount = documents.filter(d => d.processingStatus === 'PROCESSING' || d.processingStatus === 'UPLOADING').length;
  const completedCount = documents.filter(d => d.processingStatus === 'PROCESSED' || d.processingStatus === 'COMPLETED').length;
  const failedCount = documents.filter(d => d.processingStatus === 'FAILED').length;

   const userEmail = user?.email || 'Email not reported';
   const userOrg = user?.organization || user?.department || 'Organization not reported';

  const getFormatIcon = (format?: string) => {
    switch (format?.toUpperCase()) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-rose-600" />;
      case 'XLS':
      case 'XLSX':
      case 'CSV':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'DOC':
      case 'DOCX':
      case 'TXT':
        return <FileCode className="w-4 h-4 text-blue-600" />;
      case 'PPT':
      case 'PPTX':
        return <Presentation className="w-4 h-4 text-amber-600" />;
      case 'JPG':
      case 'JPEG':
      case 'PNG':
        return <ImageIcon className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
      case 'COMPLETED':
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>COMPLETED</span>
          </span>
        );
      case 'PROCESSING':
      case 'UPLOADING':
      case 'Analyzing':
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>PROCESSING</span>
          </span>
        );
      case 'FAILED':
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  const tabClass = (tab: DashboardTab) =>
    `px-5 py-3 text-xs font-extrabold uppercase tracking-wide border-b-2 transition cursor-pointer ${
      activeTab === tab
        ? 'border-blue-900 text-blue-900 bg-blue-50/50'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
    }`;

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="Bidder Submission Portal"
        subtitle="Submit, manage, and track your procurement verification documents for automated compliance review."
        breadcrumbs={[{ label: "GeM Platform" }, { label: "User Dashboard" }]}
        actions={
          <button
             onClick={() => bids[0] && navigate(`/user/upload?bidId=${encodeURIComponent(bids[0].bidId || bids[0].id)}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Upload New Verification Document</span>
          </button>
        }
      />

      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs font-semibold" role="alert">{error}</div>}

      {/* BIDDER COMPANY PROFILE CARD */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-white">{userOrg}</h2>
              <span className="text-3xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-extrabold uppercase">
                ACTIVE BIDDER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
               Logged in as: <strong className="text-slate-200">{user?.name || 'Name not reported'}</strong> ({userEmail})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
               <span>GSTIN: <strong className="text-white font-mono">{user?.gstin || 'Not reported'}</strong></span>
        </div>
      </div>

      {/* DOCUMENT SUBMISSION SUMMARY STATS */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-2">
          <div>
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Document Verification Matrix
            </h2>
            <p className="text-3xs text-slate-500 font-medium">
              Dynamic submission statistics compiled from bidder uploaded document matrix
            </p>
          </div>
          <div className="flex items-center gap-2 text-3xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 font-medium">
            <FolderCheck className="w-3.5 h-3.5 text-blue-900" />
            <span>Active Tender Queue: <strong className="text-slate-900">{bids.length} Allocated Tenders</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div className="text-3xs font-extrabold uppercase text-slate-500 tracking-wider mb-1">Total Documents</div>
            <div className="text-2xl font-black text-slate-900">{totalCount}</div>
            <div className="text-3xs text-slate-500 mt-1">Submitted files</div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg text-center">
            <div className="text-3xs font-extrabold uppercase text-blue-900 tracking-wider mb-1">Uploaded</div>
            <div className="text-2xl font-black text-blue-900">{uploadedCount}</div>
            <div className="text-3xs text-blue-700 mt-1">Files in vault</div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-center">
            <div className="text-3xs font-extrabold uppercase text-amber-900 tracking-wider mb-1">Processing</div>
            <div className="text-2xl font-black text-amber-700">{processingCount}</div>
            <div className="text-3xs text-amber-700 mt-1">OCR parsing</div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg text-center">
            <div className="text-3xs font-extrabold uppercase text-emerald-900 tracking-wider mb-1">Completed</div>
            <div className="text-2xl font-black text-emerald-800">{completedCount}</div>
            <div className="text-3xs text-emerald-700 mt-1">Verified compliance</div>
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-lg text-center">
            <div className="text-3xs font-extrabold uppercase text-rose-900 tracking-wider mb-1">Failed</div>
            <div className="text-2xl font-black text-rose-800">{failedCount}</div>
            <div className="text-3xs text-rose-700 mt-1">Re-upload needed</div>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB NAVIGATION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <nav className="flex overflow-x-auto" role="tablist" aria-label="Bidder dashboard sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tenders'}
            onClick={() => setActiveTab('tenders')}
            className={tabClass('tenders')}
          >
            Active Tenders
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
            className={tabClass('documents')}
          >
            Recent Uploads
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'assistant'}
            onClick={() => setActiveTab('assistant')}
            className={tabClass('assistant')}
          >
            AI Assistant
          </button>
        </nav>
      </div>

      {activeTab === 'tenders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Active Government Tenders for Submission</h3>
              <p className="text-3xs text-slate-500">Tenders open for document verification submission & government officer evaluation</p>
            </div>
          </div>

          {bids.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No active tenders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tender ID & Title</th>
                    <th className="py-3 px-4">Allocated Ministry</th>
                    <th className="py-3 px-4">Compliance Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bids.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{b.tenderTitle}</div>
                        <div className="text-3xs text-slate-500 font-mono">{b.bidId || b.id} • {b.tenderId}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{b.department}</td>
                      <td className="py-3 px-4 font-bold text-blue-900">
                        {b.compliancePercentage ? `${b.compliancePercentage}%` : 'Pending'}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(b.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                           onClick={() => navigate(`/user/upload?bidId=${encodeURIComponent(b.bidId || b.id)}`)}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-3xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Submit Documents
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">My Uploaded Document Records</h3>
              <p className="text-3xs text-slate-500">Latest document submissions with real-time status tracking</p>
            </div>
            <button
              onClick={() => navigate('/user/uploads')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-950 transition cursor-pointer"
            >
              <span>View All Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading recent document uploads...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No document uploads found. Please upload documents.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">Uploaded Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documents.slice(0, 5).map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-slate-100 rounded border border-slate-200 shrink-0">
                            {getFormatIcon(doc.fileFormat)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{doc.filename}</div>
                            <div className="text-3xs text-slate-500">{doc.fileSize} • {doc.fileFormat}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{doc.docType}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-3xs">{doc.uploadedAt}</td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(doc.processingStatus)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate('/user/uploads')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-3xs font-bold transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assistant' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
          {bids.length === 0 ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center text-slate-500">
              <Bot className="w-16 h-16 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-700">No active bids to assist with</p>
              <p className="text-xs text-slate-500 mt-1">Create a bid submission to use the AI Assistant</p>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <label htmlFor="assistant-bid-select" className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  Select Bid for AI Assistance
                </label>
                <select
                  id="assistant-bid-select"
                  value={selectedBidId || bids[0]?.bidId || bids[0]?.id || ''}
                  onChange={(e) => setSelectedBidId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                >
                  {bids.map((b) => (
                    <option key={b.id} value={b.bidId || b.id}>
                      {b.tenderTitle} ({b.bidId || b.id})
                    </option>
                  ))}
                </select>
              </div>
              <BidderAssistant bidId={selectedBidId || bids[0]?.bidId || bids[0]?.id || ''} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
