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
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FoiRequest, FoiStatus } from '../models';
import { AuditLogService } from './audit-log.service';

@Injectable({ providedIn: 'root' })
export class FoiService {
  private firestore = inject(Firestore);
  private auditLog = inject(AuditLogService);

  listFoi$(): Observable<FoiRequest[]> {
    const q = query(collection(this.firestore, 'foiRequests'), orderBy('submittedAt', 'desc'));
    return collectionData(q, { idField: 'requestId' }) as Observable<FoiRequest[]>;
  }

  getFoi$(id: string): Observable<FoiRequest> {
    return docData(doc(this.firestore, 'foiRequests', id), {
      idField: 'requestId',
    }) as Observable<FoiRequest>;
  }

  async submitFoi(data: Partial<FoiRequest>): Promise<string> {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `FOI-${year}-${rand}`;

    // Due date: 15 working days ≈ 21 calendar days
    const dueDateAt = new Date();
    dueDateAt.setDate(dueDateAt.getDate() + 21);

    const ref = await addDoc(collection(this.firestore, 'foiRequests'), {
      ...data,
      trackingNumber,
      status: 'submitted' as FoiStatus,
      assignedOfficerId: null,
      exportUrl: null,
      exportStoragePath: null,
      exportGeneratedAt: null,
      exportExpiresAt: null,
      denialReason: null,
      denialGrounds: null,
      acknowledgedAt: null,
      releasedAt: null,
      dueDateAt,
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    this.auditLog.logAction('foi.submitted', 'foi', ref.id);
    return ref.id;
  }

  async updateStatus(
    id: string,
    status: FoiStatus,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await updateDoc(doc(this.firestore, 'foiRequests', id), {
      status,
      ...(extra ?? {}),
      updatedAt: serverTimestamp(),
    });
    if (status === 'released') {
      this.auditLog.logAction('foi.released', 'foi', id);
    } else if (status === 'denied') {
      this.auditLog.logAction('foi.denied', 'foi', id);
    }
  }

  async assignOfficer(id: string, officerId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'foiRequests', id), {
      assignedOfficerId: officerId,
      updatedAt: serverTimestamp(),
    });
  }
}
