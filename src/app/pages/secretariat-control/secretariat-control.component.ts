import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SecretariatService, SecretariatForm, CreateFormData, FormType } from '../../core/services/secretariat.service';
import { AuthService } from '../../core/services/auth.service';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface Employee {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
}

@Component({
  selector: 'app-secretariat-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './secretariat-control.component.html',
  styleUrl: './secretariat-control.component.scss'
})
export class SecretariatControlComponent implements OnInit, OnDestroy {

  // ============================================
  // VIEW MANAGEMENT
  // ============================================
  currentView: 'list' | 'create' = 'list';
  formLanguage: 'ar' | 'en' = 'ar';

  // ============================================
  // DATA
  // ============================================
  forms: SecretariatForm[] = [];
  employees: Employee[] = [];
  formTypes: FormType[] = [];
  selectedForm: SecretariatForm | null = null;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // ============================================
  // FORM DATA
  // ============================================
  formData: CreateFormData = {
    employeeId: '',
    formType: 'departure',
    projectName: '',
    date: ''
  };

  // ============================================
  // FILTERS
  // ============================================
  selectedFormType: string = '';
  selectedStatus: string = '';
  searchTerm: string = '';

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
  deletingForm: boolean = false;
  loadingEmployees: boolean = false;

  // ============================================
  // VALIDATION ERRORS
  // ============================================
  fieldErrors: { [key: string]: string } = {};
  formError: string = '';

  // ============================================
  // MODALS
  // ============================================
  showDeleteModal: boolean = false;
  showSuccessModal: boolean = false;
  showStatusModal: boolean = false;
  generatedFormId: string = '';
  newStatus: 'pending' | 'approved' | 'rejected' = 'pending';

  constructor(
    private secretariatService: SecretariatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAccess();
    this.loadFormTypes();
    this.loadForms();
    this.loadEmployees();
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

    // Only secretariat and super_admin can access
    if (currentUser.role !== 'secretariat' && currentUser.role !== 'super_admin') {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
        : 'You do not have permission to access this page';
      this.showToast('error', errorMsg);
    }
  }

