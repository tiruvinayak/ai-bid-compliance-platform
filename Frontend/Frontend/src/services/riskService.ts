import { api, USE_MOCK } from './api';
import { mockRiskSummaries } from '../data/mockData';
import type { RiskCategorySummary } from '../types';

export const riskService = {
  async getRiskSummary(bidId: string): Promise<RiskCategorySummary[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockRiskSummaries[bidId] || [];
    }
    const response = await api.get<RiskCategorySummary[]>(`/bids/${bidId}/risks`);
    return response.data;
  }
};
