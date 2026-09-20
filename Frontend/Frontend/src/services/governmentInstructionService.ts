import { api, USE_MOCK } from './api';
import { mockGovernmentInstructions } from '../data/mockData';
import type { GovernmentInstruction } from '../types';

export const governmentInstructionService = {
  async getInstructions(): Promise<GovernmentInstruction[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return mockGovernmentInstructions;
    }
    const response = await api.get('/government-instructions');
    return response.data;
  },

  async getRestrictions(): Promise<GovernmentInstruction[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockGovernmentInstructions.filter(item => item.isRestriction);
    }
    const response = await api.get('/government-instructions/restrictions');
    return response.data;
  },

  async askGovernment(question: string, topK: number = 5, threshold: number = 0.70): Promise<any> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return {
        answer: `Query processed via Local Compliance Engine for: "${question}". Applicable frameworks: Rule 144(xi) GFR 2017 & Public Procurement Order 2017. All local content and security requirements verified.`,
        relevantInstructions: mockGovernmentInstructions
      };
    }
    const response = await api.post('/government/ask', {
      question,
      top_k: topK,
      threshold
    });
    return response.data;
  }
};
