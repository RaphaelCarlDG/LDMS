import { Component, inject, signal, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { AuditLogService } from '../../../services/audit-log.service';
import { AuditAction } from '../../../models';

const ALL_ACTIONS: AuditAction[] = [
  'document.created',
  'document.viewed',
  'document.downloaded',
  'document.edited',
  'document.status_changed',
  'document.referred',
  'document.approved',
  'document.archived',
  'document.deleted',
  'document.restored',
  'document.published',
  'session.created',
  'session.started',
  'session.agenda_item_voted',
  'session.ended',
  'foi.submitted',
  'foi.released',
  'foi.denied',
  'user.login',
  'user.login_failed',
  'user.logout',
  'user.role_changed',
  'user.deactivated',
  'vault.sealed',
  'retention.applied',
  'ai_job.triggered',
];

@Component({
  selector: 'app-audit-log-list',
  imports: [JsonPipe],
  templateUrl: './audit-log-list.html',
})
export class AuditLogListComponent {
  private auditLogService = inject(AuditLogService);

  readonly allActions = ALL_ACTIONS;

  private readonly now = new Date();
  readonly yearSig = signal(this.now.getFullYear());
  readonly monthSig = signal(this.now.getMonth() + 1); // 1-indexed
  readonly actionSig = signal<AuditAction | ''>('');

  private readonly filterState = computed(() => ({
    year: this.yearSig(),
    month: this.monthSig(),
    action: this.actionSig(),
  }));

  readonly logs = toSignal(
    toObservable(this.filterState).pipe(
      switchMap(({ year, month, action }) =>
        this.auditLogService.getLogs$(year, month, action ? { action: action as AuditAction } : {}),
      ),
    ),
    { initialValue: [] },
  );

  readonly monthLabel = computed(() => {
    const d = new Date(this.yearSig(), this.monthSig() - 1, 1);
    return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  });

  readonly isCurrentOrFutureMonth = computed(() => {
    const now = new Date();
    return (
      this.yearSig() > now.getFullYear() ||
      (this.yearSig() === now.getFullYear() && this.monthSig() >= now.getMonth() + 1)
    );
  });

  prevMonth(): void {
    let y = this.yearSig();
    let m = this.monthSig() - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.yearSig.set(y);
    this.monthSig.set(m);
  }

  nextMonth(): void {
    if (this.isCurrentOrFutureMonth()) return;
    let y = this.yearSig();
    let m = this.monthSig() + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.yearSig.set(y);
    this.monthSig.set(m);
  }

  setAction(val: string): void {
    this.actionSig.set(val as AuditAction | '');
  }

  formatTimestamp(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  actionBadge(action: AuditAction): string {
    if (action.startsWith('document.')) return 'bg-blue-100 text-blue-700';
    if (action.startsWith('session.')) return 'bg-green-100 text-green-700';
    if (action.startsWith('foi.')) return 'bg-orange-100 text-orange-700';
    if (action.startsWith('user.')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  }

  formatAction(action: string): string {
    return action.replace(/\./g, ' › ').replace(/_/g, ' ');
  }
}
