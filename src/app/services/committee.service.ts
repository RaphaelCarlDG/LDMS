import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Committee, CommitteeMember } from '../models';

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  private firestore = inject(Firestore);

  listCommittees$(): Observable<Committee[]> {
    return collectionData(collection(this.firestore, 'committees'), {
      idField: 'committeeId',
    }) as Observable<Committee[]>;
  }

  getCommittee$(id: string): Observable<Committee> {
    return docData(doc(this.firestore, 'committees', id), {
      idField: 'committeeId',
    }) as Observable<Committee>;
  }

  async createCommittee(data: Partial<Committee>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'committees'), {
      ...data,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateCommittee(id: string, data: Partial<Committee>): Promise<void> {
    await updateDoc(doc(this.firestore, 'committees', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  listMembers$(committeeId: string): Observable<CommitteeMember[]> {
    return collectionData(collection(this.firestore, 'committees', committeeId, 'members'), {
      idField: 'userId',
    }) as Observable<CommitteeMember[]>;
  }

  async addMember(committeeId: string, member: Partial<CommitteeMember>): Promise<void> {
    const userId = member.userId!;
    await setDoc(doc(this.firestore, 'committees', committeeId, 'members', userId), {
      ...member,
      joinedAt: serverTimestamp(),
      isActive: true,
    });
  }

  async deactivateMember(committeeId: string, userId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'committees', committeeId, 'members', userId), {
      isActive: false,
    });
  }
}
