// src/core/services/purchase.service.ts - COMPLETE PURCHASE SERVICE

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

/**
 * Purchase Order Item Interface
 */
export interface POItem {
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
}

/**
 * Purchase Order Interface
 */
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  supplierAddress?: string;
  supplierPhone?: string;
  receiver: string;
  receiverCity?: string;
  receiverAddress?: string;
  receiverPhone?: string;
  tableHeaderText?: string;
  taxRate: number;
  items: POItem[];
  notes?: string;
  language: 'ar' | 'en';
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
 * Purchase Order List Response Interface
 */
export interface PurchaseOrderResponse {
  success: boolean;
  data: PurchaseOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPOs: number;
    limit: number;
  };
  userRole?: string;
}

/**
 * Single Purchase Order Response Interface
 */
export interface SinglePurchaseOrderResponse {
  success: boolean;
  data: PurchaseOrder;
}

/**
 * Create Purchase Order Data Interface
 */
export interface CreatePurchaseOrderData {
  date?: string;
  supplier: string;
  supplierAddress?: string;
  supplierPhone?: string;
  receiver: string;
  receiverCity?: string;
  receiverAddress?: string;
  receiverPhone?: string;
  tableHeaderText?: string;
  taxRate: number;
  items: POItem[];
  notes?: string;
}

/**
 * PDF Generation Response Interface
 */
export interface POPDFGenerateResponse {
  success: boolean;
  message: string;
  data: {
    poId: string;
    poNumber: string;
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
 * Purchase Service
 */
@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private readonly API_URL = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  /**
   * Get all purchase orders with optional filters and pagination
   */
 getAllPOs(filters?: {
    poNumber?: string;
    startDate?: string;
    endDate?: string;
    supplier?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<PurchaseOrderResponse> {
    let params = new HttpParams();
    
    if (filters) {
      // Only add parameter if it has a value (not undefined, not empty string)
      if (filters.poNumber && filters.poNumber.trim() !== '') {
        params = params.set('poNumber', filters.poNumber);
      }
      if (filters.startDate && filters.startDate.trim() !== '') {
        params = params.set('startDate', filters.startDate);
      }
      if (filters.endDate && filters.endDate.trim() !== '') {
        params = params.set('endDate', filters.endDate);
      }
      if (filters.supplier && filters.supplier.trim() !== '') {
        params = params.set('supplier', filters.supplier);
      }
      if (filters.status && filters.status.trim() !== '') {
        params = params.set('status', filters.status);
      }
      if (filters.search && filters.search.trim() !== '') {
        params = params.set('search', filters.search);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
    }

    return this.http.get<PurchaseOrderResponse>(this.API_URL, { params });
  }

  /**
   * Get purchase order by ID
   */
  getPOById(id: string): Observable<SinglePurchaseOrderResponse> {
    return this.http.get<SinglePurchaseOrderResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Create new purchase order
   */
  createPO(data: CreatePurchaseOrderData): Observable<SinglePurchaseOrderResponse> {
    return this.http.post<SinglePurchaseOrderResponse>(this.API_URL, data);
  }

  /**
   * Update existing purchase order
   */
  updatePO(id: string, data: Partial<CreatePurchaseOrderData>): Observable<SinglePurchaseOrderResponse> {
    return this.http.put<SinglePurchaseOrderResponse>(`${this.API_URL}/${id}`, data);
  }

  /**
   * Delete purchase order (super_admin only)
   */
  deletePO(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  /**
   * Generate PDF for purchase order with optional attachment
   */
  generatePDF(id: string, attachmentFile?: File): Observable<POPDFGenerateResponse> {
    const formData = new FormData();
    
    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }

    return this.http.post<POPDFGenerateResponse>(`${this.API_URL}/${id}/generate-pdf`, formData);
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
   * View PDF in new tab
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