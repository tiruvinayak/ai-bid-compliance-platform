import { api, USE_MOCK } from './api';
import type { BidComparison } from '../types';

export const comparisonService = {
  async getComparison(tenderId: string, bidIds?: string[]): Promise<BidComparison> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return {
        tenderId,
        tenderTitle: 'Demo Tender',
        departmentName: 'Demo Department',
        sectorName: 'Demo Sector',
        bidCount: 0,
        bidders: [],
        requirements: [],
        documentCoverage: []
      };
    }
    const response = await api.get<BidComparison>(
      `/tenders/${encodeURIComponent(tenderId)}/comparison`,
      { params: bidIds && bidIds.length > 0 ? { bidIds } : undefined }
    );
    return response.data;
  }
};
