import { Timestamp } from '@angular/fire/firestore';
import { RetentionClassification } from './document.model';

export type VaultCategory =
  | 'approved_ordinances'
  | 'resolutions'
  | 'committee_reports'
  | 'session_minutes'
  | 'mixed';

export interface Vault {
  vaultId: string;
  name: string;
  description: string | null;

  category: VaultCategory;
  year: number;
  batchNumber: number;

  documentIds: string[];

  retentionPolicyId: string;
  retentionClassification: RetentionClassification;
  retentionStartDate: Timestamp;
  retentionUntil: Timestamp | null;

  backupBucketPath: string;
  lastBackupAt: Timestamp | null;
  backupChecksum: string | null;

  managedById: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Once sealed, no documents can be added or removed */
  sealedAt: Timestamp | null;
}
