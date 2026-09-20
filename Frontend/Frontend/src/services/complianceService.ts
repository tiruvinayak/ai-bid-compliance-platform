import { api, USE_MOCK } from './api';
import { mockRequirements, mockEvidenceDetails } from '../data/mockData';
import type { Requirement, EvidenceDetail } from '../types';

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
  }
};
