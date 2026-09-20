import { api, USE_MOCK } from './api';
import { mockUserBidderDocuments, mockBids } from '../data/mockData';
import type { BidderDocument } from '../types';

let userDocsState: BidderDocument[] = mockUserBidderDocuments.map((document) => ({
  ...document,
  bidId: document.bidId || mockBids[0]?.id || ''
}));

export const documentService = {
  async getDocuments(bidId: string): Promise<BidderDocument[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return userDocsState.filter((document) => document.bidId === bidId);
    }
    const response = await api.get<BidderDocument[]>(`/bids/${bidId}/documents`);
    return response.data;
  },

  async getUserDocuments(): Promise<BidderDocument[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      const currentUserEmail = localStorage.getItem('gem_user_email') || '';
      return userDocsState.filter((d) => d.uploadedBy === currentUserEmail);
    }
    const response = await api.get<BidderDocument[]>('/user/documents');
    return response.data;
  },

  async uploadTenderDocument(bidId: string, file: File): Promise<BidderDocument> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800));
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      const currentUserEmail = localStorage.getItem('gem_user_email') || '';
      const uploaded: BidderDocument = {
        id: `DOC-TND-${Date.now()}`,
        bidId,
        filename: file.name,
        docType: "Tender RFP Specification",
        fileFormat: ext,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadStatus: "UPLOADED",
        processingStatus: "PROCESSING",
        uploadedAt: new Date().toISOString(),
        unitLabel: "Pages",
        progressPercentage: 10,
        uploadedBy: currentUserEmail
      };
      userDocsState = [uploaded, ...userDocsState.filter((document) => !(document.bidId === bidId && document.docType.toLowerCase().includes('tender')) )];
      return uploaded;
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<BidderDocument>(`/bids/${bidId}/tender-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async uploadBidderDocument(bidId: string, file: File, docType: string): Promise<BidderDocument> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 700));
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      const currentUserEmail = localStorage.getItem('gem_user_email') || '';

      const newDoc: BidderDocument = {
        id: `DOC-BID-${Date.now()}`,
        bidId,
        filename: file.name,
        docType: docType || "Bidder Certificate",
        fileFormat: ext,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadStatus: "UPLOADED",
        processingStatus: "PROCESSING",
        uploadedAt: new Date().toISOString(),
        unitLabel: ext === 'PDF' ? 'Pages' : undefined,
        progressPercentage: 10,
        uploadedBy: currentUserEmail,
        stages: [
          { name: "Uploaded", completed: true, timestamp: "Just now", details: "File uploaded successfully" },
          { name: "Content Detected", completed: false, details: "Awaiting processing service" },
          { name: "Content Processed", completed: false },
          { name: "Ready for Verification", completed: false }
        ]
      };

      userDocsState = [newDoc, ...userDocsState];
      return newDoc;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    const response = await api.post<BidderDocument>(`/bids/${bidId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await api.get<Blob>(`/documents/${encodeURIComponent(documentId)}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
