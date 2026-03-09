import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DocumentService } from '../../services/document.service';
import { SessionService } from '../../services/session.service';
import { FoiService } from '../../services/foi.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {
  private docService = inject(DocumentService);
  private sessionService = inject(SessionService);
  private foiService = inject(FoiService);

  readonly documents = toSignal(this.docService.listDocuments$(), { initialValue: [] });
  readonly sessions = toSignal(this.sessionService.listSessions$(), { initialValue: [] });
  readonly foiRequests = toSignal(this.foiService.listFoi$(), { initialValue: [] });

  readonly totalDocuments = computed(() => this.documents().length);

  readonly pendingReview = computed(
    () =>
      this.documents().filter((d) =>
        [
          'for_committee_review',
          'committee_returned',
          'for_first_reading',
          'for_second_reading',
          'for_third_reading',
        ].includes(d.status),
      ).length,
  );

  readonly activeSessions = computed(
    () =>
      this.sessions().filter((s) => s.status === 'scheduled' || s.status === 'ongoing').length,
  );

  readonly openFoi = computed(
    () =>
      this.foiRequests().filter((f) =>
        ['submitted', 'acknowledged', 'processing'].includes(f.status),
      ).length,
  );

  readonly recentDocuments = computed(() => this.documents().slice(0, 5));

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      for_committee_review: 'bg-yellow-100 text-yellow-700',
      committee_returned: 'bg-orange-100 text-orange-700',
      for_first_reading: 'bg-blue-100 text-blue-700',
      for_second_reading: 'bg-indigo-100 text-indigo-700',
      for_third_reading: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      vetoed: 'bg-red-100 text-red-700',
      lapsed: 'bg-red-100 text-red-600',
      archived: 'bg-gray-100 text-gray-500',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const date = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
