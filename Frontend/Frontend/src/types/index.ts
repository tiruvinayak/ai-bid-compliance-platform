export type ComplianceStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'MISSING' | 'CONFLICT';

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

export type UserRole = 'USER' | 'GOVERNMENT OFFICER';

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
