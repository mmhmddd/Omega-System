// src/app/core/services/file.service.ts - UPDATED WITH EMPTY RECEIPTS INTEGRATION
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface FileRecord {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: string;
  category: string;
  extension: string;
  icon: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  documentNumber?: string;
  projectName?: string;
  clientName?: string;
  employeeName?: string;
  formType?: string;
  supplier?: string;
  requester?: string;
  recipientName?: string;
  fileStatus?: string;
  subFolder?: string;
  notes?: string;
}

export interface FileType {
  value: string;
  label: string;
  icon: string;
}

export interface FileCategory {
  value: string;
  label: string;
  icon: string;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface FileFilters {
  type?: string;
  category?: string;
  extension?: string;
  search?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface FilePagination {
  currentPage: number;
  totalPages: number;
  totalFiles: number;
  limit: number;
}

export interface FileStatistics {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  byType: { [key: string]: number };
  byCategory: { [key: string]: number };
  byExtension: { [key: string]: number };
  byCreator: { [key: string]: number };
  recentFiles: FileRecord[];
}

export interface FileTypesResponse {
  types: FileType[];
  categories: FileCategory[];
  sortOptions: SortOption[];
  sortOrders: SortOption[];
}

// ✅ NEW: Empty Receipt interfaces
export interface EmptyReceiptRecord {
  _id: string;
  receiptNumber: string;
  to: string;
  notes?: string;
  pdfFilename: string;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmptyReceiptStats {
  totalReceipts: number;
  thisMonth: number;
  thisYear: number;
  byMonth: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly API_URL = `${environment.apiUrl}/file-management`;

  constructor(private http: HttpClient) {}

  // ============================================
  // FILE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * Get all files with filters and pagination
   */
  getAllFiles(filters: FileFilters = {}): Observable<{ success: boolean; data: FileRecord[]; pagination: FilePagination }> {
    let params = new HttpParams();

    if (filters.type) params = params.set('type', filters.type);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.extension) params = params.set('extension', filters.extension);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.createdBy) params = params.set('createdBy', filters.createdBy);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<{ success: boolean; data: FileRecord[]; pagination: FilePagination }>(
      this.API_URL,
      { params }
    );
  }

  /**
   * Get file statistics
   */
  getStatistics(): Observable<{ success: boolean; data: FileStatistics }> {
    return this.http.get<{ success: boolean; data: FileStatistics }>(
      `${this.API_URL}/statistics`
    );
  }

  /**
   * Get available file types and categories
   */
  getFileTypes(): Observable<{ success: boolean; data: FileTypesResponse }> {
    return this.http.get<{ success: boolean; data: FileTypesResponse }>(
      `${this.API_URL}/types`
    );
  }

  /**
   * Get specific file details
   */
  getFileById(id: string): Observable<{ success: boolean; data: FileRecord }> {
    return this.http.get<{ success: boolean; data: FileRecord }>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Delete file (Super Admin only)
   */
  deleteFile(id: string): Observable<{ success: boolean; message: string; data: FileRecord }> {
    return this.http.delete<{ success: boolean; message: string; data: FileRecord }>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Bulk delete files (Super Admin only)
   */
  bulkDeleteFiles(fileIds: string[]): Observable<{
    success: boolean;
    message: string;
    data: {
      deleted: number;
      errors: number;
      deletedFiles: any[];
      failedFiles: any[];
    }
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: {
        deleted: number;
        errors: number;
        deletedFiles: any[];
        failedFiles: any[];
      }
    }>(`${this.API_URL}/bulk-delete`, { fileIds });
  }

  /**
   * Export file list as JSON
   */
  exportFileList(): void {
    window.open(`${this.API_URL}/export/list`, '_blank');
  }

  // ============================================
  // DOWNLOAD METHODS FOR FILE TYPES
  // ============================================

  /**
   * Get download URL for file
   */
  getDownloadUrl(id: string): string {
    return `${this.API_URL}/${id}/download`;
  }

  /**
   * Get preview URL for file
   */
  getPreviewUrl(id: string): string {
    return `${this.API_URL}/${id}/preview`;
  }

  /**
   * Download file with authentication
   */
  downloadFile(id: string): void {
    const token = localStorage.getItem('token');
    
    this.http.get(this.getDownloadUrl(id), {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'download';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }

        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: (error) => {
        console.error('Error downloading file:', error);
      }
    });
  }

  /**
   * Preview file with authentication
   */
  previewFile(id: string): void {
    const token = localStorage.getItem('token');
    
    this.http.get(this.getPreviewUrl(id), {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      },
      error: (error) => {
        console.error('Error previewing file:', error);
      }
    });
  }


  /**
   * Download Proforma Invoice PDF
   */
  downloadProformaInvoice(id: string): void {
    const token = localStorage.getItem('token');
    const downloadUrl = `${environment.apiUrl}/proforma-invoices/${id}/download-pdf`;

    this.http.get(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `proforma-invoice-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading proforma invoice:', error);
        alert('فشل تحميل الفاتورة. الرجاء المحاولة مرة أخرى.');
      }
    });
  }

  /**
   * Download Costing Sheet PDF
   */
  downloadCostingSheet(id: string): void {
    const token = localStorage.getItem('token');
    const downloadUrl = `${environment.apiUrl}/costing-sheets/${id}/download-pdf`;

    this.http.get(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `costing-sheet-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading costing sheet:', error);
        alert('فشل تحميل كشف التكاليف. الرجاء المحاولة مرة أخرى.');
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get file icon by extension
   */
  getFileIcon(extension: string): string {
    const icons: { [key: string]: string } = {
      '.pdf': '📄',
      '.dwg': '📐',
      '.dxf': '📐',
      '.dwt': '📐',
      '.nc': '⚙️',
      '.txt': '📝',
      '.jpg': '🖼️',
      '.jpeg': '🖼️',
      '.png': '🖼️',
      '.gif': '🖼️',
      '.bmp': '🖼️',
      '.doc': '📃',
      '.docx': '📃',
      '.xls': '📊',
      '.xlsx': '📊'
    };

    return icons[extension.toLowerCase()] || '📎';
  }

  /**
   * Get file category label
   */
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'pdf': 'PDF',
      'cad': 'CAD',
      'cnc': 'CNC',
      'image': 'صور',
      'document': 'مستندات',
      'other': 'أخرى'
    };

    return labels[category] || category;
  }

  /**
   * Get file type label with NEW types
   */
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'cuttingJobs': 'أعمال القص',
      'quotations': 'عروض الأسعار',
      'receipts': 'إشعارات الاستلام',
      'secretariatForms': 'نماذج السكرتارية',
      'secretariatUserForms': 'نماذج المستخدمين',
      'rfqs': 'طلبات عروض الأسعار',
      'purchases': 'طلبات الشراء',
      'materials': 'طلبات المواد',
      'proformaInvoices': 'فواتير أولية',
      'costingSheets': 'كشوف تكاليف'
    };

    return labels[type] || type;
  }

  /**
   * Get type-specific icon
   */
  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'cuttingJobs': '✂️',
      'quotations': '📝',
      'receipts': '🧾',
      'secretariatForms': '📋',
      'secretariatUserForms': '📄',
      'rfqs': '📨',
      'purchases': '🛒',
      'materials': '📦',
      'proformaInvoices': '📋',
      'costingSheets': '📊'
    };

    return icons[type] || '📎';
  }
}