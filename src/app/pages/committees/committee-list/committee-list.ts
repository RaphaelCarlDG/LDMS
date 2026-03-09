import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommitteeService } from '../../../services/committee.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-committee-list',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './committee-list.html',
})
export class CommitteeListComponent {
  private committeeService = inject(CommitteeService);
  readonly userService = inject(UserService);
  private fb = inject(FormBuilder);

  readonly committees = toSignal(this.committeeService.listCommittees$(), { initialValue: [] });
  readonly showForm = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');

  // ── Gap #8 + #10 — Active/inactive filter + search ───────────────────────

  readonly showInactive = signal(false);
  readonly searchQuery = signal('');

  readonly inactiveCount = computed(() => this.committees().filter((c) => !c.isActive).length);

  readonly filteredCommittees = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    let list = this.showInactive()
      ? this.committees()
      : this.committees().filter((c) => c.isActive);
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.thematicTags.some((t: string) => t.toLowerCase().includes(q)),
    );
  });

  // ─────────────────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    name: ['', Validators.required],
    shortCode: ['', Validators.required],
    description: [''],
    thematicTags: [''],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const user = this.userService.currentUser();
    if (!user) return;

    this.submitting.set(true);
    this.error.set('');
    try {
      const val = this.form.value;
      const tags = (val.thematicTags ?? '')
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
      await this.committeeService.createCommittee({
        name: val.name!,
        shortCode: val.shortCode!,
        description: val.description ?? null,
        thematicTags: tags,
        chairpersonId: user.userId,
        chairpersonName: user.fullName,
        viceChairId: null,
      });
      this.form.reset();
      this.showForm.set(false);
    } catch {
      this.error.set('Failed to create committee.');
    } finally {
      this.submitting.set(false);
    }
  }
}
