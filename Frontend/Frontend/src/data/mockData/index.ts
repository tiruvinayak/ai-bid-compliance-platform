import type { 
  Bid, 
  BidderDocument, 
  Requirement, 
  EvidenceDetail, 
  RiskCategorySummary, 
  ConflictItem, 
  AuditEvent, 
  OfficerReviewRecord, 
  UserProfile,
  GovernmentInstruction,
  HelpdeskFAQ 
} from '../../types';

export const mockUserProfiles: Record<string, UserProfile> = {
  USER: {
    name: "Sathvik Reddy",
    designation: "Authorized Bidder Representative",
    department: "ABC Technologies Pvt Ltd",
    email: "user@demo.gov.in",
    role: "USER",
    accountStatus: "Active",
    lastLogin: "29 Aug 2026, 06:45 PM"
  },
  "GOVERNMENT OFFICER": {
    name: "Rajesh V. Sharma",
    designation: "Senior Procurement Officer",
    department: "Railway Procurement Department",
    email: "officer@demo.gov.in",
    role: "GOVERNMENT OFFICER",
    officerId: "OFF-RPD-DEMO-001",
    departmentId: 1,
    sectorId: 1,
    accountStatus: "Active",
    lastLogin: "29 Aug 2026, 07:15 PM"
  },
  CENTRAL_ADMIN: {
    name: "Central Government Admin (DEMO)",
    designation: "Central Procurement Oversight Administrator",
    department: "Central Government (DEMO)",
    email: "admin@demo.gov.in",
    role: "CENTRAL_ADMIN",
    officerId: "CG-ADMIN-DEMO-001",
    accountStatus: "Active",
    lastLogin: "22 Sep 2026, 09:00 AM"
  },
  SECTOR_USER: {
    name: "Railways Sector Officer (DEMO)",
    designation: "Sector Procurement Coordinator",
    department: "Railways Sector (DEMO)",
    email: "railways@demo.gov.in",
    role: "SECTOR_USER",
    officerId: "SEC-RAIL-DEMO-001",
    sectorId: 1,
    accountStatus: "Active",
    lastLogin: "22 Sep 2026, 09:05 AM"
  }
};

export const mockCurrentUser: UserProfile = mockUserProfiles["GOVERNMENT OFFICER"];

