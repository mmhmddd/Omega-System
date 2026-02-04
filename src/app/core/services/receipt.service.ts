// src/core/services/receipt.service.ts - UPDATED WITH EMAIL SENDING

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

/**
 * Receipt Item Interface
 */
export interface ReceiptItem {
  quantity: number | string;
  description: string;
  element: string;
}

/**
 * Receipt Interface
 */
export interface Receipt {
  id: string;
  receiptNumber: string;
  to: string;
  date: string;
  address?: string;
  addressTitle?: string;
  attention?: string;
  projectCode?: string;
  workLocation?: string;
  companyNumber?: string;
  vehicleNumber?: string;
  additionalText?: string;
  items: ReceiptItem[];
  notes?: string;
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
  includeStaticFile?: boolean;
}

/**
 * Receipt List Response Interface
 */
export interface ReceiptResponse {
  success: boolean;
  data: Receipt[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReceipts: number;
    limit: number;
  };
  userRole?: string;
}

/**
 * Single Receipt Response Interface
 */
export interface SingleReceiptResponse {
  success: boolean;
  data: Receipt;
}

/**
 * Create Receipt Data Interface
 */
export interface CreateReceiptData {
  to: string;
  date?: string;
  address?: string;
  addressTitle?: string;
  attention?: string;
  projectCode?: string;
  workLocation?: string;
  companyNumber?: string;
  vehicleNumber?: string;
  additionalText?: string;
  items: ReceiptItem[];
  notes?: string;
  includeStaticFile?: boolean;
}

/**
 * PDF Generation Response Interface
 */
export interface PDFGenerateResponse {
  success: boolean;
  message: string;
  data: {
    receiptId: string;
    receiptNumber: string;
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
 * Email Send Response Interface
 */
export interface EmailSendResponse {
  success: boolean;
  message: string;
}

/**
 * Receipt Service
 */
@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly API_URL = `${environment.apiUrl}/receipts`;

  constructor(private http: HttpClient) {}

  /**
   * Get all receipts with optional filters and pagination
   */
  getAllReceipts(filters?: {
    receiptNumber?: string;
    startDate?: string;
    endDate?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ReceiptResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.receiptNumber) params = params.set('receiptNumber', filters.receiptNumber);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.to) params = params.set('to', filters.to);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<ReceiptResponse>(this.API_URL, { params });
  }

  /**
   * Get receipt by ID
   */
  getReceiptById(id: string): Observable<SingleReceiptResponse> {
    return this.http.get<SingleReceiptResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Create new receipt
   */
  createReceipt(data: CreateReceiptData): Observable<SingleReceiptResponse> {
    return this.http.post<SingleReceiptResponse>(this.API_URL, data);
  }

  /**
   * Update existing receipt
   */
  updateReceipt(id: string, data: Partial<CreateReceiptData>): Observable<SingleReceiptResponse> {
    return this.http.put<SingleReceiptResponse>(`${this.API_URL}/${id}`, data);
  }

  /**
   * Delete receipt
   */
  deleteReceipt(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  /**
   * Generate PDF for receipt with optional attachment
   */
  generatePDF(id: string, attachmentFile?: File): Observable<PDFGenerateResponse> {
    const formData = new FormData();
    
    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }

    return this.http.post<PDFGenerateResponse>(`${this.API_URL}/${id}/generate-pdf`, formData);
  }

  /**
   * ✅ Send receipt PDF by email
   */
  sendReceiptByEmail(id: string, email: string): Observable<EmailSendResponse> {
    return this.http.post<EmailSendResponse>(`${this.API_URL}/${id}/send-email`, { email });
  }

  /**
   * Open print dialog for PDF
   */
  openPrintDialog(id: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = `${this.API_URL}/${id}/download-pdf`;
    
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

  /**
   * Get PDF as Blob for viewer
   */
  getPDFBlob(id: string): Observable<Blob> {
    const url = `${this.API_URL}/${id}/download-pdf`;
    return this.http.get(url, { 
      responseType: 'blob'
    });
  }

  /**
   * View PDF in new tab with auto-print option
   */
  viewPDFInNewTab(id: string, autoPrint: boolean = false): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = `${this.API_URL}/${id}/download-pdf`;
    
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

  /**
   * View PDF in new tab
   */
  viewPDF(id: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = `${this.API_URL}/${id}/download-pdf`;
    
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

  /**
   * Download PDF
   */
  downloadPDF(id: string, pdfFilename: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    const url = `${this.API_URL}/${id}/download-pdf`;
    
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

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}