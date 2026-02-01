// src/app/core/services/rfq.service.ts - UPDATED INTERFACE WITH NEW FIELDS

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

/**
 * RFQ Item Interface - UPDATED WITH NEW FIELDS
 */
export interface RFQItem {
  description: string;
  unit: string;
  quantity: number | string;
  taskNo?: string | null;
  jobNo?: string | null;
  estimatedUnitPrice?: number | string | null;
  totalPrice?: number | string | null;
}

/**
 * RFQ Interface
 */
export interface RFQ {
  id: string;
  rfqNumber: string;
  date: string;
  time: string;
  requester: string;
  production: string;
  supplier: string;
  supplierAddress: string;
  urgent: boolean;
  items: RFQItem[];
  notes?: string;
  includeStaticFile?: boolean;  // ✅ ADD THIS LINE
  language?: string;
  status: 'pending' | 'approved' | 'rejected';
  pdfFilename?: string;
  pdfLanguage?: string;
  pdfGeneratedAt?: string;
  pdfMerged?: boolean;
  pdfPageCount?: {
    generated?: number;
    attachment?: number;
    total?: number;
  };
  createdBy: string;
  createdByName?: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * RFQ List Response Interface
 */
export interface RFQResponse {
  success: boolean;
  data: RFQ[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRFQs: number;
    limit: number;
  };
  userRole?: string;
}

/**
 * Single RFQ Response Interface
 */
export interface SingleRFQResponse {
  success: boolean;
  data: RFQ;
}

/**
 * Create RFQ Data Interface
 */
export interface CreateRFQData {
  date: string;
  time: string;
  requester: string;
  production: string;
  supplier: string;
  supplierAddress: string;
  urgent: boolean;
  items: RFQItem[];
  notes?: string;
  includeStaticFile?: boolean;  // ✅ ADD THIS LINE
}

/**
 * PDF Generation Response Interface
 */
export interface PDFGenerateResponse {
  success: boolean;
  message: string;
  data: {
    rfqId: string;
    rfqNumber: string;
    pdfFilename: string;
    language: string;
    downloadUrl: string;
    merged: boolean;
    pageCount?: {
      generated?: number;
      attachment?: number;
      total?: number;
    };
    mergeError?: string;
    warning?: string;
  };
}

/**
 * RFQ Statistics Response Interface
 */
export interface RFQStatsResponse {
  success: boolean;
  data: {
    totalRFQs: number;
    pending: number;
    approved: number;
    rejected: number;
    urgent: number;
    thisMonth: number;
    thisWeek: number;
    today: number;
  };
}

/**
 * Reset Counter Response Interface
 */
export interface ResetCounterResponse {
  success: boolean;
  message: string;
  data: {
    oldCounter: number;
    newCounter: number;
    deletedRFQs: number;
    nextRFQNumber: string;
    message: string;
  };
}

/**
 * RFQ Service
 */
@Injectable({
  providedIn: 'root'
})
export class RfqService {
  getStatistics: any;
  constructor(private http: HttpClient) {}