export const mockUserBidderDocuments: BidderDocument[] = [
  {
    id: "DOC-U01",
    filename: "GST_Certificate_2026.pdf",
    docType: "GST Certificate",
    fileFormat: "PDF",
    fileSize: "1.2 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    pageCount: 3,
    unitLabel: "Pages",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 10:00 AM", details: "File uploaded successfully" },
      { name: "Content Detected", completed: true, timestamp: "29 Aug 2026 10:01 AM", details: "GSTIN 07AAAAA0000A1Z5 extracted" },
      { name: "Pages Processed", completed: true, timestamp: "29 Aug 2026 10:02 AM", details: "3 pages OCR verified" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 10:03 AM", details: "Ready for compliance checks" }
    ]
  },
  {
    id: "DOC-U02",
    filename: "Financial_Statement_FY25.pdf",
    docType: "Financial Document",
    fileFormat: "PDF",
    fileSize: "8.5 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSING",
    uploadedAt: "29 Aug 2026",
    pageCount: 24,
    unitLabel: "Pages",
    progressPercentage: 75,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 11:15 AM", details: "File uploaded successfully" },
      { name: "Content Detected", completed: true, timestamp: "29 Aug 2026 11:16 AM", details: "Audited Balance Sheet & P&L detected" },
      { name: "Pages Processed", completed: true, timestamp: "29 Aug 2026 11:18 AM", details: "18 of 24 pages parsed" },
      { name: "Ready for Verification", completed: false, details: "Processing turnover tables..." }
    ]
  },
  {
    id: "DOC-U03",
    filename: "Experience_Certificate_NIC.docx",
    docType: "Experience",
    fileFormat: "DOCX",
    fileSize: "2.4 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    sectionCount: 12,
    unitLabel: "Sections",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 01:20 PM", details: "DOCX binary ingested" },
      { name: "Document Detected", completed: true, timestamp: "29 Aug 2026 01:21 PM", details: "Formatted text & tables extracted" },
      { name: "Sections Processed", completed: true, timestamp: "29 Aug 2026 01:22 PM", details: "12 contract sections indexed" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 01:23 PM", details: "Work order references parsed" }
    ]
  },
  {
    id: "DOC-U04",
    filename: "Financial_Audited_Ledger.xlsx",
    docType: "Financial Spreadsheet",
    fileFormat: "XLSX",
    fileSize: "4.1 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    sheetCount: 5,
    unitLabel: "Sheets",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 02:10 PM", details: "Spreadsheet uploaded" },
      { name: "Spreadsheet Detected", completed: true, timestamp: "29 Aug 2026 02:11 PM", details: "5 workbook worksheets identified" },
      { name: "Data Processed", completed: true, timestamp: "29 Aug 2026 02:12 PM", details: "Revenue & tax reconciliation rows mapped" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 02:13 PM", details: "Cell grid parsed for compliance" }
    ]
  },
  {
    id: "DOC-U05",
    filename: "OEM_Authorization_Letter.pdf",
    docType: "OEM Authorization Form",
    fileFormat: "PDF",
    fileSize: "0.8 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "FAILED",
    uploadedAt: "29 Aug 2026",
    pageCount: 2,
    unitLabel: "Pages",
    progressPercentage: 30,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 03:00 PM", details: "File uploaded" },
      { name: "Content Detected", completed: false, timestamp: "29 Aug 2026 03:01 PM", details: "Signature invalid / file corruption flag" },
      { name: "Pages Processed", completed: false, details: "Failed to extract text layer" },
      { name: "Ready for Verification", completed: false, details: "Verification halted" }
    ]
  },
  {
    id: "DOC-U06",
    filename: "ISO_27001_Certification.png",
    docType: "ISO Certificate",
    fileFormat: "PNG",
    fileSize: "1.5 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    pageCount: 1,
    unitLabel: "Pages",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 03:30 PM", details: "Image uploaded" },
      { name: "Image OCR Detected", completed: true, timestamp: "29 Aug 2026 03:31 PM", details: "OCR text layer constructed" },
      { name: "Metadata Processed", completed: true, timestamp: "29 Aug 2026 03:32 PM", details: "Expiry date 15-Jun-2026 extracted" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 03:33 PM", details: "Ready for compliance checks" }
    ]
  },
  {
    id: "DOC-U07",
    filename: "Annual_Turnover_Breakdown.csv",
    docType: "Financial Document",
    fileFormat: "CSV",
    fileSize: "320 KB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    recordCount: 1450,
    unitLabel: "Records",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 04:00 PM", details: "CSV raw records ingested" },
      { name: "File Detected", completed: true, timestamp: "29 Aug 2026 04:01 PM", details: "1,450 records identified" },
      { name: "Data Processed", completed: true, timestamp: "29 Aug 2026 04:02 PM", details: "Row & column headers aligned" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 04:03 PM", details: "Ready for verification" }
    ]
  },
  {
    id: "DOC-U08",
    filename: "Non_Blacklisting_Affidavit.pdf",
    docType: "Non-Blacklisting Undertaking",
    fileFormat: "PDF",
    fileSize: "1.1 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    pageCount: 4,
    unitLabel: "Pages",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 04:15 PM", details: "File uploaded" },
      { name: "Content Detected", completed: true, timestamp: "29 Aug 2026 04:16 PM", details: "Notary stamp detected" },
      { name: "Pages Processed", completed: true, timestamp: "29 Aug 2026 04:17 PM", details: "4 pages parsed" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 04:18 PM", details: "Ready for compliance checks" }
    ]
  },
  {
    id: "DOC-U09",
    filename: "Company_PAN_Aadhaar.pdf",
    docType: "Identity Document",
    fileFormat: "PDF",
    fileSize: "0.9 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    pageCount: 2,
    unitLabel: "Pages",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 04:30 PM", details: "Identity file uploaded" },
      { name: "Content Detected", completed: true, timestamp: "29 Aug 2026 04:31 PM", details: "PAN AABCA1234K matched" },
      { name: "Pages Processed", completed: true, timestamp: "29 Aug 2026 04:32 PM", details: "2 pages verified" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 04:33 PM", details: "Ready for verification" }
    ]
  },
  {
    id: "DOC-U10",
    filename: "Project_Architecture_Overview.pptx",
    docType: "Technical Proposal",
    fileFormat: "PPTX",
    fileSize: "12.4 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSING",
    uploadedAt: "29 Aug 2026",
    slideCount: 35,
    unitLabel: "Slides",
    progressPercentage: 60,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 05:00 PM", details: "Presentation ingested" },
      { name: "Presentation Detected", completed: true, timestamp: "29 Aug 2026 05:01 PM", details: "35 presentation slides found" },
      { name: "Content Extraction", completed: false, timestamp: "29 Aug 2026 05:03 PM", details: "Extracting diagram & text nodes..." },
      { name: "Ready for Verification", completed: false, details: "Pending presentation completion" }
    ]
  },
  {
    id: "DOC-U11",
    filename: "CMMI_Level5_Audit_Report.pdf",
    docType: "Quality Certification",
    fileFormat: "PDF",
    fileSize: "3.7 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    pageCount: 16,
    unitLabel: "Pages",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 05:20 PM", details: "File uploaded" },
      { name: "Content Detected", completed: true, timestamp: "29 Aug 2026 05:21 PM", details: "CMMI Appraisal record identified" },
      { name: "Pages Processed", completed: true, timestamp: "29 Aug 2026 05:22 PM", details: "16 pages parsed" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 05:23 PM", details: "Ready for verification" }
    ]
  },
  {
    id: "DOC-U12",
    filename: "MSME_Udyam_Registration.pdf",
    docType: "Registration Certificate",
    fileFormat: "PDF",
    fileSize: "1.0 MB",
    uploadStatus: "UPLOADED",
    processingStatus: "PROCESSED",
    uploadedAt: "29 Aug 2026",
    pageCount: 2,
    unitLabel: "Pages",
    progressPercentage: 100,
    uploadedBy: "user@demo.gov.in",
    stages: [
      { name: "Uploaded", completed: true, timestamp: "29 Aug 2026 05:40 PM", details: "File uploaded" },
      { name: "Content Detected", completed: true, timestamp: "29 Aug 2026 05:41 PM", details: "Udyam registration verified" },
      { name: "Pages Processed", completed: true, timestamp: "29 Aug 2026 05:42 PM", details: "2 pages parsed" },
      { name: "Ready for Verification", completed: true, timestamp: "29 Aug 2026 05:43 PM", details: "Ready for verification" }
    ]
  }
];

