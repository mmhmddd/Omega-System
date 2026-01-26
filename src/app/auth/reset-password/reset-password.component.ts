import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  loading = false;
  resetSuccess = false;
  errorMessage = '';
  token: string = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get token from URL query parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';

      if (!this.token) {
        this.errorMessage = 'رابط إعادة تعيين كلمة المرور غير صالح';
      }
    });

    this.initializeForm();
  }

  /**
   * Initialize reset password form
   */
  private initializeForm(): void {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(group: FormGroup): {[key: string]: boolean} | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    // Clear the error if passwords match
    const confirmPasswordControl = group.get('confirmPassword');
    if (confirmPasswordControl?.hasError('passwordMismatch')) {
      confirmPasswordControl.setErrors(null);
    }

    return null;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    if (!this.token) {
      this.errorMessage = 'رابط إعادة تعيين كلمة المرور غير صالح';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const newPassword = this.resetPasswordForm.value.newPassword;

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: (response) => {
        console.log('Password reset successful:', response);
        this.loading = false;
        this.resetSuccess = true;

        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        console.error('Password reset error:', error);
        this.loading = false;

        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'حدث خطأ أثناء إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.';
        }
      }
    });
  }

  /**
   * Mark all form fields as touched
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
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.resetPasswordForm.get(fieldName);

    if (!field?.touched) return '';

    if (field?.hasError('required')) {
      return fieldName === 'newPassword'
        ? 'كلمة المرور الجديدة مطلوبة'
        : 'تأكيد كلمة المرور مطلوب';
    }

    if (field?.hasError('minlength')) {
      const minLength = field?.errors?.['minlength']?.requiredLength;
      return `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`;
    }

    if (field?.hasError('passwordMismatch')) {
      return 'كلمات المرور غير متطابقة';
    }

    return '';
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  currentYear = new Date().getFullYear();
}
