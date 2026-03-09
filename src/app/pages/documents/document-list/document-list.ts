import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../services/document.service';
import { UserService } from '../../../services/user.service';
import { DocumentStatus, DocumentType } from '../../../models';

@Component({
  selector: 'app-document-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './document-list.html',
})
export class DocumentListComponent {
  private docService = inject(DocumentService);
  readonly userService = inject(UserService);

  readonly allDocuments = toSignal(this.docService.listDocuments$(), { initialValue: [] });
  readonly statusFilter = signal<DocumentStatus | ''>('');
  readonly typeFilter = signal<DocumentType | ''>('');
  readonly searchQuery = signal('');

  readonly filteredDocuments = computed(() => {
    let docs = this.allDocuments();
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    const t = this.typeFilter();
    if (q)
      docs = docs.filter(
        (d) => d.title?.toLowerCase().includes(q) || d.barcodeId?.toLowerCase().includes(q),
      );
    if (s) docs = docs.filter((d) => d.status === s);
    if (t) docs = docs.filter((d) => d.type === t);
    return docs;
  });

  readonly statusOptions: DocumentStatus[] = [
    'draft',
    'for_committee_review',
    'committee_returned',
    'for_first_reading',
    'for_second_reading',
    'for_third_reading',
    'approved',
    'vetoed',
    'lapsed',
    'archived',
  ];

  readonly typeOptions: DocumentType[] = [
    'ordinance',
    'resolution',
    'communication',
    'motion',
    'committee_report',
    'draft',
  ];

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
    return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