export const mockBidderDocuments: Record<string, BidderDocument[]> = {
  "GEM-2026-001": mockUserBidderDocuments
};

export const mockGovernmentInstructions: GovernmentInstruction[] = [
  {
    id: "INST-001",
    title: "Mandatory Minimum Financial Turnover Rule (GFR 2017 Rule 144)",
    description: "Bidders must demonstrate a minimum average annual financial turnover in the preceding 3 financial years as specified in the RFP document. Turnover must be validated by an Independent Chartered Accountant Balance Sheet with UDIN.",
    category: "Financial Requirements",
    sourceRef: "General Financial Rules (GFR) 2017 - Rule 144(i)",
    sourceUrl: "https://gem.gov.in/gfr-rules",
    lastUpdated: "15 Jan 2026",
    isRestriction: true
  },
  {
    id: "INST-002",
    title: "GST Compliance & Tax Return Reconciliation Policy",
    description: "Turnover figures declared in submitted audited P&L accounts must reconcile with GSTR-3B and GSTR-1 returns filed on the official GSTN portal. Discrepancies exceeding 5% trigger mandatory officer compliance review.",
    category: "Compliance Requirements",
    sourceRef: "GeM Circular No. GeM/2025/CIRC-889",
    sourceUrl: "https://gem.gov.in/gst-policy",
    lastUpdated: "01 Feb 2026",
    isRestriction: true
  },
  {
    id: "INST-003",
    title: "Land Border Security Restriction (Rule 144(xi))",
    description: "Any bidder from a country sharing a land border with India is eligible to bid in public procurement ONLY if registered with the Competent Authority (DPIIT). Valid registration certificate must be attached with technical bid.",
    category: "Important Restrictions",
    sourceRef: "Ministry of Finance Order (F.No.6/18/2019-PPD)",
    sourceUrl: "https://gem.gov.in/land-border-rule",
    lastUpdated: "10 Nov 2025",
    isRestriction: true
  },
  {
    id: "INST-004",
    title: "OEM Manufacturer Authorization Format (MAF) Validity",
    description: "For hardware and software tenders, OEM Manufacturer Authorization must contain verifiable digital signatures and specify the exact Tender ID. Generic or expired authorizations result in immediate technical disqualification.",
    category: "Document Requirements",
    sourceRef: "Public Procurement Policy Order 2017 Section 8",
    sourceUrl: "https://gem.gov.in/oem-guidelines",
    lastUpdated: "20 Dec 2025",
    isRestriction: false
  },
  {
    id: "INST-005",
    title: "Past Experience & Client Work Order Verification",
    description: "Experience certificates must be issued by an officer not below the rank of Executive Engineer or General Manager for PSU/Govt contracts. Sub-contracting experience is unverified unless explicitly allowed in the tender document.",
    category: "Experience Requirements",
    sourceRef: "GeM Standard Operating Procedure SOP-2026-03",
    sourceUrl: "https://gem.gov.in/sop-experience",
    lastUpdated: "05 Feb 2026",
    isRestriction: false
  },
  {
    id: "INST-006",
    title: "Digital Signature & Stamp Paper Authenticity Requirement",
    description: "Non-blacklisting affidavits must be executed on minimum ₹100 non-judicial stamp paper dated within 6 months of bid submission. Digital Signatures (Class 3 DSC) must match company authorized signatory.",
    category: "Important Restrictions",
    sourceRef: "Information Technology Act 2000 Section 3A",
    sourceUrl: "https://gem.gov.in/dsc-guidelines",
    lastUpdated: "18 Jan 2026",
    isRestriction: true
  },
  {
    id: "INST-007",
    title: "MSME & Make in India (MII) Preference Guidelines",
    description: "Micro & Small Enterprises (MSEs) registered with Udyam are exempted from EMD and prior turnover/experience requirements subject to technical capability verification as per MII Purchase Preference Policy.",
    category: "Eligibility Requirements",
    sourceRef: "Public Procurement Policy for MSEs Order 2012",
    sourceUrl: "https://gem.gov.in/msme-policy",
    lastUpdated: "02 Feb 2026",
    isRestriction: false
  },
  {
    id: "INST-008",
    title: "Automated Document OCR & RAG Extraction Protocol",
    description: "All uploaded bid documents undergo automated multi-stage OCR and section parsing. Ensure uploaded scans are at minimum 300 DPI resolution and unencrypted to allow fast verification.",
    category: "Verification Guidance",
    sourceRef: "GeM AI Verification Architecture Specs 2026",
    sourceUrl: "https://gem.gov.in/ai-verification",
    lastUpdated: "25 Feb 2026",
    isRestriction: false
  }
];

