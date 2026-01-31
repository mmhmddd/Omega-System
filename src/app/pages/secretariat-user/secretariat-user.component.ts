import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  SecretariatUserService,
  UserForm,
  CreateUserFormData,
  FormType,
  ManualFormData
} from '../../core/services/secretariat-user.service';
import { AuthService } from '../../core/services/auth.service';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-secretariat-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './secretariat-user.component.html',
  styleUrl: './secretariat-user.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(-20px)',
          maxHeight: 0
        }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({
          opacity: 1,
          transform: 'translateY(0)',
          maxHeight: '3000px'
        }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 1, 1)', style({
          opacity: 0,
          transform: 'translateY(-10px)',
          maxHeight: 0
        }))
      ])
    ])
  ]
})
export class SecretariatUserComponent implements OnInit, OnDestroy {

  // ============================================
  // VIEW MANAGEMENT
  // ============================================
  currentView: 'list' | 'create' = 'list';
  formLanguage: 'ar' | 'en' = 'ar';

  // ============================================
  // DATA
  // ============================================
  forms: UserForm[] = [];
  formTypes: FormType[] = [];
  currentUser: any = null;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // ============================================
  // FORM DATA
  // ============================================
  formData: CreateUserFormData = {
    formType: 'departure',
    projectName: '',
    date: ''
  };

  manualData: ManualFormData = {};

  // ============================================
  // FILTERS
  // ============================================
  selectedFormType: string = '';
  selectedStatus: string = '';

  // ============================================
  // PAGINATION
  // ============================================
  currentPage: number = 1;
  totalPages: number = 1;
  totalForms: number = 0;
  pageSize: number = 10;

  // ============================================
  // LOADING STATES
  // ============================================
  loading: boolean = false;
  creatingForm: boolean = false;

  // ============================================
  // VALIDATION ERRORS
  // ============================================
  fieldErrors: { [key: string]: string } = {};
  formError: string = '';

  // ============================================
  // MODALS
  // ============================================
  showSuccessModal: boolean = false;
  showDuplicateModal: boolean = false;
  generatedFormId: string = '';
  formToDuplicate: UserForm | null = null;

  constructor(
    private secretariatUserService: SecretariatUserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAccess();
    this.loadCurrentUser();
    this.loadFormTypes();
    this.loadMyForms();
  }

  ngOnDestroy(): void {
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
  }

  // ============================================
  // ACCESS CONTROL
  // ============================================

