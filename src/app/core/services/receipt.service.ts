// src/core/services/receipt.service.ts
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
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
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
  additionalText?: string;
  items: ReceiptItem[];
  notes?: string;
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
 * Receipt Service
 * Note: HttpClient automatically uses the auth interceptor to add Authorization header
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
   * Delete receipt (super_admin only)
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
   * Download PDF (triggers browser download)
   */
  downloadPDF(id: string): void {
    const token = localStorage.getItem('token');
    const url = token 
      ? `${this.API_URL}/${id}/download-pdf?token=${token}`
      : `${this.API_URL}/${id}/download-pdf`;
    window.open(url, '_blank');
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