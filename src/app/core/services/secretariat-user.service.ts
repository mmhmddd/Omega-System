import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import API_ENDPOINTS from '../constants/api-endpoints';

// ============================================
// INTERFACES
// ============================================

export interface UserForm {
  id: string;
  formNumber: string;
  formType: 'departure' | 'vacation' | 'advance' | 'account_statement';
  employeeId: string;
  employeeName: string;
  projectName?: string;
  date: string;
  createdBy: string;
  createdByRole: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  pdfPath?: string;
}

export interface CreateUserFormData {
  formType: 'departure' | 'vacation' | 'advance' | 'account_statement';
  projectName?: string;
  date?: string;
}

export interface FormType {
  value: string;
  label: string;
  code: string;
  icon: string;
  color: string;
}

export interface UserFormsResponse {
  success: boolean;
  data: UserForm[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalForms: number;
    limit: number;
  };
}

export interface UserFormResponse {
  success: boolean;
  data: UserForm;
  message?: string;
}

export interface FormTypesResponse {
  success: boolean;
  data: {
    formTypes: FormType[];
  };
}

export interface Notification {
  id: string;
  formId: string;
  formNumber: string;
  formType: string;
  message: string;
  createdBy: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
}

// ============================================
// SERVICE
// ============================================

@Injectable({
  providedIn: 'root'
})
export class SecretariatUserService {

  constructor(private http: HttpClient) { }

  // ============================================
  // FORM MANAGEMENT (USER)
  // ============================================

  /**
   * Create a new form for the current user
   */
  createUserForm(formData: CreateUserFormData): Observable<UserFormResponse> {
    return this.http.post<UserFormResponse>(
      API_ENDPOINTS.SECRETARIAT_USER.CREATE_FORM,
      formData
    );
  }

  /**
   * Get all forms created by the current user
   */
  getMyForms(filters?: {
    formType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<UserFormsResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.formType) params = params.set('formType', filters.formType);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<UserFormsResponse>(
      API_ENDPOINTS.SECRETARIAT_USER.GET_MY_FORMS,
      { params }
    );
  }

  /**
   * Get form by ID
   */
  getFormById(id: string): Observable<UserFormResponse> {
    return this.http.get<UserFormResponse>(
      API_ENDPOINTS.SECRETARIAT_USER.GET_FORM_BY_ID(id)
    );
  }

  /**
   * Download PDF
   */
  downloadPDF(id: string): Observable<Blob> {
    return this.http.get(
      API_ENDPOINTS.SECRETARIAT_USER.DOWNLOAD_PDF(id),
      { responseType: 'blob' }
    );
  }

  /**
   * Get available form types
   */
  getFormTypes(): Observable<FormTypesResponse> {
    return this.http.get<FormTypesResponse>(
      API_ENDPOINTS.SECRETARIAT_USER.GET_FORM_TYPES
    );
  }

  // ============================================
  // NOTIFICATION MANAGEMENT
  // ============================================

  /**
   * Get all notifications for current user
   */
  getNotifications(): Observable<NotificationsResponse> {
    return this.http.get<NotificationsResponse>(
      API_ENDPOINTS.SECRETARIAT_USER.GET_NOTIFICATIONS
    );
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(id: string): Observable<{ success: boolean; data: Notification }> {
    return this.http.patch<{ success: boolean; data: Notification }>(
      API_ENDPOINTS.SECRETARIAT_USER.MARK_NOTIFICATION_READ(id),
      {}
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      API_ENDPOINTS.SECRETARIAT_USER.MARK_ALL_NOTIFICATIONS_READ,
      {}
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Trigger PDF download
   */
  triggerPDFDownload(id: string, filename: string): void {
    this.downloadPDF(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
      }
    });
  }

  /**
   * Format date to display
   */
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Get form type label in Arabic
   */
  getFormTypeLabel(formType: string): string {
    const labels: { [key: string]: string } = {
      'departure': 'طلب مغادرة',
      'vacation': 'طلب إجازة',
      'advance': 'طلب سلفة',
      'account_statement': 'كشف حساب'
    };
    return labels[formType] || formType;
  }

  /**
   * Get form type label in English
   */
  getFormTypeLabelEn(formType: string): string {
    const labels: { [key: string]: string } = {
      'departure': 'Departure Request',
      'vacation': 'Vacation Request',
      'advance': 'Advance Request',
      'account_statement': 'Account Statement'
    };
    return labels[formType] || formType;
  }

  /**
   * Get status label in Arabic
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'قيد الانتظار',
      'approved': 'معتمد',
      'rejected': 'مرفوض'
    };
    return labels[status] || status;
  }

  /**
   * Get status label in English
   */
  getStatusLabelEn(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return labels[status] || status;
  }

  /**
   * Get status color class
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected'
    };
    return colors[status] || '';
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Get form type icon
   */
  getFormTypeIcon(formType: string): string {
    const icons: { [key: string]: string } = {
      'departure': 'bi-box-arrow-right',
      'vacation': 'bi-calendar-event',
      'advance': 'bi-cash-coin',
      'account_statement': 'bi-file-earmark-text'
    };
    return icons[formType] || 'bi-file-earmark';
  }

  /**
   * Get form type color
   */
  getFormTypeColor(formType: string): string {
    const colors: { [key: string]: string } = {
      'departure': '#ef4444',
      'vacation': '#3b82f6',
      'advance': '#22c55e',
      'account_statement': '#f59e0b'
    };
    return colors[formType] || '#64748b';
  }

  /**
   * Validate form type
   */
  validateFormType(formType: string): boolean {
    const validTypes = ['departure', 'vacation', 'advance', 'account_statement'];
    return validTypes.includes(formType);
  }

  /**
   * Create empty form data
   */
  createEmptyFormData(): CreateUserFormData {
    return {
      formType: 'departure',
      projectName: '',
      date: this.getTodayDate()
    };
  }

  /**
   * Format notification time
   */
  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  }
}
