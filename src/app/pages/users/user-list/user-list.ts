import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../../../services/user.service';
import { UserRole, UserPermissions } from '../../../models';
import { FormsModule } from '@angular/forms';

const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: {
    canApproveDocuments: true,
    canPublishToWebsite: true,
    canManageRetention: true,
    canExportFOI: true,
    canViewAuditLogs: true,
    canManageUsers: true,
  },
  secretariat: {
    canApproveDocuments: true,
    canPublishToWebsite: false,
    canManageRetention: false,
    canExportFOI: true,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  council_member: {
    canApproveDocuments: true,
    canPublishToWebsite: false,
    canManageRetention: false,
    canExportFOI: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  committee_chair: {
    canApproveDocuments: true,
    canPublishToWebsite: false,
    canManageRetention: false,
    canExportFOI: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  foi_officer: {
    canApproveDocuments: false,
    canPublishToWebsite: false,
    canManageRetention: false,
    canExportFOI: true,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  inter_agency: {
    canApproveDocuments: false,
    canPublishToWebsite: false,
    canManageRetention: false,
    canExportFOI: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  viewer: {
    canApproveDocuments: false,
    canPublishToWebsite: false,
    canManageRetention: false,
    canExportFOI: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
};

@Component({
  selector: 'app-user-list',
  imports: [FormsModule],
  templateUrl: './user-list.html',
})
export class UserListComponent {
  private userService = inject(UserService);

  readonly users = toSignal(this.userService.listUsers$(), { initialValue: [] });
  readonly saving = signal<string | null>(null);

  readonly roleOptions: UserRole[] = [
    'super_admin',
    'secretariat',
    'council_member',
    'committee_chair',
    'foi_officer',
    'inter_agency',
    'viewer',
  ];

  readonly editingRoles = signal<Record<string, UserRole>>({});

  setRole(userId: string, role: UserRole): void {
    this.editingRoles.update((r) => ({ ...r, [userId]: role }));
  }

  getRole(userId: string, currentRole: UserRole): UserRole {
    return this.editingRoles()[userId] ?? currentRole;
  }

  async saveRole(userId: string, currentRole: UserRole): Promise<void> {
    const newRole = this.editingRoles()[userId] ?? currentRole;
    const permissions = ROLE_PERMISSIONS[newRole];
    this.saving.set(userId);
    await this.userService.updateRole(userId, newRole, permissions);
    this.saving.set(null);
    this.editingRoles.update((r) => {
      const copy = { ...r };
      delete copy[userId];
      return copy;
    });
  }

  async toggleActive(userId: string, isActive: boolean): Promise<void> {
    this.saving.set(userId);
    await this.userService.toggleActive(userId, !isActive);
    this.saving.set(null);
  }

  getRoleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      super_admin: 'bg-red-100 text-red-700',
      secretariat: 'bg-blue-100 text-blue-700',
      council_member: 'bg-indigo-100 text-indigo-700',
      committee_chair: 'bg-purple-100 text-purple-700',
      foi_officer: 'bg-yellow-100 text-yellow-700',
      inter_agency: 'bg-teal-100 text-teal-700',
      viewer: 'bg-gray-100 text-gray-600',
    };
    return map[role] ?? 'bg-gray-100 text-gray-600';
  }

  format(val: string): string {
    return (val ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
