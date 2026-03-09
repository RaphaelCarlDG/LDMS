import { Timestamp } from '@angular/fire/firestore';

export interface Committee {
  committeeId: string;
  name: string;
  shortCode: string;
  description: string | null;
  thematicTags: string[];

  chairpersonId: string;
  chairpersonName: string;
  viceChairId: string | null;

  isActive: boolean;
  termStart: Timestamp;
  termEnd: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Subcollection: members ────────────────────────────────────────────────────

export type CommitteeMemberRole = 'chair' | 'vice_chair' | 'member';

export interface CommitteeMember {
  userId: string;
  displayName: string;
  role: CommitteeMemberRole;
  joinedAt: Timestamp;
  isActive: boolean;
}
