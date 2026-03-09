import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  mode = signal<'login' | 'signup'>('login');
  error = signal('');

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  signupForm: FormGroup = this.fb.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  switchMode(mode: 'login' | 'signup'): void {
    this.mode.set(mode);
    this.error.set('');
    this.loginForm.reset();
    this.signupForm.reset();
  }

  submit(): void {
    if (this.mode() === 'login') {
      this.submitLogin();
    } else {
      this.submitSignup();
    }
  }

  private submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.auth
      .login(email, password)
      .then(() => this.router.navigate(['/app/dashboard']))
      .catch((err: unknown) => this.error.set(this.getAuthErrorMessage(err)));
  }

  private submitSignup(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.signupForm.value;
    this.auth
      .register(name, email, password)
      .then(() => this.router.navigate(['/app/dashboard']))
      .catch((err: unknown) => this.error.set(this.getAuthErrorMessage(err)));
  }

  private getAuthErrorMessage(err: unknown): string {
    const code = (err as { code?: string })?.code;
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'permission-denied':
        return 'Account created but profile save failed — Firestore rules may not be deployed yet. Run: firebase deploy --only firestore:rules';
      default:
        return `An error occurred (${code ?? 'unknown'}). Please try again.`;
    }
  }
}
