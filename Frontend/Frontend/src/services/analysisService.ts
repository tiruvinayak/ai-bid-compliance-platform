import { api, USE_MOCK } from './api';

export interface AnalysisStage {
  id: string;
  label: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface AnalysisProgress {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  stages: AnalysisStage[];
}

const normalizeAnalysisStatus = (value: unknown): AnalysisProgress['status'] => {
  const status = String(value || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'DONE') return 'COMPLETED';
  if (status === 'FAILED' || status === 'FAILURE' || status === 'ERROR') return 'FAILED';
  if (status === 'IN_PROGRESS' || status === 'PROCESSING' || status === 'STARTED' || status === 'RUNNING') return 'IN_PROGRESS';
  return 'PENDING';
};

export const analysisService = {
  async startAnalysis(bidId: string): Promise<{ status: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return { status: "STARTED" };
    }
    const response = await api.post(`/bids/${bidId}/analyze`);
    return response.data;
  },

  async getAnalysisProgress(bidId: string): Promise<AnalysisProgress> {
    if (USE_MOCK) {
      const stages: AnalysisStage[] = [
        { id: "stage-1", label: "Tender Specification Parsing", description: "Parsing RFP structure and extracting mandatory evaluation criteria", status: "COMPLETED" },
        { id: "stage-2", label: "Requirements Extraction", description: "Extracting financial, legal, experience and technical requirements", status: "COMPLETED" },
        { id: "stage-3", label: "Bidder Document Processing & OCR", description: "Running layout analysis & text extraction on submitted PDFs", status: "COMPLETED" },
        { id: "stage-4", label: "RAG Evidence Retrieval", description: "Vector search & matching document pages against extracted requirements", status: "COMPLETED" },
        { id: "stage-5", label: "Compliance & Risk Evaluation", description: "Computing PASS/FAIL determinations and cross-document conflict detection", status: "COMPLETED" },
        { id: "stage-6", label: "Verification Report Synthesis", description: "Generating audit log and executive procurement summary", status: "COMPLETED" }
      ];
      return { status: 'COMPLETED', stages };
    }
    const response = await api.get<AnalysisProgress | AnalysisStage[]>(`/bids/${bidId}/analysis`);
    if (Array.isArray(response.data)) {
      const stages = response.data;
      const status = stages.some((stage) => stage.status === 'FAILED')
        ? 'FAILED'
        : stages.length > 0 && stages.every((stage) => stage.status === 'COMPLETED')
          ? 'COMPLETED'
          : stages.some((stage) => stage.status === 'IN_PROGRESS')
            ? 'IN_PROGRESS'
            : 'PENDING';
      return { status, stages };
    }
    return { status: normalizeAnalysisStatus(response.data.status), stages: response.data.stages || [] };
  }
};
