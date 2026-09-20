import { api, USE_MOCK } from './api';
import { mockAuditTrail } from '../data/mockData';
import type { AuditEvent } from '../types';

export const auditService = {
  async getAuditTrail(bidId: string): Promise<AuditEvent[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockAuditTrail[bidId] || [];
    }
    const response = await api.get<AuditEvent[]>(`/bids/${bidId}/audit`);
    return response.data;
  }
};
