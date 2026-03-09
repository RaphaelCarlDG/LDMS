import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { Vault, RetentionPolicy } from '../models';
import { AuditLogService } from './audit-log.service';

@Injectable({ providedIn: 'root' })
export class VaultService {
  private firestore = inject(Firestore);
  private auditLog = inject(AuditLogService);

  listVaultEntries$(): Observable<Vault[]> {
    const q = query(collection(this.firestore, 'vaults'), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'vaultId' }) as Observable<Vault[]>;
  }

  getVaultEntry$(id: string): Observable<Vault> {
    return docData(doc(this.firestore, 'vaults', id), {
      idField: 'vaultId',
    }) as Observable<Vault>;
  }

  listRetentionPolicies$(): Observable<RetentionPolicy[]> {
    const q = query(collection(this.firestore, 'retentionPolicies'), orderBy('name', 'asc'));
    return collectionData(q, { idField: 'policyId' }) as Observable<RetentionPolicy[]>;
  }

  getRetentionPolicy$(id: string): Observable<RetentionPolicy> {
    return docData(doc(this.firestore, 'retentionPolicies', id), {
      idField: 'policyId',
    }) as Observable<RetentionPolicy>;
  }

  async archiveDocument(
    docId: string,
    retentionPolicyId: string,
    managedById: string,
  ): Promise<string> {
    const policy = await firstValueFrom(this.getRetentionPolicy$(retentionPolicyId));
    const now = new Date();

    let retentionUntil: Timestamp | null = null;
    if (policy.durationYears !== null) {
      const until = new Date(now);
      until.setFullYear(until.getFullYear() + policy.durationYears);
      retentionUntil = Timestamp.fromDate(until);
    }

    const ref = await addDoc(collection(this.firestore, 'vaults'), {
      name: `Archived Document — ${now.getFullYear()}`,
      description: null,
      category: 'mixed',
      year: now.getFullYear(),
      batchNumber: 1,
      documentIds: [docId],
      retentionPolicyId,
      retentionClassification: policy.classification,
      retentionStartDate: serverTimestamp(),
      retentionUntil,
      backupBucketPath: '',
      lastBackupAt: null,
      backupChecksum: null,
      managedById,
      sealedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(this.firestore, 'documents', docId), {
      status: 'archived',
      vaultId: ref.id,
      retentionPolicyId,
      retentionUntil,
      retentionClassification: policy.classification,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.auditLog.logAction('document.archived', 'document', docId);
    return ref.id;
  }

  async createRetentionPolicy(data: Partial<RetentionPolicy>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'retentionPolicies'), {
      ...data,
      isActive: true,
      effectiveDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateRetentionPolicy(id: string, data: Partial<RetentionPolicy>): Promise<void> {
    await updateDoc(doc(this.firestore, 'retentionPolicies', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
}
