import { Timestamp } from '@angular/fire/firestore';

export type UserRole =
  | 'super_admin'
  | 'secretariat'
  | 'council_member'
  | 'committee_chair'
  | 'viewer'
  | 'inter_agency'
  | 'foi_officer';

export interface UserPermissions {
  canApproveDocuments: boolean;
  canPublishToWebsite: boolean;
  canManageRetention: boolean;
  canExportFOI: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
}

export interface User {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;

  role: UserRole;
  committeeIds: string[];
  departmentId: string | null;
  permissions: UserPermissions;

  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;

  /** Cached display name for annotation/log rendering — updated by Cloud Function */
  _displayName: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
  deactivatedAt: Timestamp | null;
}