export const mockHelpdeskFAQs: HelpdeskFAQ[] = [
  {
    id: "FAQ-001",
    question: "Which document formats are supported for bidder upload?",
    answer: "The frontend interface supports PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, TXT, JPG, JPEG, and PNG files up to 50MB per file. Backend processing validates readability and extracts tabular/textual data automatically.",
    category: "Document Upload Help"
  },
  {
    id: "FAQ-002",
    question: "What happens if my uploaded document is corrupted or unreadable?",
    answer: "The AI verification pipeline flags unreadable documents as 'FAILED' or 'MISSING' with an immediate notification on your User Dashboard. You can re-upload a clear copy before bid closing date.",
    category: "Document Upload Help"
  },
  {
    id: "FAQ-003",
    question: "How is compliance percentage calculated for a bid?",
    answer: "Compliance is dynamically calculated by analyzing all mandatory RFP requirements against extracted evidence from your uploaded documents (Pass / Fail / Conflict / Review Required).",
    category: "Verification Help"
  },
  {
    id: "FAQ-004",
    question: "What is the difference between USER / BIDDER and GOVERNMENT OFFICER accounts?",
    answer: "USER / BIDDER role is designed for submitting tender documents, tracking upload status, and viewing government procurement instructions. GOVERNMENT OFFICER role is designed for evaluating bids, inspecting compliance matrices, reviewing risk indicators, and auditing evidence.",
    category: "Account Help"
  },
  {
    id: "FAQ-005",
    question: "How do I query a compliance flag raised by the automated system?",
    answer: "Bidders can submit clarification requests through the Helpdesk ticket form or upload supplementary documentation to resolve flagged conflicts.",
    category: "Verification Help"
  }
];


