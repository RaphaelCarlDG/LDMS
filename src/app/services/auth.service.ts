import { Injectable, signal, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';
import { UserPermissions } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private _isLoggedIn = signal(false);
  readonly isLoggedIn = this._isLoggedIn.asReadonly();

  // Prevents the onAuthStateChanged fallback from racing with register()
  private _isRegistering = false;

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      this._isLoggedIn.set(!!user);

      // Only run the fallback doc-creation on sign-IN, not during registration.
      // register() creates the doc with full data (name, etc.) itself.
      if (user && !this._isRegistering) {
        try {
          const userRef = doc(this.firestore, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const defaultPermissions: UserPermissions = {
              canApproveDocuments: false,
              canPublishToWebsite: false,
              canManageRetention: false,
              canExportFOI: false,
              canViewAuditLogs: false,
              canManageUsers: false,
            };
            await setDoc(userRef, {
              userId: user.uid,
              fullName: user.displayName ?? user.email ?? 'User',
              email: user.email ?? '',
              avatarUrl: null,
              phone: null,
              role: 'viewer',
              committeeIds: [],
              departmentId: null,
              permissions: defaultPermissions,
              isActive: true,
              isEmailVerified: user.emailVerified,
              mfaEnabled: false,
              _displayName: user.displayName ?? user.email ?? 'User',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
              deactivatedAt: null,
            });
          }
        } catch {
          // Firestore rules may not be deployed yet; silently ignore so the
          // app doesn't crash. The user will see permission errors on reads
          // until the rules are deployed.
        }
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(name: string, email: string, password: string): Promise<void> {
    this._isRegistering = true;
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      const defaultPermissions: UserPermissions = {
        canApproveDocuments: false,
        canPublishToWebsite: false,
        canManageRetention: false,
        canExportFOI: false,
        canViewAuditLogs: false,
        canManageUsers: false,
      };

      await setDoc(doc(this.firestore, 'users', credential.user.uid), {
        userId: credential.user.uid,
        fullName: name,
        email,
        avatarUrl: null,
        phone: null,
        role: 'viewer',
        committeeIds: [],
        departmentId: null,
        permissions: defaultPermissions,
        isActive: true,
        isEmailVerified: false,
        mfaEnabled: false,
        _displayName: name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null,
        deactivatedAt: null,
      });
    } finally {
      this._isRegistering = false;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
