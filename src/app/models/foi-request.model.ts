import { Timestamp } from '@angular/fire/firestore';

export type FoiRequesterType = 'citizen' | 'media' | 'ngo' | 'government_agency' | 'academic';

export type FoiStatus =
  | 'submitted'
  | 'acknowledged'
  | 'processing'
  | 'ready_for_release'
  | 'released'
  | 'denied'
  | 'partially_released';

export interface FoiRequester {
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  type: FoiRequesterType;
}

export interface FoiRequest {
  requestId: string;

  requester: FoiRequester;
  purpose: string;
  specificDocumentIds: string[];
  searchQuery: string | null;

  status: FoiStatus;
  denialReason: string | null;
  denialGrounds: string | null;

  assignedOfficerId: string | null;
  exportUrl: string | null;
  exportStoragePath: string | null;
  exportGeneratedAt: Timestamp | null;
  exportExpiresAt: Timestamp | null;

  trackingNumber: string;

  submittedAt: Timestamp;
  acknowledgedAt: Timestamp | null;
  dueDateAt: Timestamp;
  releasedAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