export const mockBids: Bid[] = [
  {
    id: "GEM-2026-001",
    tenderId: "TND-GEM-2026-8891",
    tenderTitle: "Procurement of Enterprise Cloud Infrastructure & AI Hardware for National Data Grid",
    department: "National Informatics Centre (NIC)",
    bidderName: "ABC Technologies Pvt Ltd",
    registrationNo: "CIN-U72200DL2018PTC334512",
    gstin: "07AAAAA0000A1Z5",
    category: "IT Hardware & Cloud Services",
    tenderDate: "2026-08-01",
    closingDate: "2026-08-25",
    compliancePercentage: 78,
    riskLevel: "HIGH",
    status: "Review Required",
    totalRequirements: 47,
    passCount: 31,
    failCount: 5,
    reviewCount: 7,
    missingCount: 1,
    conflictCount: 3,
    createdAt: "2026-08-26 10:15 AM"
  },
  {
    id: "GEM-2026-002",
    tenderId: "TND-GEM-2026-8891",
    tenderTitle: "Procurement of Enterprise Cloud Infrastructure & AI Hardware for National Data Grid",
    department: "National Informatics Centre (NIC)",
    bidderName: "XYZ Industries Ltd",
    registrationNo: "CIN-L74140MH2012PLC229871",
    gstin: "27AAACX1234F1ZP",
    category: "IT Hardware & Cloud Services",
    tenderDate: "2026-08-01",
    closingDate: "2026-08-25",
    compliancePercentage: 94,
    riskLevel: "LOW",
    status: "Verified",
    totalRequirements: 47,
    passCount: 44,
    failCount: 0,
    reviewCount: 2,
    missingCount: 0,
    conflictCount: 1,
    createdAt: "2026-08-26 11:30 AM"
  },
  {
    id: "GEM-2026-003",
    tenderId: "TND-GEM-2026-9042",
    tenderTitle: "Supply & Installation of High Performance Compute Servers for C-DAC Infrastructure",
    department: "Centre for Development of Advanced Computing",
    bidderName: "Bharat Infra Solutions Ltd",
    registrationNo: "CIN-U45200KA2015PLC081234",
    gstin: "29AAACB9876K1ZQ",
    category: "Hardware Procurement",
    tenderDate: "2026-08-10",
    closingDate: "2026-08-28",
    compliancePercentage: 85,
    riskLevel: "MEDIUM",
    status: "Review Required",
    totalRequirements: 38,
    passCount: 32,
    failCount: 2,
    reviewCount: 3,
    missingCount: 0,
    conflictCount: 1,
    createdAt: "2026-08-27 02:45 PM"
  },
  {
    id: "GEM-2026-004",
    tenderId: "TND-GEM-2026-9110",
    tenderTitle: "Annual Maintenance Contract & Security Audit of Smart City Portal",
    department: "Ministry of Housing and Urban Affairs",
    bidderName: "TechGov Systems Pvt Ltd",
    registrationNo: "CIN-U72900KA2019PTC120987",
    gstin: "29AABCT5432M1Z2",
    category: "Software & Consulting",
    tenderDate: "2026-08-15",
    closingDate: "2026-08-29",
    compliancePercentage: 96,
    riskLevel: "LOW",
    status: "Verified",
    totalRequirements: 30,
    passCount: 29,
    failCount: 0,
    reviewCount: 1,
    missingCount: 0,
    conflictCount: 0,
    createdAt: "2026-08-28 09:20 AM"
  }
];



