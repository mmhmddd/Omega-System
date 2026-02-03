// ============================================================
// COSTING SHEET SERVICE - COMPLETE FIXED VERSION
// src/app/core/services/costing-sheet.service.ts
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

export interface CSItem {
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
}

export interface CreateCostingSheetData {
  date: string;
  client: string;
  project: string;
  profitPercentage: number | string;
  notes: string;
  items: CSItem[];
  additionalNotes: string;
  includeStaticFile: boolean;
}

export interface CostingSheet {
  id: string;
  csNumber: string;
  date: string;
  client: string;
  project: string;
  profitPercentage: number;
  notes: string;
  items: CSItem[];
  additionalNotes: string;
  includeStaticFile: boolean;
  language: string;
  status: string;
  createdBy: string;
  createdByName?: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  pdfFilename?: string;
  pdfLanguage?: string;
  pdfGeneratedAt?: string;
  pdfMerged?: boolean;
  pdfPageCount?: {
    generated?: number;
    attachment?: number;
    total: number;
  };
}

export interface CostingSheetFilters {
  csNumber?: string;
  startDate?: string;
  endDate?: string;
  client?: string;
  project?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CostingSheetService {
  private apiUrl = `${environment.apiUrl}/costing-sheets`;

  constructor(private http: HttpClient) {}

  /**
   * Get headers with authentication token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('⚠️ No authentication token found in localStorage');
    }
    
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('HTTP Error:', error);
    
    if (error.status === 401) {
      console.error('🔒 Unauthorized - Token may be invalid or expired');
    } else if (error.status === 403) {
      console.error('🚫 Forbidden - Insufficient permissions');
    } else if (error.status === 0) {
      console.error('❌ Network error - Could not connect to server');
    }
    
    return throwError(() => error);
  }

  /**
   * Get all costing sheets with optional filters
   */
  getAllCostingSheets(filters: CostingSheetFilters = {}): Observable<any> {
    let params = new HttpParams();

    if (filters.csNumber) params = params.set('csNumber', filters.csNumber);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.client) params = params.set('client', filters.client);
    if (filters.project) params = params.set('project', filters.project);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    console.log('📡 Fetching costing sheets with params:', params.toString());

    return this.http.get<any>(this.apiUrl, { 
      params,
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get a specific costing sheet by ID
   */
  getCostingSheetById(id: string): Observable<any> {
    console.log('📡 Fetching costing sheet:', id);
    
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new costing sheet
   */
  createCostingSheet(data: CreateCostingSheetData): Observable<any> {
    console.log('📡 Creating costing sheet:', data);
    
    return this.http.post<any>(this.apiUrl, data, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing costing sheet
   */
  updateCostingSheet(id: string, data: Partial<CreateCostingSheetData>): Observable<any> {
    console.log('📡 Updating costing sheet:', id, data);
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, data, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a costing sheet (super admin only)
   */
  deleteCostingSheet(id: string): Observable<any> {
    console.log('📡 Deleting costing sheet:', id);
    
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate PDF for a costing sheet
   */
  generatePDF(id: string, attachment?: File): Observable<any> {
    console.log('📡 Generating PDF for costing sheet:', id);
    
    const formData = new FormData();
    if (attachment) {
      formData.append('attachment', attachment);
      console.log('📎 Attachment added:', attachment.name);
    }

    // Get token for FormData request
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
      // Don't set Content-Type for FormData - browser will set it with boundary
    });

    return this.http.post<any>(`${this.apiUrl}/${id}/generate-pdf`, formData, {
      headers: headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * ✅ FIXED: Download PDF using fetch with Authorization header
   */
  downloadPDF(id: string, filename: string): void {
    console.log('📥 Downloading PDF:', filename);
    
    const token = localStorage.getItem('token');
    const downloadUrl = `${this.apiUrl}/${id}/download-pdf`;
    
    fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log('✅ PDF downloaded successfully');
    })
    .catch(error => {
      console.error('❌ Download failed:', error);
      alert('Failed to download PDF. Please try again.');
    });
  }

  /**
   * ✅ FIXED: View PDF in new tab using fetch with Authorization header
   */
  viewPDFInNewTab(id: string): void {
    console.log('👁️ Opening PDF in new tab');
    
    const token = localStorage.getItem('token');
    const pdfUrl = `${this.apiUrl}/${id}/download-pdf`;
    
    fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        alert('Please allow popups for this site to view PDFs');
        window.URL.revokeObjectURL(url);
        return;
      }
      
      newWindow.onload = () => {
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      };
      
      console.log('✅ PDF opened in new tab');
    })
    .catch(error => {
      console.error('❌ View PDF failed:', error);
      alert('Failed to open PDF. Please try again.');
    });
  }

  /**
   * ✅ FIXED: Open print dialog using fetch with Authorization header
   */
  openPrintDialog(id: string): void {
    console.log('🖨️ Opening print dialog');
    
    const token = localStorage.getItem('token');
    const pdfUrl = `${this.apiUrl}/${id}/download-pdf`;
    
    fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print failed:', e);
          alert('Failed to print. Please try downloading the PDF instead.');
        }
        
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
        }, 1000);
      };
      
      console.log('✅ Print dialog opened');
    })
    .catch(error => {
      console.error('❌ Print failed:', error);
      alert('Failed to print PDF. Please try again.');
    });
  }

  /**
   * Get costing sheet statistics
   */
  getCostingSheetStats(): Observable<any> {
    console.log('📊 Fetching costing sheet statistics');
    
    return this.http.get<any>(`${this.apiUrl}/stats`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reset costing sheet counter (super admin only)
   */
  resetCounter(): Observable<any> {
    console.log('🔄 Resetting costing sheet counter');
    
    return this.http.post<any>(`${this.apiUrl}/reset-counter`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
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

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * Log current authentication status
   */
  logAuthStatus(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔐 Authentication Status:');
    console.log('  Token exists:', !!token);
    console.log('  Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('  User exists:', !!user);
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('  User role:', userData.role);
        console.log('  User ID:', userData.id);
      } catch (e) {
        console.log('  User data parse error');
      }
    }
  }
}