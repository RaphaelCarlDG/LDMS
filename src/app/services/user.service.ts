import { Injectable, inject, computed } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from '@angular/fire/firestore';
import { switchMap, of, Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { User, UserRole, UserPermissions } from '../models';
import { AuditLogService } from './audit-log.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private auditLog = inject(AuditLogService);

  readonly currentUser$: Observable<User | null> = authState(this.auth).pipe(
    switchMap((authUser) => {
      if (!authUser) return of(null);
      return docData(doc(this.firestore, 'users', authUser.uid), {
        idField: 'userId',
      }) as Observable<User>;
    }),
  );

  readonly currentUser = toSignal(this.currentUser$, { initialValue: null });

  // ── Permission signals (mirrors Firestore rules) ─────────────────────────

  readonly canCreateDocument = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'secretariat' || role === 'council_member' || role === 'super_admin';
  });

  readonly canCreateSession = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'secretariat' || role === 'super_admin';
  });

  readonly canUpdateSession = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'secretariat' || role === 'super_admin' || role === 'committee_chair';
  });

  readonly canCreateCommittee = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'secretariat' || role === 'super_admin';
  });

  readonly canUpdateCommittee = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'secretariat' || role === 'super_admin' || role === 'committee_chair';
  });

  readonly canCreateReferral = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'secretariat' || role === 'super_admin';
  });

  readonly canManageUsers = computed(
    () => this.currentUser()?.permissions?.canManageUsers ?? false,
  );

  readonly canExportFOI = computed(() => this.currentUser()?.permissions?.canExportFOI ?? false);

  listUsers$(): Observable<User[]> {
    return collectionData(collection(this.firestore, 'users'), {
      idField: 'userId',
    }) as Observable<User[]>;
  }

  async updateRole(uid: string, role: UserRole, permissions: UserPermissions): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), {
      role,
      permissions,
      updatedAt: serverTimestamp(),
    });
    this.auditLog.logAction('user.role_changed', 'user', uid, undefined, { newValue: role });
  }

  async toggleActive(uid: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), {
      isActive,
      deactivatedAt: isActive ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (!isActive) {
      this.auditLog.logAction('user.deactivated', 'user', uid);
    }
  }

  async addCommitteeId(userId: string, committeeId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', userId), {
      committeeIds: arrayUnion(committeeId),
      updatedAt: serverTimestamp(),
    });
  }

  async removeCommitteeId(userId: string, committeeId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', userId), {
      committeeIds: arrayRemove(committeeId),
      updatedAt: serverTimestamp(),
    });
  }
}
