import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { FoiService } from '../../../services/foi.service';
import { FoiStatus } from '../../../models';

interface FoiStep {
  status: FoiStatus;
  label: string;
}

const FOI_STEPS: FoiStep[] = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'acknowledged', label: 'Acknowledged' },
  { status: 'processing', label: 'Processing' },
  { status: 'ready_for_release', label: 'Ready for Release' },
  { status: 'released', label: 'Released' },
];

@Component({
  selector: 'app-foi-detail',
  imports: [RouterLink],
  templateUrl: './foi-detail.html',
})
export class FoiDetailComponent {
  private route = inject(ActivatedRoute);
  private foiService = inject(FoiService);

  readonly request = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.foiService.getFoi$(p.get('id')!))),
    { initialValue: null },
  );

  readonly steps = FOI_STEPS;
  readonly advancing = signal(false);

  readonly currentStepIndex = computed(() => {
    const req = this.request();
    if (!req) return -1;
    return FOI_STEPS.findIndex((s) => s.status === req.status);
  });

  readonly nextAction = computed(() => {
    const req = this.request();
    if (!req) return null;
    const actions: Partial<Record<FoiStatus, { label: string; next: FoiStatus; style: string }>> = {
      submitted: { label: 'Acknowledge Request', next: 'acknowledged', style: 'blue' },
      acknowledged: { label: 'Start Processing', next: 'processing', style: 'blue' },
      processing: { label: 'Mark Ready for Release', next: 'ready_for_release', style: 'indigo' },
      ready_for_release: { label: 'Release Documents', next: 'released', style: 'green' },
    };
    return actions[req.status] ?? null;
  });

  async advance(): Promise<void> {
    const action = this.nextAction();
    if (!action) return;
    const req = this.request();
    if (!req) return;
    this.advancing.set(true);
    await this.foiService.updateStatus(req.requestId, action.next);
    this.advancing.set(false);
  }

  async deny(): Promise<void> {
    const req = this.request();
    if (!req) return;
    this.advancing.set(true);
    await this.foiService.updateStatus(req.requestId, 'denied', {
      denialReason: 'Request denied.',
    });
    this.advancing.set(false);
  }

  isOverdue(): boolean {
    const req = this.request();
    if (!req || !req.dueDateAt) return false;
    const d =
      (req.dueDateAt as { toDate?: () => Date }).toDate?.() ?? new Date(req.dueDateAt as never);
    return d < new Date() && !['released', 'denied', 'partially_released'].includes(req.status);
  }

  getBtnClass(style: string): string {
    const map: Record<string, string> = {
      blue: 'bg-blue-600 text-white hover:bg-blue-700',
      green: 'bg-green-600 text-white hover:bg-green-700',
      indigo: 'bg-indigo-600 text-white hover:bg-indigo-700',
    };
    return `px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${map[style] ?? map['blue']}`;
  }

  format(val: string): string {
    return (val ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  }
}
