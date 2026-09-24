export type ComplianceStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'MISSING' | 'CONFLICT';

export type PreliminaryCheckStatus = 'PASS' | 'REVIEW' | 'FAIL' | 'MISSING' | 'CONFLICT';

export type PreliminaryCheckType = 
  | 'DOCUMENT_VALIDITY'
  | 'REQUIRED_DOCUMENT'
  | 'EXPIRY_DATE'
  | 'FIELD_COMPLETENESS'
  | 'CROSS_PAGE_CONSISTENCY';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type DocProcessingStatus = 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'COMPLETED' | 'FAILED';

export type BidStatus = 'Draft' | 'Analyzing' | 'Review Required' | 'Verified' | 'Rejected' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'FAILED';

export interface Bid {
  id: string;
  bidId?: string;
  tenderId: string;
  tenderTitle: string;
  department: string;
  bidderName: string;
  registrationNo: string;
  gstin: string;
  category: string;
  tenderDate: string;
  closingDate: string;
  compliancePercentage: number;
  riskLevel: RiskLevel;
  status: BidStatus;
  totalRequirements: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  missingCount: number;
  conflictCount: number;
  createdAt: string;
}

export interface Requirement {
  id: string;
  bidId: string;
  requirementId?: string;
  category: 'Financial' | 'Registration' | 'Experience' | 'Technical' | 'Legal' | 'Identity';
  requirement: string;
  requiredValue: string;
  detectedValue: string;
  status: ComplianceStatus;
  risk: RiskLevel;
  confidence: number;
  sourceDoc: string;
  pageNumber: number;
  mandatory: boolean;
  reason: string;
}

export interface EvidenceDetail {
  requirementId: string;
  requirementTitle: string;
  sourceDocument: string;
  pageNumber: number;
  extractedSnippet: string;
  requiredValue: string;
  detectedValue: string;
  decision: ComplianceStatus;
  reason: string;
  confidence: number;
  verificationSource?: string;
  contextBefore?: string;
  contextAfter?: string;
}

export interface RiskCategorySummary {
  category: 'Financial' | 'Documentation' | 'Experience' | 'Registration' | 'Identity';
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  factors: string[];
}

export interface ConflictItem {
  id: string;
  bidId: string;
  requirementId: string;
  title: string;
  requirement: string;
  submittedDocument: string;
  submittedValue: string;
  verificationSource: string;
  verificationValue: string;
  status: 'HUMAN REVIEW REQUIRED' | 'RESOLVED' | 'UNRESOLVED';
  riskLevel: RiskLevel;
  sources: string[];
  explanation: string;
}

export interface AuditEvent {
  id: string;
  bidId: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  entity: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT' | 'INFO';
  details: string;
}

export interface OfficerReviewRecord {
  bidId: string;
  officerName: string;
  officerDesignation: string;
  recommendation: string;
  finalDecision?: 'APPROVED' | 'REJECTED' | 'REQUEST_CLARIFICATION' | 'UNDER_REVIEW';
  comment?: string;
  updatedAt?: string;
}

export type UserRole = 'USER' | 'GOVERNMENT OFFICER' | 'CENTRAL_ADMIN' | 'SECTOR_USER';

export interface SectorSummary {
  id: number;
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  departmentCount: number;
  tenderCount: number;
  activeTenderCount: number;
  completedTenderCount: number;
}

export interface DepartmentSummary {
  id: number;
  sectorId: number;
  sectorCode?: string;
  sectorName?: string;
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  tenderCount: number;
  activeTenderCount: number;
  completedTenderCount: number;
  officerCount: number;
}

export interface SectorDetail extends SectorSummary {
  departments: DepartmentSummary[];
}

export interface OfficerSummary {
  id: number;
  name: string;
  email: string;
  designation?: string;
  officerId?: string;
  role?: string;
}

export interface HierarchyTender {
  id: number;
  tenderId: string;
  title: string;
  status: string;
  category?: string;
  tenderDate?: string;
  closingDate?: string;
  departmentId?: number;
  departmentName?: string;
  sectorId?: number;
  sectorName?: string;
  assignedOfficerId?: number;
  assignedOfficerName?: string;
  bidderCount: number;
  complianceStatus?: string;
  primaryBidId?: string;
}

export interface DepartmentDetail extends DepartmentSummary {
  officers: OfficerSummary[];
  tenders: HierarchyTender[];
}

export interface CentralOverview {
  totalSectors: number;
  totalDepartments: number;
  totalTenders: number;
  activeTenders: number;
  completedTenders: number;
  sectors: SectorSummary[];
  recentTenders: HierarchyTender[];
}

export interface DocStage {
  name: string;
  completed: boolean;
  timestamp?: string;
  details?: string;
}

export interface BidderDocument {
  id: string;
  bidId?: string;
  filename: string;
  docType: string;
  fileFormat: string;
  fileSize: string;
  uploadStatus: DocProcessingStatus;
  processingStatus: DocProcessingStatus;
  uploadedAt: string;
  pageCount?: number;
  sectionCount?: number;
  sheetCount?: number;
  slideCount?: number;
  recordCount?: number;
  unitLabel?: string;
  progressPercentage?: number;
  stages?: DocStage[];
  uploadedBy?: string;
}

export interface UserProfile {
  id?: number;
  name: string;
  designation: string;
  department: string;
  organization?: string;
  mobile?: string;
  officerId?: string;
  gstin?: string;
  registrationNo?: string;
  email: string;
  role: UserRole;
  accountStatus?: string;
  lastLogin?: string;
  sectorId?: number;
  departmentId?: number;
}

export interface GovernmentInstruction {
  id: string;
  title: string;
  description: string;
  category: 
    | 'Procurement Guidelines'
    | 'Bid Submission Requirements'
    | 'Document Requirements'
    | 'Eligibility Requirements'
    | 'Financial Requirements'
    | 'Experience Requirements'
    | 'Registration Requirements'
    | 'Compliance Requirements'
    | 'Verification Guidance'
    | 'Important Restrictions'
    | 'Frequently Asked Questions';
  sourceRef: string;
  sourceUrl?: string;
  lastUpdated: string;
  isRestriction?: boolean;
}

export interface HelpdeskFAQ {
  id: string;
  question: string;
  answer: string;
  category: 'Document Upload Help' | 'Verification Help' | 'Account Help' | 'General';
}

export interface HelpdeskQuery {
  id?: string;
  name: string;
  email: string;
  category: string;
  message: string;
  createdAt?: string;
}

export interface PreliminaryVerificationSummary {
  overallStatus: PreliminaryCheckStatus;
  summary: {
    pass: number;
    review: number;
    fail: number;
    missing: number;
    conflict: number;
    total: number;
  };
}

export interface PreliminaryVerificationCheck {
  id: number;
  bidId: string;
  documentId: string;
  checkType: PreliminaryCheckType;
  status: PreliminaryCheckStatus;
  message: string;
  fieldName: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  sourcePage: number | null;
  evidenceReference: string | null;
  createdAt: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: AssistantCitation[];
  timestamp: string;
  groundingStatus?: string;
}

export interface AssistantCitation {
  type: 'requirement' | 'fact' | 'compliance' | 'preliminary' | 'evidence' | 'risk' | 'conflict';
  id: string;
  page?: number | null;
}

export interface AssistantChatRequest {
  question: string;
  chat_history?: AssistantMessage[];
}

export interface AssistantChatResponse {
  answer: string;
  citations: AssistantCitation[];
  grounding_status: 'GROUNDED' | 'INSUFFICIENT_EVIDENCE' | 'GENERATION_FAILED' | 'VALIDATION_ERROR';
  error_message?: string;
}
