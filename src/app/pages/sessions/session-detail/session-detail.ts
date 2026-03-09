import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { switchMap } from 'rxjs';
import { SessionService } from '../../../services/session.service';
import { DocumentService } from '../../../services/document.service';
import { UserService } from '../../../services/user.service';
import { VoteOutcome } from '../../../models';

@Component({
  selector: 'app-session-detail',
  imports: [RouterLink, ReactiveFormsModule, SlicePipe],
  templateUrl: './session-detail.html',
})
export class SessionDetailComponent {
  private route = inject(ActivatedRoute);
  private sessionService = inject(SessionService);
  private docService = inject(DocumentService);
  private fb = inject(FormBuilder);
  readonly userService = inject(UserService);

  readonly session = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.sessionService.getSession$(p.get('id')!))),
    { initialValue: null },
  );

  readonly agendaItems = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.sessionService.listAgendaItems$(p.get('id')!))),
    { initialValue: [] },
  );

  readonly allDocuments = toSignal(this.docService.listDocuments$(), { initialValue: [] });

  readonly showAgendaForm = signal(false);
  readonly votingItemId = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly agendaForm = this.fb.group({
    documentId: ['', Validators.required],
    presenter: [''],
    type: ['first_reading', Validators.required],
  });

  readonly voteForm = this.fb.group({
    inFavor: [0, [Validators.required, Validators.min(0)]],
    against: [0, [Validators.required, Validators.min(0)]],
    abstain: [0, [Validators.required, Validators.min(0)]],
  });

  readonly sessionId = computed(
    () => this.session()?.sessionId ?? this.route.snapshot.paramMap.get('id')!,
  );

  async updateStatus(status: 'ongoing' | 'completed' | 'adjourned' | 'cancelled'): Promise<void> {
    const s = this.session();
    if (!s) return;
    await this.sessionService.updateSession(s.sessionId, { status });
  }

  async addAgendaItem(): Promise<void> {
    if (this.agendaForm.invalid) {
      this.agendaForm.markAllAsTouched();
      return;
    }
    const sId = this.sessionId();
    const val = this.agendaForm.value;
    const doc = this.allDocuments().find((d) => d.documentId === val.documentId);
    this.submitting.set(true);
    await this.sessionService.addAgendaItem(sId, {
      documentId: val.documentId!,
      documentTitle: doc?.title ?? val.documentId!,
      documentType: doc?.type ?? 'draft',
      presenterId: '',
      presenterName: val.presenter ?? '',
      committeeId: null,
      notes: null,
      type: val.type as never,
      order: this.agendaItems().length + 1,
    });
    this.agendaForm.reset({ type: 'first_reading' });
    this.showAgendaForm.set(false);
    this.submitting.set(false);
  }

  async recordVote(itemId: string): Promise<void> {
    const val = this.voteForm.value;
    const inFavor = val.inFavor ?? 0;
    const against = val.against ?? 0;
    const abstain = val.abstain ?? 0;
    const outcome: VoteOutcome =
      inFavor > against ? 'passed' : inFavor < against ? 'failed' : 'deferred';
    await this.sessionService.recordVote(this.sessionId(), itemId, {
      inFavor,
      against,
      abstain,
      outcome,
    });
    this.votingItemId.set(null);
    this.voteForm.reset({ inFavor: 0, against: 0, abstain: 0 });
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      discussed: 'bg-blue-100 text-blue-700',
      voted: 'bg-green-100 text-green-700',
      deferred: 'bg-orange-100 text-orange-700',
      withdrawn: 'bg-red-100 text-red-600',
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