  getAllRFQs(filters?: {
    rfqNumber?: string;
    startDate?: string;
    endDate?: string;
    supplier?: string;
    production?: string;
    status?: string;
    urgent?: string | boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<RFQResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.rfqNumber) params = params.set('rfqNumber', filters.rfqNumber);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.supplier) params = params.set('supplier', filters.supplier);
      if (filters.production) params = params.set('production', filters.production);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.urgent !== undefined) {
        const urgentValue = typeof filters.urgent === 'boolean'
          ? filters.urgent.toString()
          : filters.urgent;
        params = params.set('urgent', urgentValue);
      }
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<RFQResponse>(API_ENDPOINTS.RFQ.GET_ALL, { params });
  }

  getRFQById(id: string): Observable<SingleRFQResponse> {
    return this.http.get<SingleRFQResponse>(API_ENDPOINTS.RFQ.GET_BY_ID(id));
  }

  createRFQ(data: CreateRFQData): Observable<SingleRFQResponse> {
    return this.http.post<SingleRFQResponse>(API_ENDPOINTS.RFQ.CREATE, data);
  }

  updateRFQ(id: string, data: Partial<CreateRFQData>): Observable<SingleRFQResponse> {
    return this.http.put<SingleRFQResponse>(API_ENDPOINTS.RFQ.UPDATE(id), data);
  }

  deleteRFQ(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(API_ENDPOINTS.RFQ.DELETE(id));
  }

  generatePDF(id: string, attachmentFile?: File): Observable<PDFGenerateResponse> {
    const formData = new FormData();

    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }

    return this.http.post<PDFGenerateResponse>(API_ENDPOINTS.RFQ.GENERATE_PDF(id), formData);
  }

  getRFQStats(): Observable<RFQStatsResponse> {
    return this.http.get<RFQStatsResponse>(API_ENDPOINTS.RFQ.GET_STATS);
  }

  resetCounter(): Observable<ResetCounterResponse> {
    return this.http.post<ResetCounterResponse>(API_ENDPOINTS.RFQ.RESET_COUNTER, {});
  }

  openPrintDialog(id: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = API_ENDPOINTS.RFQ.DOWNLOAD_PDF(id);

    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load PDF');
      }
      return response.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (error) {
            console.error('Print error:', error);
            window.open(blobUrl, '_blank');
          }
        }, 250);
      };

      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    })
    .catch(error => {
      console.error('Error loading PDF for print:', error);
      alert('Failed to load PDF for printing. Please try again.');
    });
  }

  getPDFBlob(id: string): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.RFQ.DOWNLOAD_PDF(id), {
      responseType: 'blob'
    });
  }

  viewPDFInNewTab(id: string, autoPrint: boolean = false): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = API_ENDPOINTS.RFQ.DOWNLOAD_PDF(id);

    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load PDF');
      }
      return response.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');

      if (autoPrint && newWindow) {
        newWindow.onload = () => {
          setTimeout(() => {
            newWindow.print();
          }, 500);
        };
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    })
    .catch(error => {
      console.error('Error viewing PDF:', error);
      alert('Failed to view PDF. Please try again.');
    });
  }

  viewPDF(id: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = API_ENDPOINTS.RFQ.DOWNLOAD_PDF(id);

    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load PDF');
      }
      return response.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    })
    .catch(error => {
      console.error('Error viewing PDF:', error);
      alert('Failed to view PDF. Please try again.');
    });
  }

  downloadPDF(id: string, pdfFilename: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = API_ENDPOINTS.RFQ.DOWNLOAD_PDF(id);

    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pdfFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    })
    .catch(error => {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    });
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    return timeString;
  }

  isUrgent(rfq: RFQ): boolean {
    return rfq.urgent === true;
  }

  hasPDF(rfq: RFQ): boolean {
    return !!rfq.pdfFilename;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
      default:
        return 'status-pending';
    }
  }

  getStatusText(status: string, language: 'ar' | 'en' = 'en'): string {
    if (language === 'ar') {
      switch (status) {
        case 'approved':
          return 'موافق عليه';
        case 'rejected':
          return 'مرفوض';
        case 'pending':
        default:
          return 'قيد الانتظار';
      }
    }

    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      default:
        return 'Pending';
    }
  }

  /**
   * Calculate total price for all items
   * ✅ NEW METHOD
   */
  calculateTotalPrice(items: RFQItem[]): number {
    if (!items || items.length === 0) return 0;

    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity.toString()) || 0;
      const price = parseFloat((item.estimatedUnitPrice || '0').toString()) || 0;
      return total + (quantity * price);
    }, 0);
  }

  validateRFQData(data: CreateRFQData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.date) errors.push('Date is required');
    if (!data.time) errors.push('Time is required');
    if (!data.requester || data.requester.trim() === '') errors.push('Requester is required');
    if (!data.production || data.production.trim() === '') errors.push('Production/Department is required');
    if (!data.supplier || data.supplier.trim() === '') errors.push('Supplier is required');
    if (!data.supplierAddress || data.supplierAddress.trim() === '') errors.push('Supplier Address is required');

    if (!data.items || data.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      data.items.forEach((item, index) => {
        if (!item.description || item.description.trim() === '') {
          errors.push(`Item ${index + 1}: Description is required`);
        }
        if (!item.unit || item.unit.trim() === '') {
          errors.push(`Item ${index + 1}: Unit is required`);
        }
        if (!item.quantity || item.quantity.toString().trim() === '') {
          errors.push(`Item ${index + 1}: Quantity is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  createEmptyItem(): RFQItem {
    return {
      description: '',
      unit: '',
      quantity: '',
      taskNo: '',
      jobNo: '',
      estimatedUnitPrice: '',
      totalPrice: '0.00'
    };
  }

  cloneRFQ(rfq: RFQ): CreateRFQData {
    return {
      date: rfq.date,
      time: rfq.time,
      requester: rfq.requester,
      production: rfq.production,
      supplier: rfq.supplier,
      supplierAddress: rfq.supplierAddress,
      urgent: rfq.urgent,
      items: JSON.parse(JSON.stringify(rfq.items)),
      notes: rfq.notes || ''
    };
  }

  hasChanges(original: RFQ, modified: CreateRFQData): boolean {
    if (original.date !== modified.date) return true;
    if (original.time !== modified.time) return true;
    if (original.requester !== modified.requester) return true;
    if (original.production !== modified.production) return true;
    if (original.supplier !== modified.supplier) return true;
    if (original.supplierAddress !== modified.supplierAddress) return true;
    if (original.urgent !== modified.urgent) return true;
    if ((original.notes || '') !== (modified.notes || '')) return true;

    if (original.items.length !== modified.items.length) return true;

    for (let i = 0; i < original.items.length; i++) {
      const origItem = original.items[i];
      const modItem = modified.items[i];

      if (origItem.description !== modItem.description) return true;
      if (origItem.unit !== modItem.unit) return true;
      if (origItem.quantity.toString() !== modItem.quantity.toString()) return true;
      if ((origItem.taskNo || '').toString() !== (modItem.taskNo || '').toString()) return true;
      if ((origItem.jobNo || '').toString() !== (modItem.jobNo || '').toString()) return true;
      if ((origItem.estimatedUnitPrice || '').toString() !== (modItem.estimatedUnitPrice || '').toString()) return true;
    }

    return false;
  }

  filterByStatus(rfqs: RFQ[], status: 'pending' | 'approved' | 'rejected'): RFQ[] {
    return rfqs.filter(rfq => rfq.status === status);
  }

  filterUrgent(rfqs: RFQ[]): RFQ[] {
    return rfqs.filter(rfq => rfq.urgent === true);
  }

  sortByDateDesc(rfqs: RFQ[]): RFQ[] {
    return [...rfqs].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  sortByDateAsc(rfqs: RFQ[]): RFQ[] {
    return [...rfqs].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
  }

  searchRFQs(rfqs: RFQ[], searchTerm: string): RFQ[] {
    if (!searchTerm || searchTerm.trim() === '') return rfqs;

    const term = searchTerm.toLowerCase().trim();

    return rfqs.filter(rfq =>
      rfq.rfqNumber.toLowerCase().includes(term) ||
      rfq.requester.toLowerCase().includes(term) ||
      rfq.production.toLowerCase().includes(term) ||
      rfq.supplier.toLowerCase().includes(term) ||
      rfq.supplierAddress.toLowerCase().includes(term) ||
      (rfq.notes && rfq.notes.toLowerCase().includes(term))
    );
  }
}
