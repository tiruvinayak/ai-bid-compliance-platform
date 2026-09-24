import { api, USE_MOCK } from './api';
import type {
  CentralOverview,
  DepartmentDetail,
  DepartmentSummary,
  HierarchyTender,
  SectorDetail,
  SectorSummary
} from '../types';

const mockSectors: SectorSummary[] = [
  {
    id: 1,
    code: 'RAILWAYS',
    name: 'Railways',
    description: 'DEMO sector',
    departmentCount: 2,
    tenderCount: 2,
    activeTenderCount: 2,
    completedTenderCount: 0
  },
  {
    id: 2,
    code: 'FINANCE',
    name: 'Finance',
    description: 'DEMO sector',
    departmentCount: 2,
    tenderCount: 2,
    activeTenderCount: 1,
    completedTenderCount: 1
  },
  {
    id: 3,
    code: 'DEFENCE',
    name: 'Defence',
    description: 'DEMO sector',
    departmentCount: 2,
    tenderCount: 2,
    activeTenderCount: 1,
    completedTenderCount: 1
  },
  {
    id: 4,
    code: 'PETROLEUM_ENERGY',
    name: 'Petroleum & Energy',
    description: 'DEMO sector',
    departmentCount: 2,
    tenderCount: 2,
    activeTenderCount: 1,
    completedTenderCount: 1
  }
];

export const hierarchyService = {
  async getOverview(): Promise<CentralOverview> {
    if (USE_MOCK) {
      return {
        totalSectors: mockSectors.length,
        totalDepartments: mockSectors.reduce((s, x) => s + x.departmentCount, 0),
        totalTenders: mockSectors.reduce((s, x) => s + x.tenderCount, 0),
        activeTenders: mockSectors.reduce((s, x) => s + x.activeTenderCount, 0),
        completedTenders: mockSectors.reduce((s, x) => s + x.completedTenderCount, 0),
        sectors: mockSectors,
        recentTenders: []
      };
    }
    const response = await api.get('/government/overview');
    return response.data;
  },

  async getSectors(): Promise<SectorSummary[]> {
    if (USE_MOCK) return mockSectors;
    const response = await api.get('/sectors');
    return response.data;
  },

  async getSector(sectorId: number | string): Promise<SectorDetail> {
    if (USE_MOCK) {
      const sector = mockSectors.find((s) => String(s.id) === String(sectorId)) || mockSectors[0];
      return {
        ...sector,
        departments: [
          {
            id: 101,
            sectorId: sector.id,
            sectorCode: sector.code,
            sectorName: sector.name,
            code: 'DEMO-A',
            name: `${sector.name} Demo Department A`,
            description: 'DEMO department',
            tenderCount: 1,
            activeTenderCount: 1,
            completedTenderCount: 0,
            officerCount: 1
          },
          {
            id: 102,
            sectorId: sector.id,
            sectorCode: sector.code,
            sectorName: sector.name,
            code: 'DEMO-B',
            name: `${sector.name} Demo Department B`,
            description: 'DEMO department',
            tenderCount: 1,
            activeTenderCount: 0,
            completedTenderCount: 1,
            officerCount: 0
          }
        ]
      };
    }
    const response = await api.get(`/sectors/${sectorId}`);
    return response.data;
  },

  async getDepartments(sectorId: number | string): Promise<DepartmentSummary[]> {
    if (USE_MOCK) {
      const detail = await this.getSector(sectorId);
      return detail.departments;
    }
    const response = await api.get(`/sectors/${sectorId}/departments`);
    return response.data;
  },

  async getDepartment(departmentId: number | string): Promise<DepartmentDetail> {
    if (USE_MOCK) {
      return {
        id: Number(departmentId),
        sectorId: 1,
        sectorCode: 'RAILWAYS',
        sectorName: 'Railways',
        code: 'RPD',
        name: 'Railway Procurement Department',
        description: 'DEMO department',
        tenderCount: 1,
        activeTenderCount: 1,
        completedTenderCount: 0,
        officerCount: 1,
        officers: [
          {
            id: 1,
            name: 'Rajesh V. Sharma',
            email: 'officer@demo.gov.in',
            designation: 'Senior Procurement Officer',
            officerId: 'OFF-RPD-DEMO-001',
            role: 'GOVERNMENT OFFICER'
          }
        ],
        tenders: [
          {
            id: 1,
            tenderId: 'TND-GEM-2026-1042',
            title: 'Supply and Installation of Network Infrastructure',
            status: 'ACTIVE',
            closingDate: '2026-09-15',
            bidderCount: 1,
            assignedOfficerName: 'Rajesh V. Sharma',
            complianceStatus: 'Review Required',
            primaryBidId: 'GEM-2026-001'
          }
        ]
      };
    }
    const response = await api.get(`/departments/${departmentId}`);
    return response.data;
  },

  async getDepartmentTenders(departmentId: number | string): Promise<HierarchyTender[]> {
    if (USE_MOCK) {
      const dept = await this.getDepartment(departmentId);
      return dept.tenders;
    }
    const response = await api.get(`/departments/${departmentId}/tenders`);
    return response.data;
  },

  async getTenders(params?: { sectorId?: number; departmentId?: number }): Promise<HierarchyTender[]> {
    if (USE_MOCK) return [];
    const response = await api.get('/tenders', { params });
    return response.data;
  }
};
