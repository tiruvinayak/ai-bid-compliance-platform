import { api, USE_MOCK } from './api';
import { mockHelpdeskFAQs } from '../data/mockData';
import type { HelpdeskFAQ, HelpdeskQuery } from '../types';

export const helpdeskService = {
  async getFAQs(): Promise<HelpdeskFAQ[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 250));
      return mockHelpdeskFAQs;
    }
    const response = await api.get('/helpdesk/faqs');
    return response.data;
  },

  async submitQuery(query: HelpdeskQuery): Promise<{ success: boolean; ticketId: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      return { success: true, ticketId };
    }
    const response = await api.post('/helpdesk/queries', query);
    return response.data;
  }
};
