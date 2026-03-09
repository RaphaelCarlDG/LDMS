import { Timestamp } from '@angular/fire/firestore';

export type NotificationType =
  | 'referral_received'
  | 'document_approved'
  | 'session_scheduled'
  | 'foi_status_update'
  | 'annotation_reply'
  | 'retention_due'
  | 'system_alert';

export type NotificationEntityType = 'document' | 'session' | 'foi_request' | 'referral';

export interface Notification {
  notificationId: string;
  recipientId: string;

  type: NotificationType;
  title: string;
  body: string;

  entityType: NotificationEntityType;
  entityId: string;

  isRead: boolean;
  readAt: Timestamp | null;

  createdAt: Timestamp;
}
