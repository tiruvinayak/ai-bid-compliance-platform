import { api, USE_MOCK } from './api';
import type { GovernmentVerificationResponse } from '../types';

export const verificationService = {
  /** Runs the requested providers (or all when omitted) for a bid. */
  async runVerification(
    bidId: string,
    providers?: string[]
  ): Promise<GovernmentVerificationResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return { bidId, tenderId: null, checkedAt: new Date().toISOString(), results: [] };
    }
    const response = await api.post<GovernmentVerificationResponse>(
      `/bids/${encodeURIComponent(bidId)}/government-verification`,
      providers && providers.length > 0 ? { providers } : {}
    );
    return response.data;
  },

  /** Retrieves previously stored results (latest per provider). */
  async getVerification(bidId: string): Promise<GovernmentVerificationResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return { bidId, tenderId: null, checkedAt: null, results: [] };
    }
    const response = await api.get<GovernmentVerificationResponse>(
      `/bids/${encodeURIComponent(bidId)}/government-verification`
    );
    return response.data;
  }
};
