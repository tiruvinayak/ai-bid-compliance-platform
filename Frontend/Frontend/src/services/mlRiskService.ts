import { api, USE_MOCK } from './api';
import type { MlRiskResponse } from '../types';

export const mlRiskService = {
  /**
   * Computes the ML-indicated risk for a bid (decision support).
   * Returns status NOT_AVAILABLE with factual features when no trained model exists.
   */
  async assessMlRisk(bidId: string): Promise<MlRiskResponse> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return {
        bidId,
        status: 'NOT_AVAILABLE',
        reason: 'No validated trained model available',
        featureVersion: 'v1',
        features: {
          featureVersion: 'v1',
          requirementsPassed: 0,
          requirementsReview: 0,
          requirementsFailed: 0,
          requirementsMissing: 0,
          preliminaryFailCount: 0,
          preliminaryReviewCount: 0,
          expiredDocumentCount: 0,
          conflictCount: 0,
          riskFactorCount: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          documentCount: 0,
          evidenceCoverage: 0
        },
        modelVersion: null,
        riskLevel: null,
        prediction: null,
        contributingFeatures: []
      };
    }
    const response = await api.post<MlRiskResponse>(
      `/bids/${encodeURIComponent(bidId)}/ml-risk`
    );
    return response.data;
  }
};
