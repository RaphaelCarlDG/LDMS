import { Component, inject, signal, computed, effect } from '@angular/core';
import * as QRCode from 'qrcode';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { switchMap } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';
import { DocumentService } from '../../../services/document.service';
import { CommitteeService } from '../../../services/committee.service';
import { UserService } from '../../../services/user.service';
import { VaultService } from '../../../services/vault.service';
import { DocumentStatus, Referral } from '../../../models';

interface StatusTransition {
  label: string;
  next: DocumentStatus;
  style: string;
}

const STATUS_TRANSITIONS: Record<DocumentStatus, StatusTransition[]> = {
  draft: [{ label: 'Submit for Review', next: 'for_committee_review', style: 'blue' }],
  for_committee_review: [
    { label: 'Return to Author', next: 'committee_returned', style: 'orange' },
    { label: 'Move to 1st Reading', next: 'for_first_reading', style: 'blue' },
  ],
  committee_returned: [
    { label: 'Resubmit for Review', next: 'for_committee_review', style: 'blue' },
  ],
  for_first_reading: [{ label: 'Move to 2nd Reading', next: 'for_second_reading', style: 'blue' }],
  for_second_reading: [{ label: 'Move to 3rd Reading', next: 'for_third_reading', style: 'blue' }],
  for_third_reading: [
    { label: 'Approve', next: 'approved', style: 'green' },
    { label: 'Veto', next: 'vetoed', style: 'red' },
    { label: 'Mark as Lapsed', next: 'lapsed', style: 'red' },
  ],
  approved: [{ label: 'Move to Archive', next: 'archived', style: 'gray' }],
  vetoed: [],
  lapsed: [],
  archived: [],
};

