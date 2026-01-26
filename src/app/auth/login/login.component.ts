import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  loginSuccess = false;

  // Forgot Password Modal
  showForgotPasswordModal = false;
  forgotPasswordLoading = false;
  forgotPasswordSuccess = false;
  forgotPasswordError = '';

  currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initializeForm();
    this.initializeForgotPasswordForm();
  }

  /**
   * Initialize login form
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Initialize forgot password form
   */
  private initializeForgotPasswordForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Open forgot password modal
   */
  openForgotPasswordModal(): void {
    this.showForgotPasswordModal = true;
    this.forgotPasswordSuccess = false;
    this.forgotPasswordError = '';
    this.forgotPasswordForm.reset();
  }

  /**
   * Close forgot password modal
   */
  closeForgotPasswordModal(): void {
    this.showForgotPasswordModal = false;
    this.forgotPasswordForm.reset();
    this.forgotPasswordSuccess = false;
    this.forgotPasswordError = '';
  }

  /**
   * Submit forgot password request
   */
  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.forgotPasswordLoading = true;
    this.forgotPasswordError = '';

    const email = this.forgotPasswordForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        console.log('Forgot password success:', response);
        this.forgotPasswordLoading = false;
        this.forgotPasswordSuccess = true;

        // Close modal after 5 seconds
        setTimeout(() => {
          this.closeForgotPasswordModal();
        }, 5000);
      },
      error: (error) => {
        console.error('Forgot password error:', error);
        this.forgotPasswordLoading = false;

        if (error.error?.message) {
          this.forgotPasswordError = error.error.message;
        } else {
          this.forgotPasswordError = 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور';
        }
      }
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);

        this.loginSuccess = true;
        this.loading = false;

        setTimeout(() => {
          const user = response.data.user;
          this.navigateBasedOnRole(user.role);
        }, 1200);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.loading = false;
        this.loginSuccess = false;

        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
        }
      }
    });
  }

  /**
   * Navigate based on user role
   */
  private navigateBasedOnRole(role: string): void {
    switch (role) {
      case 'super_admin':
      case 'admin':
        this.router.navigate(['/dashboard']);
        break;
      case 'secretariat':
        this.router.navigate(['/secretariat-user']);
        break;
      case 'employee':
        this.router.navigate(['/dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (!field?.touched) return '';

    if (field?.hasError('required')) {
      return fieldName === 'username'
        ? 'اسم المستخدم مطلوب'
        : 'كلمة المرور مطلوبة';
    }

    if (field?.hasError('minlength')) {
      const minLength = field?.errors?.['minlength']?.requiredLength;
      return fieldName === 'username'
        ? `اسم المستخدم يجب أن يكون ${minLength} أحرف على الأقل`
        : `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`;
    }

    return '';
  }
}
