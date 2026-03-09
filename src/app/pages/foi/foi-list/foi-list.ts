import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FoiService } from '../../../services/foi.service';

@Component({
  selector: 'app-foi-list',
  imports: [RouterLink],
  templateUrl: './foi-list.html',
})
export class FoiListComponent {
  private foiService = inject(FoiService);
  readonly requests = toSignal(this.foiService.listFoi$(), { initialValue: [] });

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      submitted: 'bg-gray-100 text-gray-600',
      acknowledged: 'bg-blue-100 text-blue-700',
      processing: 'bg-yellow-100 text-yellow-700',
      ready_for_release: 'bg-indigo-100 text-indigo-700',
      released: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      partially_released: 'bg-orange-100 text-orange-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  isOverdue(dueDateAt: unknown): boolean {
    if (!dueDateAt) return false;
    const d = (dueDateAt as { toDate?: () => Date }).toDate?.() ?? new Date(dueDateAt as string);
    return d < new Date();
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