export const mockRequirements: Record<string, Requirement[]> = {
  "GEM-2026-001": [
    {
      id: "REQ-001",
      bidId: "GEM-2026-001",
      category: "Financial",
      requirement: "Minimum Average Annual Turnover of ₹10 Crore in past 3 financial years",
      requiredValue: "₹10.00 Crore",
      detectedValue: "₹7.50 Crore",
      status: "FAIL",
      risk: "HIGH",
      confidence: 94,
      sourceDoc: "Audited_Financial_Statements_FY23_FY25.pdf",
      pageNumber: 14,
      mandatory: true,
      reason: "Detected turnover of ₹7.50 Cr is 25% below mandatory ₹10 Cr eligibility threshold."
    },
    {
      id: "REQ-002",
      bidId: "GEM-2026-001",
      category: "Registration",
      requirement: "Valid GST Registration Certificate active in state of Delhi/NCR",
      requiredValue: "Valid Active GSTIN",
      detectedValue: "Active GSTIN: 07AAAAA0000A1Z5",
      status: "PASS",
      risk: "LOW",
      confidence: 98,
      sourceDoc: "GST_Registration_Certificate_2025-26.pdf",
      pageNumber: 1,
      mandatory: true,
      reason: "GSTIN verified active against GSTN database records with matching legal name."
    },
    {
      id: "REQ-003",
      bidId: "GEM-2026-001",
      category: "Experience",
      requirement: "Minimum 5 years continuous experience executing Govt/PSU IT infrastructure contracts",
      requiredValue: ">= 5 Years Experience",
      detectedValue: "3 Years 8 Months (2022-2026)",
      status: "REVIEW",
      risk: "MEDIUM",
      confidence: 72,
      sourceDoc: "Past_Experience_Govt_Contracts.pdf",
      pageNumber: 4,
      mandatory: true,
      reason: "Work orders supplied cover 44 months of project history. 16 months gap detected in client certificates."
    },
    {
      id: "REQ-004",
      bidId: "GEM-2026-001",
      category: "Technical",
      requirement: "OEM Manufacturer Authorization Letter for Server CPU & Storage components",
      requiredValue: "Original Signed OEM Authorization Form (MAF)",
      detectedValue: "Document processing failed / Not verified",
      status: "MISSING",
      risk: "HIGH",
      confidence: 99,
      sourceDoc: "OEM_Manufacturer_Authorization.pdf",
      pageNumber: 1,
      mandatory: true,
      reason: "Submitted OEM authorization file was corrupted/unreadable. Valid digital signature could not be verified."
    },
    {
      id: "REQ-005",
      bidId: "GEM-2026-001",
      category: "Financial",
      requirement: "Annual GST Turnover filing matching audited balance sheet gross revenue",
      requiredValue: "₹12.00 Cr (Declared in Financials)",
      detectedValue: "₹8.70 Cr (GSTR-3B filings summary)",
      status: "CONFLICT",
      risk: "HIGH",
      confidence: 91,
      sourceDoc: "Audited_Financial_Statements_FY23_FY25.pdf",
      pageNumber: 22,
      mandatory: true,
      reason: "Discrepancy of ₹3.30 Cr detected between Audited Profit & Loss statement and GSTR-3B monthly summary."
    },
    {
      id: "REQ-006",
      bidId: "GEM-2026-001",
      category: "Legal",
      requirement: "Non-Blacklisting Undertaking Affidavit on ₹100 stamp paper signed by Director",
      requiredValue: "Signed Notarized Affidavit",
      detectedValue: "Notarized Affidavit dated 12-Jul-2026",
      status: "PASS",
      risk: "LOW",
      confidence: 96,
      sourceDoc: "Past_Experience_Govt_Contracts.pdf",
      pageNumber: 16,
      mandatory: true,
      reason: "Affidavit text meets standard GeM non-blacklisting clause requirements."
    },
    {
      id: "REQ-007",
      bidId: "GEM-2026-001",
      category: "Identity",
      requirement: "PAN Card of Company and Director identity verification",
      requiredValue: "Valid Company PAN + Aadhaar Director",
      detectedValue: "PAN: AABCA1234K (Verified)",
      status: "PASS",
      risk: "LOW",
      confidence: 99,
      sourceDoc: "GST_Registration_Certificate_2025-26.pdf",
      pageNumber: 2,
      mandatory: true,
      reason: "Company PAN active and verified against Income Tax department API records."
    },
    {
      id: "REQ-008",
      bidId: "GEM-2026-001",
      category: "Technical",
      requirement: "ISO 27001 Information Security Management System Certification",
      requiredValue: "Valid ISO 27001:2022 Certificate",
      detectedValue: "ISO 27001:2013 Expired 15-Jun-2026",
      status: "FAIL",
      risk: "HIGH",
      confidence: 95,
      sourceDoc: "Past_Experience_Govt_Contracts.pdf",
      pageNumber: 12,
      mandatory: true,
      reason: "Submitted ISO 27001 certification expired on 15 June 2026; no renewal receipt attached."
    }
  ]
};

