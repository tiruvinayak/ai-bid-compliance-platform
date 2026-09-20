import { api, USE_MOCK } from './api';
import { mockConflicts } from '../data/mockData';
import type { ConflictItem } from '../types';

export const conflictService = {
  async getConflicts(bidId: string): Promise<ConflictItem[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockConflicts[bidId] || [];
    }
    const response = await api.get<ConflictItem[]>(`/bids/${bidId}/conflicts`);
    return response.data;
  }
};
