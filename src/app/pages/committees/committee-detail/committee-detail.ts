import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap, combineLatest, of, map } from 'rxjs';
import { serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { CommitteeService } from '../../../services/committee.service';
import { DocumentService } from '../../../services/document.service';
import { UserService } from '../../../services/user.service';
import { Referral } from '../../../models';

export interface CommitteeReferralItem {
  docId: string;
  docTitle: string;
  referral: Referral;
}

@Component({
  selector: 'app-committee-detail',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './committee-detail.html',
})
export class CommitteeDetailComponent {
  private route = inject(ActivatedRoute);
  private committeeService = inject(CommitteeService);
  private docService = inject(DocumentService);
  private fb = inject(FormBuilder);
  readonly userService = inject(UserService);

  readonly committee = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.committeeService.getCommittee$(p.get('id')!))),
    { initialValue: null },
  );

  readonly members = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.committeeService.listMembers$(p.get('id')!))),
    { initialValue: [] },
  );

  readonly allDocuments = toSignal(this.docService.listDocuments$(), { initialValue: [] });
  readonly allUsers = toSignal(this.userService.listUsers$(), { initialValue: [] });

  readonly committeeDocuments = () => {
    const c = this.committee();
    if (!c) return [];
    return this.allDocuments().filter((d) => d.committeeId === c.committeeId);
  };

  // Load referrals across all documents referred to this committee
  readonly committeeReferralItems = toSignal(
    this.route.paramMap.pipe(
      switchMap((p) => {
        const committeeId = p.get('id')!;
        return this.docService.listDocuments$().pipe(
          switchMap((docs) => {
            const committeeDocs = docs
              .filter((d) => d.committeeId === committeeId)
              .map((d) => ({ docId: d.documentId, docTitle: d.title }));
            if (committeeDocs.length === 0) {
              return of([] as CommitteeReferralItem[]);
            }
            return combineLatest(
              committeeDocs.map(({ docId, docTitle }) =>
                this.docService
                  .listReferrals$(docId)
                  .pipe(
                    map((referrals) =>
                      referrals.map(
                        (referral) => ({ docId, docTitle, referral }) as CommitteeReferralItem,
                      ),
                    ),
                  ),
              ),
            ).pipe(map((groups) => groups.flat()));
          }),
        );
      }),
    ),
    { initialValue: [] as CommitteeReferralItem[] },
  );

  // ── Tab + form visibility ─────────────────────────────────────────────────

  readonly activeTab = signal<'overview' | 'referrals'>('overview');
  readonly showMemberForm = signal(false);
  readonly submitting = signal(false);
  readonly referralActionSubmitting = signal(false);
  readonly returningItem = signal<CommitteeReferralItem | null>(null);
  readonly returnRemarksInput = signal('');

  // ── Gap #3 — Member deactivation ─────────────────────────────────────────

  readonly deactivatingMemberId = signal<string | null>(null);
  readonly showInactiveMembers = signal(false);
  readonly activeMembers = computed(() => this.members().filter((m) => m.isActive !== false));
  readonly displayedMembers = computed(() =>
    this.showInactiveMembers() ? this.members() : this.activeMembers(),
  );

  // Confirmation state for member removal
  readonly confirmingRemoveMemberId = signal<string | null>(null);
  readonly confirmingRemoveMemberName = signal<string>('');

  // ── Gap #4 — Edit committee info ─────────────────────────────────────────

  readonly showEditForm = signal(false);
  readonly editSubmitting = signal(false);

  readonly editForm = this.fb.group({
    name: ['', Validators.required],
    shortCode: ['', Validators.required],
    description: [''],
    thematicTags: [''],
    termStart: [''],
    termEnd: [''],
  });

  // ── Gap #5 — Deactivate committee ────────────────────────────────────────

  readonly toggling = signal(false);
  readonly confirmingDeactivate = signal(false);

  // ── Gap #9 — Statistics ──────────────────────────────────────────────────

  readonly activeMemberCount = computed(() => this.activeMembers().length);
  readonly pendingReferralCount = computed(
    () => this.committeeReferralItems().filter((i) => i.referral.status === 'pending').length,
  );

  // ── Permissions ───────────────────────────────────────────────────────────

  readonly canActOnReferrals = computed(() => {
    const role = this.userService.currentUser()?.role;
    return role === 'committee_chair' || role === 'super_admin' || role === 'secretariat';
  });

  // ── Member form ───────────────────────────────────────────────────────────

  readonly memberForm = this.fb.group({
    userId: ['', Validators.required],
    displayName: ['', Validators.required],
    role: ['member', Validators.required],
  });

  onUserSelect(event: Event): void {
    const userId = (event.target as HTMLSelectElement).value;
    const user = this.allUsers().find((u) => u.userId === userId);
    if (user) {
      this.memberForm.patchValue({ userId: user.userId, displayName: user.fullName });
    }
  }

  async addMember(): Promise<void> {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }
    const c = this.committee();
    if (!c) return;
    this.submitting.set(true);
    const val = this.memberForm.value;
    await this.committeeService.addMember(c.committeeId, {
      userId: val.userId!,
      displayName: val.displayName!,
      role: val.role as 'chair' | 'vice_chair' | 'member',
    });
    if (val.role === 'chair') {
      await this.committeeService.updateCommittee(c.committeeId, {
        chairpersonId: val.userId!,
        chairpersonName: val.displayName!,
      });
    } else if (val.role === 'vice_chair') {
      await this.committeeService.updateCommittee(c.committeeId, {
        viceChairId: val.userId!,
      });
    }
    // Always update the user's committeeIds array for Firestore rule scoping
    await this.userService.addCommitteeId(val.userId!, c.committeeId);
    this.memberForm.reset({ role: 'member' });
    this.showMemberForm.set(false);
    this.submitting.set(false);
  }

  // ── Gap #3 handler ────────────────────────────────────────────────────────

  requestDeactivateMember(userId: string, displayName: string): void {
    this.confirmingRemoveMemberId.set(userId);
    this.confirmingRemoveMemberName.set(displayName);
  }

  async deactivateMember(userId: string): Promise<void> {
    const c = this.committee();
    if (!c) return;
    this.deactivatingMemberId.set(userId);
    await this.committeeService.deactivateMember(c.committeeId, userId);
    // Bug 1 fix: clear denormalized chair fields if this was the chair or vice-chair
    if (c.chairpersonId === userId) {
      await this.committeeService.updateCommittee(c.committeeId, {
        chairpersonId: undefined,
        chairpersonName: undefined,
      });
    } else if (c.viceChairId === userId) {
      await this.committeeService.updateCommittee(c.committeeId, {
        viceChairId: null,
      });
    }
    // Bug 2 fix: remove committeeId from user's committeeIds array
    await this.userService.removeCommitteeId(userId, c.committeeId);
    this.confirmingRemoveMemberId.set(null);
    this.deactivatingMemberId.set(null);
  }

  // ── Gap #4 handlers ───────────────────────────────────────────────────────

  openEditForm(): void {
    const c = this.committee();
    if (!c) return;
    const toDateStr = (ts: unknown): string => {
      if (!ts) return '';
      const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
      return d.toISOString().split('T')[0];
    };
    this.editForm.patchValue({
      name: c.name,
      shortCode: c.shortCode,
      description: c.description ?? '',
      thematicTags: c.thematicTags.join(', '),
      termStart: toDateStr(c.termStart),
      termEnd: toDateStr(c.termEnd),
    });
    this.showEditForm.set(true);
  }

  async saveEdit(): Promise<void> {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const c = this.committee();
    if (!c) return;
    this.editSubmitting.set(true);
    const val = this.editForm.value;
    const tags = (val.thematicTags ?? '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    await this.committeeService.updateCommittee(c.committeeId, {
      name: val.name!,
      shortCode: val.shortCode!,
      description: val.description || null,
      thematicTags: tags,
      termStart: val.termStart ? Timestamp.fromDate(new Date(val.termStart)) : c.termStart,
      termEnd: val.termEnd ? Timestamp.fromDate(new Date(val.termEnd)) : null,
    });
    this.showEditForm.set(false);
    this.editSubmitting.set(false);
  }

  // ── Gap #5 handler ────────────────────────────────────────────────────────

  async toggleActive(): Promise<void> {
    const c = this.committee();
    if (!c) return;
    this.toggling.set(true);
    await this.committeeService.updateCommittee(c.committeeId, { isActive: !c.isActive });
    this.toggling.set(false);
  }

  // ── Referral action handlers ──────────────────────────────────────────────

  async acknowledgeReferral(docId: string, referralId: string): Promise<void> {
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(docId, referralId, {
      status: 'acknowledged',
      acknowledgedAt: serverTimestamp() as any,
    });
    this.referralActionSubmitting.set(false);
  }

  async startReview(docId: string, referralId: string): Promise<void> {
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(docId, referralId, { status: 'under_review' });
    this.referralActionSubmitting.set(false);
  }

  async completeReferral(docId: string, referralId: string): Promise<void> {
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(docId, referralId, {
      status: 'completed',
      completedAt: serverTimestamp() as any,
    });
    await this.docService.advanceStatus(docId, 'for_first_reading');
    this.referralActionSubmitting.set(false);
  }

  openReturnModal(item: CommitteeReferralItem): void {
    this.returningItem.set(item);
    this.returnRemarksInput.set('');
  }

  async submitReturn(docId: string, referralId: string, remarks: string): Promise<void> {
    if (!remarks.trim()) return;
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(docId, referralId, {
      status: 'returned',
      returnRemarks: remarks,
    });
    await this.docService.advanceStatus(docId, 'committee_returned');
    this.returningItem.set(null);
    this.returnRemarksInput.set('');
    this.referralActionSubmitting.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getReferralStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      acknowledged: 'bg-blue-100 text-blue-700',
      under_review: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      returned: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  isReferralOverdue(dueDate: unknown): boolean {
    if (!dueDate) return false;
    const d = (dueDate as { toDate?: () => Date }).toDate?.() ?? new Date(dueDate as string);
    return d < new Date();
  }

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
      archived: 'bg-gray-100 text-gray-500',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  format(val: string): string {
    return (val ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(ts: unknown): string {
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
}
