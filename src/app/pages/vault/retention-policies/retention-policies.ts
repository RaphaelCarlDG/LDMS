import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { VaultService } from '../../../services/vault.service';
import { RetentionClassification, DisposalMethod } from '../../../models';

@Component({
  selector: 'app-retention-policies',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './retention-policies.html',
})
export class RetentionPoliciesComponent {
  private vaultService = inject(VaultService);
  private fb = inject(FormBuilder);

  readonly policies = toSignal(this.vaultService.listRetentionPolicies$(), { initialValue: [] });
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');

  readonly policyForm = this.fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    legalBasis: ['', Validators.required],
    classification: ['permanent', Validators.required],
    durationYears: [null as number | null],
    disposalMethod: ['review_and_decide'],
    requiresReview: [false],
  });

  async savePolicy(): Promise<void> {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    try {
      const val = this.policyForm.value;
      await this.vaultService.createRetentionPolicy({
        name: val.name!,
        description: val.description!,
        legalBasis: val.legalBasis!,
        classification: val.classification as RetentionClassification,
        durationYears: val.durationYears ?? null,
        disposalMethod: (val.disposalMethod as DisposalMethod) ?? null,
        requiresReview: val.requiresReview ?? false,
        reviewIntervalYears: null,
        applicableTo: [],
      });
      this.policyForm.reset({
        classification: 'permanent',
        disposalMethod: 'review_and_decide',
        requiresReview: false,
      });
      this.showForm.set(false);
    } catch {
      this.saveError.set('Failed to save. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  format(val: string): string {
    return (val ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
