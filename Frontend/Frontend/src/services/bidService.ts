import { api, USE_MOCK } from './api';
import { mockBids } from '../data/mockData';
import type { Bid } from '../types';

let localBids = [...mockBids];

export const bidService = {
  async getBids(): Promise<Bid[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return localBids;
    }
    const response = await api.get<Bid[]>('/bids');
    return response.data;
  },

  async getBidById(id: string): Promise<Bid | null> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const found = localBids.find((b) => b.id === id || b.bidId === id);
      return found || null;
    }
    const response = await api.get<Bid>(`/bids/${id}`);
    return response.data;
  },

  async createBid(bidData: Partial<Bid>): Promise<Bid> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const newId = `GEM-2026-${String(localBids.length + 1).padStart(3, '0')}`;
      const newBid: Bid = {
        id: newId,
        tenderId: bidData.tenderId || "TND-GEM-2026-9999",
        tenderTitle: bidData.tenderTitle || "New GeM Procurement Project",
        department: bidData.department || "Ministry of Electronics & IT",
        bidderName: bidData.bidderName || "Applicant Vendor",
        registrationNo: bidData.registrationNo || "CIN-U00000DL2026PTC000000",
        gstin: bidData.gstin || "07XXXXX0000X1ZX",
        category: bidData.category || "General Procurement",
        tenderDate: bidData.tenderDate || new Date().toISOString().split('T')[0],
        closingDate: bidData.closingDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        compliancePercentage: 0,
        riskLevel: "MEDIUM",
        status: "Draft",
        totalRequirements: 0,
        passCount: 0,
        failCount: 0,
        reviewCount: 0,
        missingCount: 0,
        conflictCount: 0,
        createdAt: new Date().toLocaleString()
      };
      localBids.unshift(newBid);
      return newBid;
    }
    const response = await api.post<Bid>('/bids', bidData);
    return response.data;
  }
};
