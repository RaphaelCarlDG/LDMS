import { Timestamp } from '@angular/fire/firestore';

export type AuditAction =
  // Document actions
  | 'document.created'
  | 'document.viewed'
  | 'document.downloaded'
  | 'document.edited'
  | 'document.status_changed'
  | 'document.referred'
  | 'document.approved'
  | 'document.archived'
  | 'document.deleted'
  | 'document.restored'
  | 'document.published'
  // Session actions
  | 'session.created'
  | 'session.started'
  | 'session.agenda_item_voted'
  | 'session.ended'
  // FOI actions
  | 'foi.submitted'
  | 'foi.released'
  | 'foi.denied'
  // User actions
  | 'user.login'
  | 'user.login_failed'
  | 'user.logout'
  | 'user.role_changed'
  | 'user.deactivated'
  // Admin actions
  | 'vault.sealed'
  | 'retention.applied'
  | 'ai_job.triggered';

export interface AuditLogMetadata {
  previousValue?: unknown;
  newValue?: unknown;
  [key: string]: unknown;
}

export interface AuditLog {
  logId: string;

  actorId: string;
  actorName: string;
  actorRole: string;
  actorIp: string;
  actorDevice: string;
  sessionToken: string;

  action: AuditAction;

  entityType: string;
  entityId: string;

  metadata: AuditLogMetadata;

  /** Security rules enforce no updates or deletes on this collection */
  _immutable: true;

  timestamp: Timestamp;
}
