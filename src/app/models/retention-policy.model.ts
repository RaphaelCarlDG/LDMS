import { Timestamp } from '@angular/fire/firestore';
import { RetentionClassification } from './document.model';

export type DisposalMethod =
  | 'permanent_deletion'
  | 'transfer_to_national_archives'
  | 'review_and_decide';

export interface RetentionPolicy {
  policyId: string;
  name: string;
  description: string;
  legalBasis: string;
  applicableTo: string[];

  durationYears: number | null;
  classification: RetentionClassification;

  requiresReview: boolean;
  reviewIntervalYears: number | null;
  disposalMethod: DisposalMethod | null;

  isActive: boolean;
  effectiveDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