export const mockEvidenceDetails: Record<string, EvidenceDetail> = {
  "REQ-001": {
    requirementId: "REQ-001",
    requirementTitle: "Minimum Average Annual Turnover of ₹10 Crore in past 3 financial years",
    sourceDocument: "Audited_Financial_Statements_FY23_FY25.pdf",
    pageNumber: 14,
    extractedSnippet: "\"Note 24: Revenue from Operations for Financial Year 2024-25 stands at ₹7,50,42,100 (Rupees Seven Crore Fifty Lakhs Forty Two Thousand One Hundred Only). Combined 3-year average turnover computed as ₹7.50 Crore per annum.\"",
    requiredValue: "₹10.00 Crore per annum (3-yr average)",
    detectedValue: "₹7.50 Crore per annum",
    decision: "FAIL",
    reason: "The extracted annual revenue from the official Independent Auditor's Report (Page 14, Note 24) confirms a 3-year average turnover of ₹7.50 Cr, failing the mandatory RFP qualification criterion of ₹10.00 Cr.",
    confidence: 94,
    verificationSource: "Independent Auditor Report - Note 24 on Revenue",
    contextBefore: "Company Financial Overview for FY 2024-25:\n- Paid-up Capital: ₹2.00 Crore\n- Reserves & Surplus: ₹3.10 Crore",
    contextAfter: "Auditor Opinion: The financial statements present a true and fair view subject to ongoing tax assessment disputes."
  },
  "REQ-005": {
    requirementId: "REQ-005",
    requirementTitle: "Annual GST Turnover filing matching audited balance sheet gross revenue",
    sourceDocument: "Audited_Financial_Statements_FY23_FY25.pdf",
    pageNumber: 22,
    extractedSnippet: "\"Gross turnover reported in Profit & Loss Account: ₹12,00,00,000. However, GSTR-3B filings sum to ₹8,70,00,000 for the corresponding financial period.\"",
    requiredValue: "₹12.00 Cr (Declared in Balance Sheet)",
    detectedValue: "₹8.70 Cr (GSTR-3B Filing Record)",
    decision: "CONFLICT",
    reason: "Severe data inconsistency detected between audited financial statements and government GSTR-3B tax return filings. Difference of ₹3.30 Crore requires officer manual review.",
    confidence: 91,
    verificationSource: "GSTR-3B Monthly Return Filing Summary (GSTN Portal API)",
    contextBefore: "Section C: Reconciliation of Revenue with Tax Authority Returns",
    contextAfter: "Tax Consultant Note: Difference attributed to unbilled revenue in Q4 currently under client reconciliation."
  }
};

export const mockRiskSummaries: Record<string, RiskCategorySummary[]> = {
  "GEM-2026-001": [
    {
      category: "Financial",
      riskLevel: "HIGH",
      score: 82,
      summary: "Shortfall in required turnover threshold & significant discrepancy between audited accounts and GST tax filings.",
      factors: [
        "Annual Turnover of ₹7.50 Cr is 25% below mandatory threshold of ₹10.00 Cr.",
        "₹3.30 Cr reconciliation gap between Audited P&L and GSTR-3B monthly filings."
      ]
    },
    {
      category: "Documentation",
      riskLevel: "HIGH",
      score: 78,
      summary: "Critical mandatory certificate corrupted / unreadable and ISO certification expired.",
      factors: [
        "OEM Authorization Form (MAF) file unreadable/corrupted upon parsing.",
        "ISO 27001 Security certification expired on 15 June 2026."
      ]
    },
    {
      category: "Experience",
      riskLevel: "MEDIUM",
      score: 55,
      summary: "Gap in client continuous experience completion certificates.",
      factors: [
        "Declared 5 years experience, but submitted work orders verify only 44 months of active execution."
      ]
    },
    {
      category: "Registration",
      riskLevel: "LOW",
      score: 12,
      summary: "GST registration verified active with no tax default flags.",
      factors: [
        "Active GSTIN verified directly via GSTN API registry."
      ]
    },
    {
      category: "Identity",
      riskLevel: "LOW",
      score: 10,
      summary: "Company PAN and director registration details verified.",
      factors: [
        "Company PAN and Director DIN records match MCA-21 database."
      ]
    }
  ]
};