  checkAccess(): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'يجب تسجيل الدخول أولاً'
        : 'Please login first';
      this.showToast('error', errorMsg);
      return;
    }

    const hasAccess =
      currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      (currentUser.role === 'employee' && this.authService.hasRouteAccess('secretariatUserManagement'));

    if (!hasAccess) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
        : 'You do not have permission to access this page';
      this.showToast('error', errorMsg);
    }
  }

  loadCurrentUser(): void {
    this.currentUser = this.authService.currentUserValue;
  }

  // ============================================
  // TOAST METHODS
  // ============================================

  showToast(type: ToastType, message: string, duration: number = 4000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message };

    this.toasts.push(toast);

    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimeouts.set(id, timeout);
    }

    if (this.toasts.length > 5) {
      const oldestToast = this.toasts[0];
      this.removeToast(oldestToast.id);
    }
  }

  removeToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      const timeout = this.toastTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.toastTimeouts.delete(id);
      }
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadMyForms(): void {
    this.loading = true;
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      formType: this.selectedFormType || undefined,
      status: this.selectedStatus || undefined
    };

    this.secretariatUserService.getMyForms(filters).subscribe({
      next: (response) => {
        this.forms = response.data;
        this.totalForms = response.pagination.totalForms;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading forms:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل النماذج'
          : 'Error loading forms';
        this.showToast('error', errorMsg);
        this.loading = false;
      }
    });
  }

  loadFormTypes(): void {
    this.secretariatUserService.getFormTypes().subscribe({
      next: (response) => {
        this.formTypes = response.data.formTypes.map(ft => ({
          ...ft,
          icon: this.secretariatUserService.getFormTypeIcon(ft.value),
          color: this.secretariatUserService.getFormTypeColor(ft.value)
        }));
      },
      error: (error) => {
        console.error('Error loading form types:', error);
      }
    });
  }

  // ============================================
  // VIEW MANAGEMENT
  // ============================================

  createNewForm(): void {
    this.resetForm();
    this.currentView = 'create';
    this.fieldErrors = {};
    this.formError = '';
  }

  backToList(): void {
    this.currentView = 'list';
    this.resetForm();
    this.loadMyForms();
  }

  // ============================================
  // DUPLICATE FORM FUNCTIONALITY
  // ============================================

  openDuplicateModal(form: UserForm): void {
    this.formToDuplicate = form;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.formToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.formToDuplicate) return;

    const form = this.formToDuplicate;

    // Reset form first
    this.resetForm();

    // Populate form with duplicated data
    this.formData = {
      formType: form.formType,
      projectName: form.projectName || '',
      date: this.getTodayDate() // Use today's date for new form
    };

    // Copy manual data if it exists
    if (form.manualData) {
      this.manualData = { ...form.manualData };
    } else {
      this.manualData = this.secretariatUserService.createEmptyManualData(form.formType);
    }

    // Set view to CREATE (not edit)
    this.currentView = 'create';
    this.fieldErrors = {};
    this.formError = '';

    // Close modal
    this.closeDuplicateModal();

    // Show success message
    const successMsg = this.formLanguage === 'ar'
      ? `تم نسخ بيانات النموذج ${form.formNumber}. يمكنك التعديل وحفظ نموذج جديد.`
      : `Form ${form.formNumber} data copied. You can modify and save as a new form.`;
    this.showToast('info', successMsg, 5000);
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    this.formData = {
      formType: 'departure',
      projectName: '',
      date: this.getTodayDate()
    };
    this.manualData = {};
    this.fieldErrors = {};
    this.formError = '';
  }

  getTodayDate(): string {
    return this.secretariatUserService.getTodayDate();
  }

  // ============================================
  // FORM TYPE SELECTION
  // ============================================

  selectFormType(formType: string): void {
    this.formData.formType = formType as any;

    // Initialize manual data based on form type - now empty by default
    this.manualData = this.secretariatUserService.createEmptyManualData(formType);

    // Clear field errors
    delete this.fieldErrors['formType'];
  }

  // ============================================
  // VALIDATION
  // ============================================

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.formData.formType) {
      this.fieldErrors['formType'] = this.formLanguage === 'ar'
        ? 'يرجى اختيار نوع النموذج'
        : 'Please select form type';
      isValid = false;
    }

    if (!this.formData.date) {
      this.fieldErrors['date'] = this.formLanguage === 'ar'
        ? 'التاريخ مطلوب'
        : 'Date is required';
      isValid = false;
    }

    // Validate manual data if provided
    if (Object.keys(this.manualData).length > 0) {
      const validation = this.secretariatUserService.validateManualData(
        this.formData.formType,
        this.manualData
      );

      if (!validation.isValid) {
        this.formError = validation.errors.join(', ');
        isValid = false;
      }
    }

    return isValid;
  }

  // ============================================
  // CREATE FORM
  // ============================================

  saveForm(): void {
    if (!this.validateForm()) {
      this.formError = this.formLanguage === 'ar'
        ? 'يرجى تصحيح الأخطاء في النموذج'
        : 'Please correct form errors';
      this.showToast('warning', this.formError);
      return;
    }

    this.creatingForm = true;
    this.formError = '';

    // Prepare form data with optional manual inputs
    const submitData: CreateUserFormData = {
      formType: this.formData.formType,
      projectName: this.formData.projectName,
      date: this.formData.date
    };

    // Add manual data if provided (filter out empty values)
    if (Object.keys(this.manualData).length > 0) {
      const filteredManualData: ManualFormData = {};
      for (const [key, value] of Object.entries(this.manualData)) {
        if (value !== null && value !== undefined && value !== '') {
          filteredManualData[key as keyof ManualFormData] = value;
        }
      }

      if (Object.keys(filteredManualData).length > 0) {
        submitData.manualData = filteredManualData;
      }
    }

    this.secretariatUserService.createUserForm(submitData).subscribe({
      next: (response) => {
        this.creatingForm = false;
        this.generatedFormId = response.data.id;
        this.showSuccessModal = true;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم إنشاء النموذج بنجاح وإرسال إشعار للسكرتارية'
          : 'Form created successfully and notification sent to secretariat';
        this.showToast('success', successMsg, 5000);
      },
      error: (error) => {
        console.error('Error creating form:', error);

        let errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء إنشاء النموذج'
          : 'Error creating form';

        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.error?.errors && Array.isArray(error.error.errors)) {
          errorMsg = error.error.errors.join(', ');
        }

        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.creatingForm = false;
      }
    });
  }

  // ============================================
  // SUCCESS MODAL
  // ============================================

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.generatedFormId = '';
    this.backToList();
  }

  viewGeneratedPDF(): void {
    if (this.generatedFormId) {
      this.secretariatUserService.downloadPDF(this.generatedFormId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        },
        error: (error) => {
          console.error('Error viewing PDF:', error);
          const errorMsg = this.formLanguage === 'ar'
            ? 'حدث خطأ أثناء عرض الملف'
            : 'Error viewing PDF';
          this.showToast('error', errorMsg);
        }
      });
    }
  }

  printGeneratedPDF(): void {
    if (this.generatedFormId) {
      this.secretariatUserService.downloadPDF(this.generatedFormId).subscribe({
        next: (blob) => {
          this.printPDFBlob(blob);
        },
        error: (error) => {
          console.error('Error printing PDF:', error);
          const errorMsg = this.formLanguage === 'ar'
            ? 'حدث خطأ أثناء طباعة الملف'
            : 'Error printing PDF';
          this.showToast('error', errorMsg);
        }
      });
    }
  }

  downloadGeneratedPDF(): void {
    if (this.generatedFormId) {
      const form = this.forms.find(f => f.id === this.generatedFormId);
      const filename = form
        ? `${form.formNumber}-${form.employeeName}.pdf`
        : `form-${this.generatedFormId}.pdf`;
      this.secretariatUserService.triggerPDFDownload(this.generatedFormId, filename);
    }
  }

  // ============================================
  // PDF OPERATIONS
  // ============================================

  viewPDF(form: UserForm): void {
    this.secretariatUserService.downloadPDF(form.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (error) => {
        console.error('Error viewing PDF:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء عرض الملف'
          : 'Error viewing PDF';
        this.showToast('error', errorMsg);
      }
    });
  }

  printPDF(form: UserForm): void {
    this.secretariatUserService.downloadPDF(form.id).subscribe({
      next: (blob) => {
        this.printPDFBlob(blob);
      },
      error: (error) => {
        console.error('Error printing PDF:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء طباعة الملف'
          : 'Error printing PDF';
        this.showToast('error', errorMsg);
      }
    });
  }

  downloadPDF(form: UserForm): void {
    const filename = `${form.formNumber}-${form.employeeName}.pdf`;
    this.secretariatUserService.triggerPDFDownload(form.id, filename);
  }

  private printPDFBlob(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = url;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }

          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }, 1000);
        }, 250);
      } catch (error) {
        console.error('Error printing PDF:', error);
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }
    };
  }

  // ============================================
  // FILTERS
  // ============================================

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadMyForms();
  }

  clearFilters(): void {
    this.selectedFormType = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadMyForms();
  }

  // ============================================
  // PAGINATION
  // ============================================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadMyForms();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatDate(dateString: string): string {
    return this.secretariatUserService.formatDate(dateString);
  }

  getFormTypeLabel(formType: string): string {
    return this.formLanguage === 'ar'
      ? this.secretariatUserService.getFormTypeLabel(formType)
      : this.secretariatUserService.getFormTypeLabelEn(formType);
  }

  getFormTypeLabelEn(formType: string): string {
    return this.secretariatUserService.getFormTypeLabelEn(formType);
  }

  getStatusLabel(status: string): string {
    return this.formLanguage === 'ar'
      ? this.secretariatUserService.getStatusLabel(status)
      : this.secretariatUserService.getStatusLabelEn(status);
  }

  getStatusColor(status: string): string {
    return this.secretariatUserService.getStatusColor(status);
  }

  getFormTypeIcon(formType: string): string {
    return this.secretariatUserService.getFormTypeIcon(formType);
  }

  getFormTypeColor(formType: string): string {
    return this.secretariatUserService.getFormTypeColor(formType);
  }

  // ============================================
  // CHECK IF FORM TYPE HAS SPECIFIC FIELDS
  // ============================================

  isDepartureForm(): boolean {
    return this.formData.formType === 'departure';
  }

  isVacationForm(): boolean {
    return this.formData.formType === 'vacation';
  }

  isAdvanceForm(): boolean {
    return this.formData.formType === 'advance';
  }

  isAccountStatementForm(): boolean {
    return this.formData.formType === 'account_statement';
  }
}
