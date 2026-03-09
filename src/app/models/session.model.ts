import { Timestamp } from '@angular/fire/firestore';

export type SessionType = 'regular' | 'special' | 'emergency' | 'committee';
export type SessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'adjourned';
export type VenueType = 'in_person' | 'virtual' | 'hybrid';

export interface Session {
  sessionId: string;
  title: string;
  type: SessionType;

  committeeId: string | null;
  scheduledAt: Timestamp;
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;

  venueType: VenueType;
  meetingUrl: string | null;

  status: SessionStatus;

  preparedById: string;
  presidingOfficerId: string;
  presidingOfficerName: string;

  attendeeIds: string[];
  quorumReached: boolean;

  minutesDocumentId: string | null;
  isPublic: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Subcollection: agendaItems ────────────────────────────────────────────────

export type AgendaItemType =
  | 'first_reading'
  | 'second_reading'
  | 'third_reading'
  | 'committee_report'
  | 'motion'
  | 'interpellation'
  | 'announcement'
  | 'other';

export type AgendaItemStatus = 'pending' | 'discussed' | 'voted' | 'deferred' | 'withdrawn';

export type VoteOutcome = 'passed' | 'failed' | 'deferred' | null;

export interface VoteResult {
  inFavor: number;
  against: number;
  abstain: number;
  outcome: VoteOutcome;
}

export interface AgendaItem {
  itemId: string;
  order: number;

  documentId: string;
  documentTitle: string;
  documentType: string;

  presenterId: string;
  presenterName: string;
  committeeId: string | null;

  type: AgendaItemType;
  notes: string | null;

  status: AgendaItemStatus;
  voteResult: VoteResult | null;

  discussedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
