import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { authGuard } from './guards/auth.guard';
import { permissionGuard, roleGuard } from './guards/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'app', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    loadComponent: () => import('./pages/shell/shell').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/documents/document-list/document-list').then(
            (m) => m.DocumentListComponent,
          ),
      },
      {
        path: 'documents/new',
        canActivate: [roleGuard(['secretariat', 'council_member', 'super_admin'])],
        loadComponent: () =>
          import('./pages/documents/document-form/document-form').then(
            (m) => m.DocumentFormComponent,
          ),
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import('./pages/documents/document-detail/document-detail').then(
            (m) => m.DocumentDetailComponent,
          ),
      },
      {
        path: 'committees',
        loadComponent: () =>
          import('./pages/committees/committee-list/committee-list').then(
            (m) => m.CommitteeListComponent,
          ),
      },
      {
        path: 'committees/:id',
        loadComponent: () =>
          import('./pages/committees/committee-detail/committee-detail').then(
            (m) => m.CommitteeDetailComponent,
          ),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./pages/sessions/session-list/session-list').then((m) => m.SessionListComponent),
      },
      {
        path: 'sessions/new',
        canActivate: [roleGuard(['secretariat', 'super_admin'])],
        loadComponent: () =>
          import('./pages/sessions/session-form/session-form').then((m) => m.SessionFormComponent),
      },
      {
        path: 'sessions/:id',
        loadComponent: () =>
          import('./pages/sessions/session-detail/session-detail').then(
            (m) => m.SessionDetailComponent,
          ),
      },
      {
        path: 'foi',
        canActivate: [permissionGuard('canExportFOI')],
        loadComponent: () =>
          import('./pages/foi/foi-list/foi-list').then((m) => m.FoiListComponent),
      },
      {
        path: 'foi/new',
        canActivate: [permissionGuard('canExportFOI')],
        loadComponent: () =>
          import('./pages/foi/foi-form/foi-form').then((m) => m.FoiFormComponent),
      },
      {
        path: 'foi/:id',
        canActivate: [permissionGuard('canExportFOI')],
        loadComponent: () =>
          import('./pages/foi/foi-detail/foi-detail').then((m) => m.FoiDetailComponent),
      },
      {
        path: 'users',
        canActivate: [permissionGuard('canManageUsers')],
        loadComponent: () =>
          import('./pages/users/user-list/user-list').then((m) => m.UserListComponent),
      },
      {
        path: 'vault',
        canActivate: [permissionGuard('canManageRetention')],
        loadComponent: () =>
          import('./pages/vault/vault-list/vault-list').then((m) => m.VaultListComponent),
      },
      {
        path: 'vault/retention-policies',
        canActivate: [permissionGuard('canManageRetention')],
        loadComponent: () =>
          import('./pages/vault/retention-policies/retention-policies').then(
            (m) => m.RetentionPoliciesComponent,
          ),
      },
      {
        path: 'vault/:id',
        canActivate: [permissionGuard('canManageRetention')],
        loadComponent: () =>
          import('./pages/vault/vault-detail/vault-detail').then((m) => m.VaultDetailComponent),
      },
      {
        path: 'audit-logs',
        canActivate: [permissionGuard('canViewAuditLogs')],
        loadComponent: () =>
          import('./pages/audit-logs/audit-log-list/audit-log-list').then(
            (m) => m.AuditLogListComponent,
          ),
      },
    ],
  },
];