  isSuperAdmin(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  isSecretariat(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'secretariat';
  }

  // ============================================
  // TOAST METHODS
  // ============================================

  showToast(type: ToastType, message: string, duration: number = 3000): void {
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

  loadForms(): void {
    this.loading = true;
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      formType: this.selectedFormType || undefined,
      status: this.selectedStatus || undefined,
      search: this.searchTerm || undefined
    };

    this.secretariatService.getAllForms(filters).subscribe({
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
    this.secretariatService.getFormTypes().subscribe({
      next: (response) => {
        this.formTypes = response.data.formTypes.map(ft => ({
          ...ft,
          icon: this.secretariatService.getFormTypeIcon(ft.value),
          color: this.secretariatService.getFormTypeColor(ft.value)
        }));
      },
      error: (error) => {
        console.error('Error loading form types:', error);
      }
    });
  }

  // ============================================
  // FIXED: Load employees using secretariat service
  // ============================================
  loadEmployees(): void {
    this.loadingEmployees = true;
    // Use the new secretariat employees endpoint
    this.secretariatService.getAllEmployees().subscribe({
      next: (response) => {
        this.employees = response.data;
        this.loadingEmployees = false;
        console.log('Employees loaded:', this.employees.length);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل الموظفين'
          : 'Error loading employees';
        this.showToast('error', errorMsg);
        this.loadingEmployees = false;
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
    this.loadForms();
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    this.formData = {
      employeeId: '',
      formType: 'departure',
      projectName: '',
      date: this.getTodayDate()
    };
    this.fieldErrors = {};
    this.formError = '';
  }

  getTodayDate(): string {
    return this.secretariatService.getTodayDate();
  }

  // ============================================
  // LANGUAGE TOGGLE
  // ============================================

  toggleFormLanguage(lang: 'ar' | 'en'): void {
    this.formLanguage = lang;
  }

  // ============================================
  // FORM TYPE SELECTION
  // ============================================

  selectFormType(formType: string): void {
    this.formData.formType = formType as any;
  }

  // ============================================
  // VALIDATION
  // ============================================

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.formData.employeeId) {
      this.fieldErrors['employeeId'] = this.formLanguage === 'ar'
        ? 'يرجى اختيار الموظف'
        : 'Please select employee';
      isValid = false;
    }

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

    this.secretariatService.createForm(this.formData).subscribe({
      next: (response) => {
        this.creatingForm = false;
        this.generatedFormId = response.data.id;
        this.showSuccessModal = true;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم إنشاء النموذج بنجاح'
          : 'Form created successfully';
        this.showToast('success', successMsg);
      },
      error: (error) => {
        console.error('Error creating form:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء إنشاء النموذج'
          : 'Error creating form');
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
      this.secretariatService.downloadPDF(this.generatedFormId).subscribe({
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
      this.secretariatService.downloadPDF(this.generatedFormId).subscribe({
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
      this.secretariatService.triggerPDFDownload(this.generatedFormId, filename);
    }
  }

  // ============================================
  // PDF OPERATIONS
  // ============================================

  viewPDF(form: SecretariatForm): void {
    this.secretariatService.downloadPDF(form.id).subscribe({
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

  printPDF(form: SecretariatForm): void {
    this.secretariatService.downloadPDF(form.id).subscribe({
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

  downloadPDF(form: SecretariatForm): void {
    const filename = `${form.formNumber}-${form.employeeName}.pdf`;
    this.secretariatService.triggerPDFDownload(form.id, filename);
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
  // STATUS MANAGEMENT
  // ============================================

  openStatusModal(form: SecretariatForm): void {
    this.selectedForm = form;
    this.newStatus = form.status;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedForm = null;
  }

  updateStatus(): void {
    if (!this.selectedForm) return;

    this.secretariatService.updateFormStatus(this.selectedForm.id, this.newStatus).subscribe({
      next: (response) => {
        const successMsg = this.formLanguage === 'ar'
          ? 'تم تحديث الحالة بنجاح'
          : 'Status updated successfully';
        this.showToast('success', successMsg);
        this.closeStatusModal();
        this.loadForms();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء تحديث الحالة'
          : 'Error updating status';
        this.showToast('error', errorMsg);
      }
    });
  }

  // ============================================
  // DELETE FORM
  // ============================================

  openDeleteModal(form: SecretariatForm): void {
    this.selectedForm = form;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedForm = null;
  }

  confirmDelete(): void {
    if (!this.selectedForm) return;

    this.deletingForm = true;

    this.secretariatService.deleteForm(this.selectedForm.id).subscribe({
      next: (response) => {
        const successMsg = this.formLanguage === 'ar'
          ? 'تم حذف النموذج بنجاح'
          : 'Form deleted successfully';
        this.showToast('success', successMsg);
        this.deletingForm = false;
        this.closeDeleteModal();
        this.loadForms();
      },
      error: (error) => {
        console.error('Error deleting form:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء حذف النموذج'
          : 'Error deleting form';
        this.showToast('error', errorMsg);
        this.deletingForm = false;
      }
    });
  }

  // ============================================
  // FILTERS & SEARCH
  // ============================================

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadForms();
  }

  onSearchChange(): void {
    if (this.searchTerm.length >= 3 || this.searchTerm.length === 0) {
      this.currentPage = 1;
      this.loadForms();
    }
  }

  clearFilters(): void {
    this.selectedFormType = '';
    this.selectedStatus = '';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadForms();
  }

  // ============================================
  // PAGINATION
  // ============================================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadForms();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatDate(dateString: string): string {
    return this.secretariatService.formatDate(dateString);
  }

  getFormTypeLabel(formType: string): string {
    return this.formLanguage === 'ar'
      ? this.secretariatService.getFormTypeLabel(formType)
      : this.secretariatService.getFormTypeLabelEn(formType);
  }

  getFormTypeLabelEn(formType: string): string {
    return this.secretariatService.getFormTypeLabelEn(formType);
  }

  getStatusLabel(status: string): string {
    return this.formLanguage === 'ar'
      ? this.secretariatService.getStatusLabel(status)
      : this.secretariatService.getStatusLabelEn(status);
  }

  getStatusColor(status: string): string {
    return this.secretariatService.getStatusColor(status);
  }

  getFormTypeIcon(formType: string): string {
    return this.secretariatService.getFormTypeIcon(formType);
  }

  getFormTypeColor(formType: string): string {
    return this.secretariatService.getFormTypeColor(formType);
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees.find(e => e.id === employeeId);
    return employee ? employee.name : employeeId;
  }
}