export const mockConflicts: Record<string, ConflictItem[]> = {
  "GEM-2026-001": [
    {
      id: "CONF-001",
      bidId: "GEM-2026-001",
      requirementId: "REQ-005",
      title: "Annual Revenue vs GST Tax Return Discrepancy",
      requirement: "Annual turnover declared in financial statements must align with official GST tax filings.",
      submittedDocument: "Audited_Financial_Statements_FY23_FY25.pdf (Page 22)",
      submittedValue: "₹12.00 Crore Gross Revenue",
      verificationSource: "GSTN Official Portal API (GSTR-3B Filings)",
      verificationValue: "₹8.70 Crore Total Taxable Turnover",
      status: "HUMAN REVIEW REQUIRED",
      riskLevel: "HIGH",
      sources: [
        "Audited_Financial_Statements_FY23_FY25.pdf",
        "GSTN_Government_API_Filing_Summary.json"
      ],
      explanation: "A gap of ₹3.30 Crore (27.5%) exists between the bidder's self-submitted audited financial statement and verified monthly GSTR-3B returns filed on the GST portal."
    },
    {
      id: "CONF-002",
      bidId: "GEM-2026-001",
      requirementId: "REQ-003",
      title: "Experience Duration Calculation Inconsistency",
      requirement: "5 years continuous experience in Govt/PSU IT contracts.",
      submittedDocument: "Past_Experience_Govt_Contracts.pdf (Page 4)",
      submittedValue: "5 Years Declared Experience",
      verificationSource: "Client Completion Certificate Verification Log",
      verificationValue: "3 Years 8 Months Verified Active Period",
      status: "HUMAN REVIEW REQUIRED",
      riskLevel: "MEDIUM",
      sources: [
        "Past_Experience_Govt_Contracts.pdf",
        "NIC_Project_Completion_Database.csv"
      ],
      explanation: "Work orders span multiple non-contiguous contracts with an unverified gap of 16 months between project assignments."
    }
  ]
};

export const mockAuditTrail: Record<string, AuditEvent[]> = {
  "GEM-2026-001": [
    {
      id: "AUD-001",
      bidId: "GEM-2026-001",
      timestamp: "2026-08-26 10:15:02",
      user: "System / GeM Portal",
      userRole: "Automated Ingestion",
      action: "BID_CREATED",
      entity: "Bid Record GEM-2026-001",
      status: "SUCCESS",
      details: "Tender record initialized for RFP-8891 by bidder ABC Technologies Pvt Ltd."
    },
    {
      id: "AUD-002",
      bidId: "GEM-2026-001",
      timestamp: "2026-08-26 10:18:45",
      user: "System / OCR Engine",
      userRole: "RAG Pipeline",
      action: "TENDER_PARSED",
      entity: "GeM_Tender_Specification_RFP_8891.pdf",
      status: "SUCCESS",
      details: "Extracted 47 mandatory and technical evaluation requirements from tender document."
    },
    {
      id: "AUD-003",
      bidId: "GEM-2026-001",
      timestamp: "2026-08-26 10:30:12",
      user: "System / Document Validator",
      userRole: "Document Engine",
      action: "DOCUMENTS_PROCESSED",
      entity: "5 Bidder Files",
      status: "WARNING",
      details: "4 documents processed cleanly; 1 document (OEM Authorization) failed validation."
    },
    {
      id: "AUD-004",
      bidId: "GEM-2026-001",
      timestamp: "2026-08-26 10:31:00",
      user: "System / Compliance AI",
      userRole: "Verification Engine",
      action: "COMPLIANCE_ANALYSIS_COMPLETED",
      entity: "Compliance Evaluation Matrix",
      status: "ALERT",
      details: "Analysis finished: 31 PASS, 5 FAIL, 7 REVIEW, 1 MISSING, 3 CONFLICT. Overall compliance score: 78% (HIGH RISK)."
    },
    {
      id: "AUD-005",
      bidId: "GEM-2026-001",
      timestamp: "2026-08-26 11:20:15",
      user: "Rajesh V. Sharma",
      userRole: "Senior Procurement Officer",
      action: "OFFICER_REVIEW_OPENED",
      entity: "Human Review Panel",
      status: "INFO",
      details: "Officer initiated manual compliance audit and flagged REQ-001 turnover shortfall."
    }
  ]
};

export const mockOfficerReviewRecord: Record<string, OfficerReviewRecord> = {
  "GEM-2026-001": {
    bidId: "GEM-2026-001",
    officerName: "Rajesh V. Sharma",
    officerDesignation: "Senior Procurement Officer",
    recommendation: "MANUAL REVIEW REQUIRED — Bid exhibits high financial and documentation risks.",
    finalDecision: "UNDER_REVIEW",
    comment: "Bidder fails mandatory ₹10 Cr annual turnover criterion (actual ₹7.5 Cr) and submitted unreadable OEM authorization. Tax discrepancy of ₹3.30 Cr also pending clarification.",
    updatedAt: "2026-08-26 11:45 AM"
  }
};
