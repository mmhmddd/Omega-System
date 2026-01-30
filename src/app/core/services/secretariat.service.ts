import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import API_ENDPOINTS from '../constants/api-endpoints';

// ============================================
// INTERFACES
// ============================================

export interface SecretariatForm {
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
  source?: 'secretariat' | 'user'; // NEW: indicates where form was created
}

export interface CreateFormData {
  employeeId: string;
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

export interface FormsResponse {
  success: boolean;
  data: SecretariatForm[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalForms: number;
    limit: number;
  };
}

export interface FormResponse {
  success: boolean;
  data: SecretariatForm;
  message?: string;
}

export interface FormTypesResponse {
  success: boolean;
  data: {
    formTypes: FormType[];
  };
}

export interface Employee {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
}

export interface EmployeesResponse {
  success: boolean;
  data: Employee[];
}

// ============================================
// SERVICE
// ============================================

@Injectable({
  providedIn: 'root'
})
export class SecretariatService {

  constructor(private http: HttpClient) { }

  // ============================================
  // API CALLS
  // ============================================

  /**
   * NEW: Get all employees for selection
   */
  getAllEmployees(): Observable<EmployeesResponse> {
    return this.http.get<EmployeesResponse>(API_ENDPOINTS.SECRETARIAT.GET_ALL_EMPLOYEES);
  }

  /**
   * UPDATED: Get all forms (includes both secretariat and user forms)
   */
  getAllForms(filters?: {
    formType?: string;
    employeeId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<FormsResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.formType) params = params.set('formType', filters.formType);
      if (filters.employeeId) params = params.set('employeeId', filters.employeeId);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<FormsResponse>(API_ENDPOINTS.SECRETARIAT.GET_ALL_FORMS, { params });
  }

  /**
   * Get form by ID
   */
  getFormById(id: string): Observable<FormResponse> {
    return this.http.get<FormResponse>(API_ENDPOINTS.SECRETARIAT.GET_FORM_BY_ID(id));
  }

  /**
   * Create a new form
   */
  createForm(formData: CreateFormData): Observable<FormResponse> {
    return this.http.post<FormResponse>(API_ENDPOINTS.SECRETARIAT.CREATE_FORM, formData);
  }

  /**
   * Update form status (works for both secretariat and user forms)
   */
  updateFormStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Observable<FormResponse> {
    return this.http.patch<FormResponse>(
      API_ENDPOINTS.SECRETARIAT.UPDATE_FORM_STATUS(id),
      { status }
    );
  }

  /**
   * Delete form
   */
  deleteForm(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      API_ENDPOINTS.SECRETARIAT.DELETE_FORM(id)
    );
  }

  /**
   * Download PDF
   */
  downloadPDF(id: string): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.SECRETARIAT.DOWNLOAD_PDF(id), {
      responseType: 'blob'
    });
  }

  /**
   * Get available form types
   */
  getFormTypes(): Observable<FormTypesResponse> {
    return this.http.get<FormTypesResponse>(API_ENDPOINTS.SECRETARIAT.GET_FORM_TYPES);
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
      'departure': 'نموذج مغادرة',
      'vacation': 'نموذج إجازة',
      'advance': 'نموذج سلفة',
      'account_statement': 'كشف حساب'
    };
    return labels[formType] || formType;
  }

  /**
   * Get form type label in English
   */
  getFormTypeLabelEn(formType: string): string {
    const labels: { [key: string]: string } = {
      'departure': 'Departure Form',
      'vacation': 'Vacation Form',
      'advance': 'Advance Form',
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
   * Get form source badge label
   */
  getFormSourceLabel(source: string): string {
    const labels: { [key: string]: string } = {
      'secretariat': 'سكرتارية',
      'user': 'موظف'
    };
    return labels[source] || source;
  }

  /**
   * Get form source badge color
   */
  getFormSourceColor(source: string): string {
    const colors: { [key: string]: string } = {
      'secretariat': '#7c3aed',
      'user': '#0891b2'
    };
    return colors[source] || '#64748b';
  }

  /**
   * Validate employee ID
   */
  validateEmployeeId(employeeId: string): boolean {
    return !!(employeeId && employeeId.trim().length > 0);
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
  createEmptyFormData(): CreateFormData {
    return {
      employeeId: '',
      formType: 'departure',
      projectName: '',
      date: this.getTodayDate()
    };
  }
}
