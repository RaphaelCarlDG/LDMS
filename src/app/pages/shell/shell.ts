import { Component, inject, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly userService = inject(UserService);
  readonly notificationService = inject(NotificationService);

  readonly showNotifications = signal(false);

  private readonly allNavLinks = [
    {
      path: '/app/dashboard',
      label: 'Dashboard',
      icon: 'grid',
      permission: null as
        | null
        | 'canManageUsers'
        | 'canExportFOI'
        | 'canManageRetention'
        | 'canViewAuditLogs',
    },
    { path: '/app/documents', label: 'Documents', icon: 'file-text', permission: null },
    { path: '/app/committees', label: 'Committees', icon: 'users', permission: null },
    { path: '/app/sessions', label: 'Sessions', icon: 'calendar', permission: null },
    { path: '/app/foi', label: 'FOI Requests', icon: 'inbox', permission: 'canExportFOI' as const },
    {
      path: '/app/vault',
      label: 'Vault',
      icon: 'archive',
      permission: 'canManageRetention' as const,
    },
    { path: '/app/users', label: 'Users', icon: 'user-cog', permission: 'canManageUsers' as const },
    {
      path: '/app/audit-logs',
      label: 'Audit Log',
      icon: 'shield-check',
      permission: 'canViewAuditLogs' as const,
    },
  ];

  readonly navLinks = computed(() => {
    const user = this.userService.currentUser();
    return this.allNavLinks.filter((link) => {
      if (!link.permission) return true;
      return user?.permissions?.[link.permission] ?? false;
    });
  });

  toggleNotifications(): void {
    this.showNotifications.update((v) => !v);
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      void this.notificationService.markAsRead(notification.notificationId);
    }
    this.closeNotifications();
    const { entityType, entityId } = notification;
    switch (entityType) {
      case 'document':
      case 'referral':
        void this.router.navigate(['/app/documents', entityId]);
        break;
      case 'session':
        void this.router.navigate(['/app/sessions', entityId]);
        break;
      case 'foi_request':
        void this.router.navigate(['/app/foi', entityId]);
        break;
    }
  }

  /**
   * Converts a Firebase Timestamp to a human-readable relative time string.
   * - "just now" for < 1 minute
   * - "X minutes ago" for < 1 hour
   * - "X hours ago" for < 24 hours
   * - "X days ago" for >= 24 hours
   */
  timeAgo(timestamp: Timestamp | null): string {
    if (!timestamp) return '';
    const now = Date.now();
    const then = timestamp.toMillis();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  logout(): void {
    this.authService.logout().then(() => this.router.navigate(['/login']));
  }
}
