import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StepWorkflow } from '../components/common/StepWorkflow';
import { bidService } from '../services/bidService';
import { ArrowRight, Building, FileText } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

export const CreateBid: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    tenderId: '',
    tenderTitle: '',
    department: '',
    category: '',
    tenderDate: '',
    closingDate: '',
    bidderName: '',
    registrationNo: '',
    gstin: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await bidService.createBid(formData);
      navigate(`/bids/${created.bidId || created.id}/upload-tender`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create tender record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans space-y-6">
      <PageHeader
        title="Initialize New Procurement Tender"
        subtitle="Create a new procurement evaluation record for AI RAG compliance processing and document analysis."
        breadcrumbs={[
          { label: "Officer Dashboard", path: "/dashboard" },
          { label: "Publish New Tender" }
        ]}
      />

      {error && <ErrorState message={error} />}

      <StepWorkflow 
        steps={[
          { number: '01', title: 'Tender RFP', description: 'Metadata Setup', status: 'current' },
          { number: '02', title: 'Tender RFP File', description: 'Upload Specification', status: 'upcoming' },
          { number: '03', title: 'Bidder Files', description: 'Upload Bidder Dossiers', status: 'upcoming' },
          { number: '04', title: 'AI OCR & RAG', description: 'Automated Extraction', status: 'upcoming' },
          { number: '05', title: 'Compliance Grid', description: 'Officer Evaluation', status: 'upcoming' }
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-200">
              <FileText className="w-5 h-5 text-blue-900" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                1. Tender RFP Metadata Specification
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GeM Tender Reference ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenderId}
                  onChange={(e) => setFormData({ ...formData, tenderId: e.target.value })}
                  placeholder="TND-GEM-2026-XXXX"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Procuring Ministry / Department <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. National Informatics Centre"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tender RFP Subject Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenderTitle}
                  onChange={(e) => setFormData({ ...formData, tenderTitle: e.target.value })}
                  placeholder="Full title of procurement tender RFP..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Procurement Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="IT Hardware & Cloud Services">IT Hardware & Cloud Services</option>
                  <option value="Hardware Procurement">Hardware Procurement</option>
                  <option value="Software & Consulting">Software & Consulting</option>
                  <option value="Infrastructure & Civil Works">Infrastructure & Civil Works</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publish Date</label>
                  <input
                    type="date"
                    value={formData.tenderDate}
                    onChange={(e) => setFormData({ ...formData, tenderDate: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Closing Date</label>
                  <input
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-200">
              <Building className="w-5 h-5 text-blue-900" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                2. Applicant Bidder Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bidder Company / Entity Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.bidderName}
                  onChange={(e) => setFormData({ ...formData, bidderName: e.target.value })}
                  placeholder="Legal Registered Name of Applicant Firm"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate CIN / Registration No <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  placeholder="CIN-U72200DL2018PTC334512"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GSTIN Registration Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="07AAAAA0000A1Z5"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Creating Evaluation Record..." : "Continue to Tender Upload"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