@Component({
  selector: 'app-document-detail',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './document-detail.html',
})
export class DocumentDetailComponent {
  private route = inject(ActivatedRoute);
  private docService = inject(DocumentService);
  private committeeService = inject(CommitteeService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  readonly userService = inject(UserService);
  private vaultService = inject(VaultService);

  readonly docId$ = this.route.paramMap.pipe(
    switchMap((p) => {
      const id = p.get('id')!;
      return this.docService.getDocument$(id);
    }),
  );
  readonly document = toSignal(this.docId$, { initialValue: null });

  readonly committees = toSignal(this.committeeService.listCommittees$(), { initialValue: [] });

  readonly referrals = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.docService.listReferrals$(p.get('id')!))),
    { initialValue: [] },
  );

  readonly transitions = computed(() => {
    const doc = this.document();
    if (!doc) return [];
    return STATUS_TRANSITIONS[doc.status] ?? [];
  });

  readonly activeTab = signal<'info' | 'referrals'>('info');
  readonly advancing = signal(false);
  readonly showReferralForm = signal(false);
  readonly referralError = signal('');
  readonly qrCodeDataUrl = signal<string>('');
  readonly showArchiveModal = signal(false);
  readonly archivePolicyId = signal('');
  readonly retentionPolicies = toSignal(this.vaultService.listRetentionPolicies$(), {
    initialValue: [],
  });
  readonly referralActionSubmitting = signal(false);
  readonly returningReferral = signal<Referral | null>(null);
  readonly returnRemarksInput = signal('');

  readonly canActOnReferrals = computed(() => {
    const role = this.userService.currentUser()?.role;
    return role === 'committee_chair' || role === 'super_admin' || role === 'secretariat';
  });

  constructor() {
    effect(() => {
      const doc = this.document();
      if (doc?.qrCode) {
        QRCode.toDataURL(doc.qrCode, { width: 200, margin: 1 }).then((url) => {
          this.qrCodeDataUrl.set(url);
        });
      } else {
        this.qrCodeDataUrl.set('');
      }
    });
  }

  readonly referralForm = this.fb.group({
    committeeId: ['', Validators.required],
    notes: [''],
  });

  async advance(next: DocumentStatus): Promise<void> {
    const doc = this.document();
    if (!doc) return;
    if (next === 'archived') {
      this.showArchiveModal.set(true);
      return;
    }
    this.advancing.set(true);
    await this.docService.advanceStatus(doc.documentId, next);
    this.advancing.set(false);
  }

  async confirmArchive(): Promise<void> {
    const doc = this.document();
    const policyId = this.archivePolicyId();
    if (!doc || !policyId) return;
    const user = this.userService.currentUser();
    if (!user) return;
    this.advancing.set(true);
    await this.vaultService.archiveDocument(doc.documentId, policyId, user.userId);
    this.advancing.set(false);
    this.archivePolicyId.set('');
    this.showArchiveModal.set(false);
  }

  async addReferral(): Promise<void> {
    if (this.referralForm.invalid) {
      this.referralForm.markAllAsTouched();
      return;
    }
    const doc = this.document();
    if (!doc) return;
    const user = this.userService.currentUser();
    if (!user) return;
    const val = this.referralForm.value;
    const committee = this.committees().find((c) => c.committeeId === val.committeeId);
    await this.docService.addReferral(doc.documentId, {
      toCommitteeId: val.committeeId!,
      toCommitteeName: committee?.name ?? val.committeeId!,
      fromUserId: user.userId,
      fromUserName: user.fullName,
      instructions: val.notes ?? null,
      priority: 'normal',
    });
    this.referralForm.reset();
    this.showReferralForm.set(false);
    this.activeTab.set('referrals');
  }

  // ── Referral status action handlers ──────────────────────────────────────

  async acknowledgeReferral(referralId: string): Promise<void> {
    const doc = this.document();
    if (!doc) return;
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(doc.documentId, referralId, {
      status: 'acknowledged',
      acknowledgedAt: serverTimestamp() as any,
    });
    this.referralActionSubmitting.set(false);
  }

  async startReview(referralId: string): Promise<void> {
    const doc = this.document();
    if (!doc) return;
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(doc.documentId, referralId, { status: 'under_review' });
    this.referralActionSubmitting.set(false);
  }

  async completeReferral(referralId: string): Promise<void> {
    const doc = this.document();
    if (!doc) return;
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(doc.documentId, referralId, {
      status: 'completed',
      completedAt: serverTimestamp() as any,
    });
    await this.docService.advanceStatus(doc.documentId, 'for_first_reading');
    this.referralActionSubmitting.set(false);
  }

  openReturnModal(referral: Referral): void {
    this.returningReferral.set(referral);
    this.returnRemarksInput.set('');
  }

  async submitReturn(referralId: string, remarks: string): Promise<void> {
    const doc = this.document();
    if (!doc || !remarks.trim()) return;
    this.referralActionSubmitting.set(true);
    await this.docService.updateReferral(doc.documentId, referralId, {
      status: 'returned',
      returnRemarks: remarks,
    });
    await this.docService.advanceStatus(doc.documentId, 'committee_returned');
    this.returningReferral.set(null);
    this.returnRemarksInput.set('');
    this.referralActionSubmitting.set(false);
  }

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

  getBtnClass(style: string): string {
    const map: Record<string, string> = {
      blue: 'bg-blue-600 text-white hover:bg-blue-700',
      green: 'bg-green-600 text-white hover:bg-green-700',
      red: 'bg-red-600 text-white hover:bg-red-700',
      orange: 'bg-orange-500 text-white hover:bg-orange-600',
      gray: 'bg-gray-600 text-white hover:bg-gray-700',
    };
    return `px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${map[style] ?? map['gray']}`;
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
      lapsed: 'bg-red-50 text-red-600',
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

  isPdf(mimeType: string | null | undefined): boolean {
    return mimeType === 'application/pdf';
  }

  isImage(mimeType: string | null | undefined): boolean {
    return (mimeType ?? '').startsWith('image/');
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  safeFileUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  printQrLabel(): void {
    const doc = this.document();
    if (!doc) return;
    const win = window.open('', '_blank', 'width=420,height=480');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>QR Label — ${doc.barcodeId}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 24px; margin: 0; }
            img { width: 200px; height: 200px; display: block; margin: 0 auto; }
            .barcode { font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 10px; }
            .title { font-size: 11px; color: #555; margin-top: 4px; max-width: 240px; word-wrap: break-word; margin-left: auto; margin-right: auto; }
            .qr-code { font-size: 10px; color: #999; margin-top: 4px; }
          </style>
        </head>
        <body>
          <img src="${this.qrCodeDataUrl()}" alt="QR Code" />
          <div class="barcode">${doc.barcodeId}</div>
          <div class="title">${doc.title}</div>
          <div class="qr-code">${doc.qrCode}</div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }
}
