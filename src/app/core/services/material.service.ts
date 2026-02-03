// ============================================================
// MATERIAL REQUEST SERVICE - WITH TERMS AND CONDITIONS SUPPORT
// src/app/core/services/material.service.ts
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

/**
 * Material Request Item Interface
 */
export interface MRItem {
  description: string;
  unit: string;
  quantity: number | string;
  requiredDate?: string;
  priority?: string;
}

/**
 * Material Request Interface
 */
export interface MaterialRequest {
  id: string;
  mrNumber: string;
  date: string;
  section: string;
  project: string;
  requestPriority: string;
  requestReason: string;
  items: MRItem[];
  additionalNotes?: string;
  includeStaticFile?: boolean; // ✅ NEW: Terms & Conditions flag
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
 * Material Request List Response Interface
 */
export interface MaterialRequestResponse {
  success: boolean;
  data: MaterialRequest[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMaterials: number;
    limit: number;
  };
  userRole?: string;
}

/**
 * Single Material Request Response Interface
 */
export interface SingleMaterialRequestResponse {
  success: boolean;
  data: MaterialRequest;
}

/**
 * Create Material Request Data Interface
 */
export interface CreateMaterialRequestData {
  date?: string;
  section: string;
  project: string;
  requestPriority: string;
  requestReason: string;
  items: MRItem[];
  additionalNotes?: string;
  includeStaticFile?: boolean; // ✅ NEW: Terms & Conditions flag
}

/**
 * PDF Generation Response Interface
 */
export interface MRPDFGenerateResponse {
  success: boolean;
  message: string;
  data: {
    mrId: string;
    mrNumber: string;
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
 * Material Request Service
 */
@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private readonly API_URL = `${environment.apiUrl}/materials`;

  constructor(private http: HttpClient) {}

  /**
   * Get all material requests with optional filters and pagination
   */
  getAllMaterialRequests(filters?: {
    mrNumber?: string;
    startDate?: string;
    endDate?: string;
    section?: string;
    project?: string;
    priority?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<MaterialRequestResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.mrNumber && filters.mrNumber.trim() !== '') {
        params = params.set('mrNumber', filters.mrNumber);
      }
      if (filters.startDate && filters.startDate.trim() !== '') {
        params = params.set('startDate', filters.startDate);
      }
      if (filters.endDate && filters.endDate.trim() !== '') {
        params = params.set('endDate', filters.endDate);
      }
      if (filters.section && filters.section.trim() !== '') {
        params = params.set('section', filters.section);
      }
      if (filters.project && filters.project.trim() !== '') {
        params = params.set('project', filters.project);
      }
      if (filters.priority && filters.priority.trim() !== '') {
        params = params.set('priority', filters.priority);
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

    return this.http.get<MaterialRequestResponse>(this.API_URL, { params });
  }

  /**
   * Get material request by ID
   */
  getMaterialRequestById(id: string): Observable<SingleMaterialRequestResponse> {
    return this.http.get<SingleMaterialRequestResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * ✅ Create new material request - WITH TERMS & CONDITIONS SUPPORT
   */
  createMaterialRequest(data: CreateMaterialRequestData): Observable<SingleMaterialRequestResponse> {
    // ✅ Ensure includeStaticFile is sent as boolean
    const payload = {
      ...data,
      includeStaticFile: data.includeStaticFile === true
    };

    return this.http.post<SingleMaterialRequestResponse>(this.API_URL, payload);
  }

  /**
   * ✅ Update existing material request - WITH TERMS & CONDITIONS SUPPORT
   */
  updateMaterialRequest(id: string, data: Partial<CreateMaterialRequestData>): Observable<SingleMaterialRequestResponse> {
    // ✅ Ensure includeStaticFile is sent as boolean if present
    const payload = { ...data };
    if ('includeStaticFile' in data) {
      payload.includeStaticFile = data.includeStaticFile === true;
    }

    return this.http.put<SingleMaterialRequestResponse>(`${this.API_URL}/${id}`, payload);
  }

  /**
   * Delete material request (super_admin only)
   */
  deleteMaterialRequest(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  /**
   * ✅ Generate PDF for material request with optional attachment
   *
   * Note: The Terms & Conditions PDF is automatically included based on
   * the includeStaticFile flag stored in the material request data.
   * This method only handles user-uploaded attachments.
   */
  generatePDF(id: string, attachmentFile?: File): Observable<MRPDFGenerateResponse> {
    const formData = new FormData();

    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }

    return this.http.post<MRPDFGenerateResponse>(`${this.API_URL}/${id}/generate-pdf`, formData);
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
