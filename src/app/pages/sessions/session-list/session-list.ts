import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SessionService } from '../../../services/session.service';
import { CommitteeService } from '../../../services/committee.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-session-list',
  imports: [RouterLink],
  templateUrl: './session-list.html',
})
export class SessionListComponent {
  private sessionService = inject(SessionService);
  private committeeService = inject(CommitteeService);
  readonly userService = inject(UserService);

  readonly sessions = toSignal(this.sessionService.listSessions$(), { initialValue: [] });
  readonly committees = toSignal(this.committeeService.listCommittees$(), { initialValue: [] });

  committeeName(id: string | null | undefined): string {
    if (!id) return '—';
    return this.committees().find((c) => c.committeeId === id)?.name ?? id;
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-700',
      adjourned: 'bg-orange-100 text-orange-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  format(val: string): string {
    return (val ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
