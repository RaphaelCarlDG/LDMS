import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SessionService } from '../../../services/session.service';
import { CommitteeService } from '../../../services/committee.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-session-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './session-form.html',
})
export class SessionFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private committeeService = inject(CommitteeService);
  private userService = inject(UserService);

  readonly committees = toSignal(this.committeeService.listCommittees$(), { initialValue: [] });
  readonly submitting = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    title: ['', Validators.required],
    type: ['regular', Validators.required],
    committeeId: [''],
    scheduledAt: ['', Validators.required],
    venueType: ['in_person', Validators.required],
    meetingUrl: [''],
  });

  readonly sessionTypes = [
    { value: 'regular', label: 'Regular Session' },
    { value: 'special', label: 'Special Session' },
    { value: 'emergency', label: 'Emergency Session' },
    { value: 'committee', label: 'Committee Session' },
  ];

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
      const id = await this.sessionService.createSession({
        title: val.title!,
        type: val.type as never,
        committeeId: val.committeeId || null,
        scheduledAt: new Date(val.scheduledAt!) as never,
        venueType: val.venueType as never,
        meetingUrl: val.meetingUrl || null,
        preparedById: user.userId,
        presidingOfficerId: user.userId,
        presidingOfficerName: user.fullName,
        minutesDocumentId: null,
      });
      await this.router.navigate(['/app/sessions', id]);
    } catch {
      this.error.set('Failed to create session. Please try again.');
      this.submitting.set(false);
    }
  }
}
