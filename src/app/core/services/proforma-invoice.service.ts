import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

// ============================================
// INTERFACES
// ============================================

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface ProformaInvoiceItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface ProformaInvoice {
  [x: string]: any;
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string | null;
  clientCity?: string | null;
  projectName?: string | null;
  date: string;
  revNumber: string;
  validForDays?: number | null;
  language: 'arabic' | 'english';
  includeTax: boolean;
  taxRate: number;
  items: ProformaInvoiceItem[];
  customNotes?: string | null;
  includeStaticFile?: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  pdfPath: string;
  attachmentPath?: string | null;
  createdBy: string;
  createdByName?: string;
  createdByInfo?: UserInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProformaInvoiceData {
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  projectName?: string;
  date: string;
  revNumber?: string;
  validForDays?: number;
  language?: 'arabic' | 'english';
  includeTax?: boolean;
  taxRate?: number;
  items: ProformaInvoiceItem[];
  customNotes?: string;
  includeStaticFile?: boolean;
  attachment?: File;
}

export interface UpdateProformaInvoiceData {
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  projectName?: string;
  date?: string;
  revNumber?: string;
  validForDays?: number;
  language?: 'arabic' | 'english';
  includeTax?: boolean;
  taxRate?: number;
  items?: ProformaInvoiceItem[];
  customNotes?: string;
  includeStaticFile?: boolean;
  attachment?: File;
}

export interface ProformaInvoicesListResponse {
  success: boolean;
  data: ProformaInvoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalInvoices: number;
    limit: number;
  };
}

