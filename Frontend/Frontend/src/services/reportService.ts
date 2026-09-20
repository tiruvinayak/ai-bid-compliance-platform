import { api, USE_MOCK } from './api';
import { mockOfficerReviewRecord } from '../data/mockData';
import type { OfficerReviewRecord } from '../types';

export const reportService = {
  async getOfficerReview(bidId: string): Promise<OfficerReviewRecord | null> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockOfficerReviewRecord[bidId] || null;
    }
    const response = await api.get<OfficerReviewRecord>(`/bids/${bidId}/review`);
    return response.data;
  },

  async saveOfficerReview(bidId: string, record: Partial<OfficerReviewRecord>): Promise<OfficerReviewRecord> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const current = mockOfficerReviewRecord[bidId];
      if (!current) throw new Error(`No officer review record exists for bid ${bidId}.`);
      mockOfficerReviewRecord[bidId] = {
        ...current,
        ...record,
        updatedAt: new Date().toLocaleString()
      };
      return mockOfficerReviewRecord[bidId];
    }
    const response = await api.post<OfficerReviewRecord>(`/bids/${bidId}/review`, record);
    return response.data;
  },

  async generateReport(bidId: string): Promise<{ downloadUrl?: string; generatedAt: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return {
        generatedAt: new Date().toLocaleString()
      };
    }
    const response = await api.post(`/bids/${bidId}/report/generate`);
    return response.data;
  },

  async downloadReport(downloadUrl: string): Promise<Blob> {
    const endpoint = downloadUrl.replace(/^\/api(?=\/)/, '');
    const response = await api.get<Blob>(endpoint, { responseType: 'blob' });
    return response.data;
  }
};
