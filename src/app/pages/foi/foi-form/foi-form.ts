import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FoiService } from '../../../services/foi.service';

@Component({
  selector: 'app-foi-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './foi-form.html',
})
export class FoiFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private foiService = inject(FoiService);

  readonly submitting = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    organization: [''],
    requesterType: ['citizen', Validators.required],
    purpose: ['', Validators.required],
    searchQuery: [''],
  });

  readonly requesterTypes = [
    { value: 'citizen', label: 'Private Citizen' },
    { value: 'media', label: 'Media / Journalist' },
    { value: 'ngo', label: 'NGO / Civil Society' },
    { value: 'government_agency', label: 'Government Agency' },
    { value: 'academic', label: 'Academic / Researcher' },
  ];

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    try {
      const val = this.form.value;
      const id = await this.foiService.submitFoi({
        requester: {
          name: val.name!,
          email: val.email!,
          phone: val.phone ?? null,
          organization: val.organization ?? null,
          type: val.requesterType as never,
        },
        purpose: val.purpose!,
        searchQuery: val.searchQuery ?? '',
        specificDocumentIds: [],
      });
      await this.router.navigate(['/app/foi', id]);
    } catch {
      this.error.set('Failed to submit FOI request. Please try again.');
      this.submitting.set(false);
    }
  }
}