export interface ProformaInvoiceResponse {
  success: boolean;
  message?: string;
  data: ProformaInvoice;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface ProformaInvoicesFilters {
  search?: string;
  page?: number;
  limit?: number;
  createdBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProformaInvoiceService {

  constructor(private http: HttpClient) { }

  // ============================================
  // PRIVATE: GET AUTH HEADERS
  // ============================================

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getMultipartHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getCreatorName(invoice: ProformaInvoice): string {
    if (invoice.createdByName && invoice.createdByName.trim() !== '' && invoice.createdByName !== 'Unknown User') {
      return invoice.createdByName;
    }

    if (invoice.createdByInfo) {
      return invoice.createdByInfo.name || invoice.createdByInfo.username;
    }

    return invoice.createdBy || '-';
  }

  getCreatorEmail(invoice: ProformaInvoice): string {
    return invoice.createdByInfo?.email || 'N/A';
  }

  getCreatorUsername(invoice: ProformaInvoice): string {
    return invoice.createdByInfo?.username || invoice.createdBy;
  }

  // ============================================
  // CREATE PROFORMA INVOICE
  // ============================================

  createProformaInvoice(invoiceData: CreateProformaInvoiceData): Observable<ProformaInvoiceResponse> {
    const formData = new FormData();

    formData.append('clientName', invoiceData.clientName);
    formData.append('clientPhone', invoiceData.clientPhone);
    formData.append('date', invoiceData.date);

    if (invoiceData.clientAddress) {
      formData.append('clientAddress', invoiceData.clientAddress);
    }
    if (invoiceData.clientCity) {
      formData.append('clientCity', invoiceData.clientCity);
    }
    if (invoiceData.projectName) {
      formData.append('projectName', invoiceData.projectName);
    }
    if (invoiceData.revNumber) {
      formData.append('revNumber', invoiceData.revNumber);
    }
    if (invoiceData.validForDays) {
      formData.append('validForDays', invoiceData.validForDays.toString());
    }

    formData.append('language', invoiceData.language || 'arabic');

    formData.append('includeTax', (invoiceData.includeTax || false).toString());
    if (invoiceData.includeTax === true && invoiceData.taxRate && invoiceData.taxRate > 0) {
      formData.append('taxRate', invoiceData.taxRate.toString());
    }

    formData.append('items', JSON.stringify(invoiceData.items));

    if (invoiceData.customNotes) {
      formData.append('customNotes', invoiceData.customNotes);
    }

    if (invoiceData.includeStaticFile !== undefined) {
      formData.append('includeStaticFile', invoiceData.includeStaticFile.toString());
    }

    if (invoiceData.attachment) {
      formData.append('attachment', invoiceData.attachment, invoiceData.attachment.name);
    }

    return this.http.post<ProformaInvoiceResponse>(
      API_ENDPOINTS.PROFORMA_INVOICES.CREATE,
      formData,
      { headers: this.getMultipartHeaders() }
    );
  }

  // ============================================
  // GET PROFORMA INVOICES
  // ============================================

  getAllProformaInvoices(filters?: ProformaInvoicesFilters): Observable<ProformaInvoicesListResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
      if (filters.createdBy) {
        params = params.set('createdBy', filters.createdBy);
      }
    }

    return this.http.get<ProformaInvoicesListResponse>(
      API_ENDPOINTS.PROFORMA_INVOICES.GET_ALL,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  getMyLatestInvoice(): Observable<ProformaInvoiceResponse> {
    return this.http.get<ProformaInvoiceResponse>(
      API_ENDPOINTS.PROFORMA_INVOICES.GET_MY_LATEST,
      { headers: this.getAuthHeaders() }
    );
  }

  getProformaInvoiceById(id: string): Observable<ProformaInvoiceResponse> {
    return this.http.get<ProformaInvoiceResponse>(
      API_ENDPOINTS.PROFORMA_INVOICES.GET_BY_ID(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE PROFORMA INVOICE
  // ============================================

  updateProformaInvoice(id: string, updateData: UpdateProformaInvoiceData): Observable<ProformaInvoiceResponse> {
    const formData = new FormData();

    if (updateData.clientName) {
      formData.append('clientName', updateData.clientName);
    }
    if (updateData.clientPhone) {
      formData.append('clientPhone', updateData.clientPhone);
    }
    if (updateData.clientAddress !== undefined) {
      formData.append('clientAddress', updateData.clientAddress || '');
    }
    if (updateData.clientCity !== undefined) {
      formData.append('clientCity', updateData.clientCity || '');
    }
    if (updateData.projectName !== undefined) {
      formData.append('projectName', updateData.projectName || '');
    }
    if (updateData.date) {
      formData.append('date', updateData.date);
    }
    if (updateData.revNumber !== undefined) {
      formData.append('revNumber', updateData.revNumber);
    }
    if (updateData.validForDays !== undefined) {
      formData.append('validForDays', updateData.validForDays.toString());
    }
    if (updateData.language) {
      formData.append('language', updateData.language);
    }
    if (updateData.includeTax !== undefined) {
      formData.append('includeTax', updateData.includeTax.toString());
    }
    if (updateData.includeTax === true && updateData.taxRate !== undefined && updateData.taxRate > 0) {
      formData.append('taxRate', updateData.taxRate.toString());
    }
    if (updateData.items) {
      formData.append('items', JSON.stringify(updateData.items));
    }
    if (updateData.customNotes !== undefined) {
      formData.append('customNotes', updateData.customNotes);
    }

    if (updateData.includeStaticFile !== undefined) {
      formData.append('includeStaticFile', updateData.includeStaticFile.toString());
    }

    if (updateData.attachment) {
      formData.append('attachment', updateData.attachment, updateData.attachment.name);
    }

    return this.http.put<ProformaInvoiceResponse>(
      API_ENDPOINTS.PROFORMA_INVOICES.UPDATE(id),
      formData,
      { headers: this.getMultipartHeaders() }
    );
  }

  // ============================================
  // DELETE PROFORMA INVOICE
  // ============================================

  deleteProformaInvoice(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(
      API_ENDPOINTS.PROFORMA_INVOICES.DELETE(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DOWNLOAD PDF
  // ============================================

  downloadPDF(id: string): Observable<Blob> {
    return this.http.get(
      API_ENDPOINTS.PROFORMA_INVOICES.DOWNLOAD_PDF(id),
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }

  triggerPDFDownload(id: string, filename?: string): void {
    this.downloadPDF(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `invoice-${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  calculateTotals(items: ProformaInvoiceItem[], includeTax: boolean, taxRate: number): {
    subtotal: number;
    taxAmount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    let taxAmount = 0;
    if (includeTax && taxRate) {
      taxAmount = (subtotal * taxRate) / 100;
    }

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat((subtotal + taxAmount).toFixed(2))
    };
  }

  validateInvoiceItem(item: ProformaInvoiceItem): boolean {
    return !!(
      item.description &&
      item.description.trim() !== '' &&
      item.quantity !== undefined &&
      item.quantity > 0 &&
      item.unitPrice !== undefined &&
      item.unitPrice >= 0
    );
  }

  validateInvoiceItems(items: ProformaInvoiceItem[]): boolean {
    if (!items || items.length === 0) {
      return false;
    }
    return items.every(item => this.validateInvoiceItem(item));
  }

  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  formatCurrency(amount: number): string {
    return `JOD ${amount.toFixed(2)}`;
  }

  getLanguageLabel(language: 'arabic' | 'english'): string {
    return language === 'arabic' ? 'عربي' : 'إنجليزي';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  createEmptyInvoiceItem(): ProformaInvoiceItem {
    return {
      description: '',
      unit: '',
      quantity: 0,
      unitPrice: 0
    };
  }

  validatePDFFile(file: File): { valid: boolean; error?: string } {
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'يجب أن يكون الملف من نوع PDF'
      };
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'حجم الملف يجب أن لا يتجاوز 10 ميجابايت'
      };
    }

    return { valid: true };
  }

  generateInvoiceNumberPreview(lastNumber: string): string {
    const match = lastNumber.match(/PI(\d+)/);
    if (!match) return 'PI0001';

    const number = parseInt(match[1]) + 1;
    return `PI${number.toString().padStart(4, '0')}`;
  }
}
