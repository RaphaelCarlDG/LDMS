import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { DocumentService } from '../../../services/document.service';
import { CommitteeService } from '../../../services/committee.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-document-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './document-form.html',
})
export class DocumentFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private docService = inject(DocumentService);
  private committeeService = inject(CommitteeService);
  private userService = inject(UserService);
  private storage = inject(Storage);

  readonly committees = toSignal(this.committeeService.listCommittees$(), { initialValue: [] });
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly selectedFile = signal<File | null>(null);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['ordinance', Validators.required],
    subject: [''],
    description: [''],
    urgencyFlag: ['routine', Validators.required],
    source: ['digital', Validators.required],
    committeeId: [''],
  });

  readonly typeOptions = [
    { value: 'ordinance', label: 'Ordinance' },
    { value: 'resolution', label: 'Resolution' },
    { value: 'communication', label: 'Communication' },
    { value: 'motion', label: 'Motion' },
    { value: 'committee_report', label: 'Committee Report' },
    { value: 'draft', label: 'Draft' },
  ];

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const user = this.userService.currentUser();
    if (!user) {
      this.error.set('You must be signed in to create documents.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    try {
      const val = this.form.value;

      let fileUrl: string | undefined;
      let fileStoragePath: string | undefined;
      let mimeType: string | undefined;
      let fileSize: number | undefined;

      const file = this.selectedFile();
      if (file) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        fileStoragePath = `documents/${user.userId}/${timestamp}_${safeName}`;
        const storageRef = ref(this.storage, fileStoragePath);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
        mimeType = file.type;
        fileSize = file.size;
      }

      const id = await this.docService.createDocument(
        {
          title: val.title!,
          type: val.type as never,
          abstract: val.description ?? null,
          urgencyFlag: val.urgencyFlag as never,
          source: val.source as 'digital' | 'scanned',
          committeeId: val.committeeId || null,
          category: 'other',
          ...(fileUrl && { fileUrl }),
          ...(fileStoragePath && { fileStoragePath }),
          ...(mimeType && { mimeType }),
          ...(fileSize !== undefined && { fileSize }),
        },
        user.userId,
        user.fullName,
      );
      await this.router.navigate(['/app/documents', id]);
    } catch {
      this.error.set('Failed to create document. Please try again.');
      this.submitting.set(false);
    }
  }
}
