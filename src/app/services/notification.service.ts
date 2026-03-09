import { Injectable, inject, computed } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, switchMap, of, startWith } from 'rxjs';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Notification } from '../models/notification.model';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly firestore = inject(Firestore);
  private readonly userService = inject(UserService);

  private readonly notifications$: Observable<Notification[] | null> = toObservable(
    this.userService.currentUser,
  ).pipe(
    switchMap((user) => {
      if (!user?.userId) return of([] as Notification[]);
      const q = query(
        collection(this.firestore, 'notifications'),
        where('recipientId', '==', user.userId),
        orderBy('createdAt', 'desc'),
        limit(30),
      );
      return (collectionData(q, { idField: 'notificationId' }) as Observable<Notification[]>).pipe(
        startWith(null),
      );
    }),
  );

  /**
   * Real-time stream of the current user's last 30 notifications.
   * null = loading (user authenticated, awaiting first Firebase emission)
   * []   = loaded with no notifications
   * [...] = loaded with notifications
   */
  readonly notifications = toSignal(this.notifications$, {
    initialValue: null as Notification[] | null,
  });

  /** Count of unread notifications */
  readonly unreadCount = computed(
    () => (this.notifications() ?? []).filter((n) => !n.isRead).length,
  );

  /** Mark a single notification as read */
  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'notifications', notificationId), {
      isRead: true,
      readAt: serverTimestamp(),
    });
  }

  /** Batch-mark all currently unread notifications as read */
  async markAllAsRead(): Promise<void> {
    const unread = (this.notifications() ?? []).filter((n) => !n.isRead);
    if (!unread.length) return;
    const batch = writeBatch(this.firestore);
    unread.forEach((n) => {
      batch.update(doc(this.firestore, 'notifications', n.notificationId), {
        isRead: true,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}
