import { api, USE_MOCK } from './api';
import { mockRequirements, mockEvidenceDetails } from '../data/mockData';
import type { Requirement, EvidenceDetail, PreliminaryVerificationCheck, PreliminaryVerificationSummary, AssistantMessage, AssistantCitation } from '../types';

export const complianceService = {
  async getRequirements(bidId: string): Promise<Requirement[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockRequirements[bidId] || [];
    }
    const response = await api.get<Requirement[]>(`/bids/${bidId}/requirements`);
    return response.data;
  },

  async getRequirementById(bidId: string, reqId: string): Promise<Requirement | null> {
    if (USE_MOCK) {
      const list = mockRequirements[bidId] || [];
      return list.find((r) => String(r.id) === String(reqId) || r.requirementId === reqId) || null;
    }
    const response = await api.get<Requirement>(`/bids/${bidId}/requirements/${reqId}`);
    return response.data;
  },

  async getEvidenceForRequirement(reqId: string, bidId?: string): Promise<EvidenceDetail | null> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockEvidenceDetails[reqId] || null;
    }
    const url = bidId ? `/bids/${bidId}/requirements/${reqId}/evidence` : `/requirements/${reqId}/evidence`;
    const response = await api.get<EvidenceDetail>(url);
    return response.data;
  },

  async getPreliminaryVerification(bidId: string): Promise<{ summary: PreliminaryVerificationSummary; checks: PreliminaryVerificationCheck[] } | null> {
    if (USE_MOCK) {
      return null;
    }
    try {
      const response = await api.get<{ overallStatus: string; summary: any; checks: PreliminaryVerificationCheck[] }>(`/bids/${bidId}/preliminary-verification`);
      const { overallStatus, summary, checks } = response.data;
      return {
        summary: {
          overallStatus: overallStatus as any,
          summary: {
            pass: summary.pass ?? 0,
            review: summary.review ?? 0,
            fail: summary.fail ?? 0,
            missing: summary.missing ?? 0,
            conflict: summary.conflict ?? 0,
            total: summary.total ?? 0,
          }
        },
        checks
      };
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  async getDocumentPreliminaryVerification(bidId: string, documentId: string): Promise<PreliminaryVerificationCheck[]> {
    if (USE_MOCK) {
      return [];
    }
    const response = await api.get<PreliminaryVerificationCheck[]>(`/bids/${bidId}/documents/${documentId}/preliminary-verification`);
    return response.data;
  },

  async assistantChat(bidId: string, question: string, chatHistory: AssistantMessage[]): Promise<{ answer: string; citations: AssistantCitation[]; grounding_status: string; error_message?: string }> {
    if (USE_MOCK) {
      return {
        answer: "This is a mock response. In production, the AI assistant would analyze your tender and provide grounded answers with citations.",
        citations: [],
        grounding_status: "GROUNDED"
      };
    }
    const response = await api.post<{ answer: string; citations: AssistantCitation[]; grounding_status: string; error_message?: string }>(`/bids/${bidId}/assistant/chat`, {
      question,
      chat_history: chatHistory
    }, { timeout: 120000 });
    return response.data;
  }
};
