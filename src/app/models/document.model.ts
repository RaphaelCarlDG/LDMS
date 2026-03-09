import { Timestamp } from '@angular/fire/firestore';

export type DocumentType =
  | 'ordinance'
  | 'resolution'
  | 'communication'
  | 'motion'
  | 'committee_report'
  | 'draft';

export type DocumentCategory =
  | 'governance'
  | 'health'
  | 'finance'
  | 'infrastructure'
  | 'education'
  | 'social_welfare'
  | 'environment'
  | 'other';

export type DocumentStatus =
  | 'draft'
  | 'for_committee_review'
  | 'committee_returned'
  | 'for_first_reading'
  | 'for_second_reading'
  | 'for_third_reading'
  | 'approved'
  | 'vetoed'
  | 'lapsed'
  | 'archived';

export type UrgencyFlag = 'routine' | 'urgent' | 'emergency';

export type RetentionClassification = 'permanent' | 'long_term' | 'medium_term' | 'short_term';

export interface LdmsDocument {
  documentId: string;
  legacyId: string | null;
  barcodeId: string;
  qrCode: string;

  type: DocumentType;
  category: DocumentCategory;
  status: DocumentStatus;
  urgencyFlag: UrgencyFlag;

  title: string;
  abstract: string | null;
  body: string | null;

  fileUrl: string;
  fileStoragePath: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  checksum: string;
  source: 'digital' | 'scanned';

  aiProcessed: boolean;
  aiJobId: string | null;
  aiTags: string[];
  aiKeywords: string[];
  aiSummary: string | null;
  aiConfidenceScore: number | null;
  relatedDocumentIds: string[];

  authorId: string;
  authorName: string;
  createdBySecretariatId: string | null;

  committeeId: string | null;
  vaultId: string | null;

  isPublished: boolean;
  publishedUrl: string | null;
  publishedAt: Timestamp | null;

  retentionPolicyId: string;
  retentionUntil: Timestamp | null;
  retentionClassification: RetentionClassification;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt: Timestamp | null;
  approvedAt: Timestamp | null;
  archivedAt: Timestamp | null;

  isDeleted: boolean;
  deletedAt: Timestamp | null;
  deletedById: string | null;

  currentVersion: number;
  /** Lowercase keyword tokens for client-side search fallback */
  _searchTokens: string[];
}

// ── Subcollection: versions ───────────────────────────────────────────────────

export interface DocumentFieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

export interface DocumentVersion {
  versionId: string;
  versionNumber: number;
  editedById: string;
  editedByName: string;

  diff: DocumentFieldDiff[];

  fileUrl: string | null;
  fileStoragePath: string | null;
  checksum: string | null;

  changeReason: string | null;
  createdAt: Timestamp;
}

// ── Subcollection: annotations ────────────────────────────────────────────────

export type AnnotationType = 'comment' | 'highlight' | 'flag' | 'question' | 'objection';

export type AnnotationScope = 'private' | 'committee' | 'public';

export interface AnnotationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  annotationId: string;
  authorId: string;
  authorName: string;

  pageNumber: number;
  position: AnnotationPosition | null;
  highlightedText: string | null;
  content: string;

  type: AnnotationType;
  scope: AnnotationScope;

  sessionId: string | null;
  isResolved: boolean;
  resolvedById: string | null;
  resolvedAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Subcollection: referrals ──────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'acknowledged' | 'under_review' | 'completed' | 'returned';

export interface Referral {
  referralId: string;

  fromUserId: string;
  fromUserName: string;
  toCommitteeId: string;
  toCommitteeName: string;

  status: ReferralStatus;
  priority: 'normal' | 'urgent';
  instructions: string | null;
  returnRemarks: string | null;

  dueDate: Timestamp | null;
  acknowledgedAt: Timestamp | null;
  completedAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
