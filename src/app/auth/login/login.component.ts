// src/app/auth/login/login.component.ts (UPDATED - Phone Login)
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
   * ✅ UPDATED: Initialize login form with phone number
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      phone: ['', [
        Validators.required,
        Validators.pattern(/^07[0-9]{8}$/) // Jordanian phone format
      ]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * ✅ UPDATED: Initialize forgot password form (supports phone or email)
   */
  private initializeForgotPasswordForm(): void {
    this.forgotPasswordForm = this.fb.group({
      emailOrPhone: ['', [Validators.required]]
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
   * ✅ UPDATED: Submit forgot password request
   */
  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.forgotPasswordLoading = true;
    this.forgotPasswordError = '';

    const emailOrPhone = this.forgotPasswordForm.value.emailOrPhone;

    this.authService.requestPasswordReset(emailOrPhone).subscribe({
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
   * ✅ UPDATED: Handle form submission with phone number
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    const { phone, password } = this.loginForm.value;

    // ✅ Send phone and password to backend
    const credentials = {
      phone: phone,
      password: password
    };

    console.log('📞 Logging in with phone:', phone);

    this.authService.login(credentials).subscribe({
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
   * ✅ UPDATED: Check if field has error (now handles phone)
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  /**
   * ✅ UPDATED: Get error message for field (now handles phone)
   */
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (!field?.touched) return '';

    if (field?.hasError('required')) {
      return fieldName === 'phone'
        ? 'رقم الهاتف مطلوب'
        : 'كلمة المرور مطلوبة';
    }

    if (field?.hasError('pattern') && fieldName === 'phone') {
      return 'رقم الهاتف يجب أن يكون أردني بصيغة 07XXXXXXXX';
    }

    if (field?.hasError('minlength')) {
      const minLength = field?.errors?.['minlength']?.requiredLength;
      return `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`;
    }

    return '';
  }
}