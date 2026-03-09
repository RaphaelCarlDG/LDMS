import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { VaultService } from '../../../services/vault.service';

@Component({
  selector: 'app-vault-detail',
  imports: [RouterLink],
  templateUrl: './vault-detail.html',
})
export class VaultDetailComponent {
  private route = inject(ActivatedRoute);
  private vaultService = inject(VaultService);

  readonly entry = toSignal(
    this.route.paramMap.pipe(switchMap((p) => this.vaultService.getVaultEntry$(p.get('id')!))),
    { initialValue: null },
  );

  format(val: string): string {
    return (val ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    const d = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
    return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  getClassificationBadge(classification: string): string {
    const map: Record<string, string> = {
      permanent: 'bg-purple-100 text-purple-700',
      long_term: 'bg-blue-100 text-blue-700',
      medium_term: 'bg-yellow-100 text-yellow-700',
      short_term: 'bg-gray-100 text-gray-600',
    };
    return map[classification] ?? 'bg-gray-100 text-gray-500';
  }
}
