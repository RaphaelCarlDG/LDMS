import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
  where,
  QueryConstraint,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { AuditLog, AuditAction } from '../models';

interface AuditLogPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  resourceTitle?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  action?: AuditAction;
  actorId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  /** Calls the writeAuditLog Cloud Function. Fire-and-forget. */
  logAction(
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    resourceTitle?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const fn = httpsCallable<AuditLogPayload, { success: boolean }>(
      this.functions,
      'writeAuditLog',
    );
    fn({ action, resourceType, resourceId, resourceTitle, metadata }).catch((err) => {
      console.warn('[AuditLog] writeAuditLog failed:', err);
    });
  }

  /** Returns the Firestore collection name for a given year and month (1-indexed). */
  shardName(year: number, month: number): string {
    const mm = String(month).padStart(2, '0');
    return `auditLogs_${year}_${mm}`;
  }

  /**
   * Returns a real-time stream of audit log entries for the given year/month shard.
   * Read-only — writes are handled exclusively by Cloud Functions.
   */
  getLogs$(
    year: number,
    month: number,
    filters: AuditLogFilters = {},
    limitCount = 200,
  ): Observable<AuditLog[]> {
    const shard = this.shardName(year, month);
    const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(limitCount)];

    if (filters.action) {
      constraints.push(where('action', '==', filters.action));
    }
    if (filters.actorId) {
      constraints.push(where('actorId', '==', filters.actorId));
    }

    const q = query(collection(this.firestore, shard), ...constraints);
    return collectionData(q, { idField: 'logId' }) as Observable<AuditLog[]>;
  }
}
