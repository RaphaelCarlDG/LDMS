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
import { Session, AgendaItem, VoteResult } from '../models';
import { AuditLogService } from './audit-log.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private firestore = inject(Firestore);
  private auditLog = inject(AuditLogService);

  listSessions$(): Observable<Session[]> {
    const q = query(collection(this.firestore, 'sessions'), orderBy('scheduledAt', 'desc'));
    return collectionData(q, { idField: 'sessionId' }) as Observable<Session[]>;
  }

  getSession$(id: string): Observable<Session> {
    return docData(doc(this.firestore, 'sessions', id), {
      idField: 'sessionId',
    }) as Observable<Session>;
  }

  async createSession(data: Partial<Session>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'sessions'), {
      ...data,
      status: 'scheduled',
      attendeeIds: [],
      quorumReached: false,
      isPublic: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    this.auditLog.logAction('session.created', 'session', ref.id, data.title);
    return ref.id;
  }

  async updateSession(id: string, data: Partial<Session>): Promise<void> {
    await updateDoc(doc(this.firestore, 'sessions', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    if (data.status === 'ongoing') {
      this.auditLog.logAction('session.started', 'session', id);
    } else if (data.status === 'completed' || data.status === 'adjourned') {
      this.auditLog.logAction('session.ended', 'session', id);
    }
  }

  listAgendaItems$(sessionId: string): Observable<AgendaItem[]> {
    const q = query(
      collection(this.firestore, 'sessions', sessionId, 'agendaItems'),
      orderBy('order', 'asc'),
    );
    return collectionData(q, { idField: 'itemId' }) as Observable<AgendaItem[]>;
  }

  async addAgendaItem(sessionId: string, item: Partial<AgendaItem>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'sessions', sessionId, 'agendaItems'), {
      ...item,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateAgendaItem(
    sessionId: string,
    itemId: string,
    data: Partial<AgendaItem>,
  ): Promise<void> {
    await updateDoc(doc(this.firestore, 'sessions', sessionId, 'agendaItems', itemId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async recordVote(sessionId: string, itemId: string, vote: VoteResult): Promise<void> {
    await updateDoc(doc(this.firestore, 'sessions', sessionId, 'agendaItems', itemId), {
      voteResult: vote,
      status: 'voted',
      updatedAt: serverTimestamp(),
    });
    this.auditLog.logAction('session.agenda_item_voted', 'session', sessionId);
  }
}
