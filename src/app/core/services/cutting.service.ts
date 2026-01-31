import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

export interface UpdateHistoryChange {
  field: string;
  oldValue: any;
  newValue: any;
  progress?: string;
  reason?: string;
  action?: string;
  userId?: string;
}

export interface UpdateHistoryEntry {
  updatedBy: string;
  updatedByInfo?: UserInfo;
  timestamp: string;
  changes: {
    action: string;
    description?: string;
    modifications?: UpdateHistoryChange[];
  };
}

export interface DetailedChangeDescription {
notes: any;
  field: string;
  description: string;
  descriptionAr: string;
  oldValue: any;
  newValue: any;
  difference?: number;
  progress?: string;
  progressPercentage?: number;
  reason?: string;
}

export interface UpdateSummary {
  en: string;
  ar: string;
}

export interface EnhancedUpdateHistoryEntry {
  updatedBy: string;
  updatedByInfo?: UserInfo;
  timestamp: string;
  changes: {
notes: any;
    action: string;
    actionType: 'job_created' | 'job_updated' | 'progress_updated' | 'status_changed' | 'file_updated';
    description?: string;
    descriptionAr?: string;
    modifications?: UpdateHistoryChange[];
    detailedDescriptions?: DetailedChangeDescription[];
    summary?: UpdateSummary;
    details?: any;
  };
}

export interface CuttingJob {
  id: string;
  projectName: string;
  pieceName: string;
  quantity: number;
  materialType: string;
  thickness: number;
  notes: string;
  fileStatus: 'معلق' | 'قيد التنفيذ' | 'مكتمل' | 'جزئي';
  fileName: string | null;
  filePath: string | null;
  uploadedBy: string;
  cutBy: string[];
  dateFrom: string | null;
  createdAt: string;
  updatedAt: string;
  currentlyCut: number;
  remaining?: number;

  // ✅ NEW: Enhanced user information fields
  uploadedByInfo?: UserInfo;
  cutByInfo?: UserInfo[];
  lastUpdatedBy?: string;
  lastUpdatedByInfo?: UserInfo;
  updateHistory?: EnhancedUpdateHistoryEntry[]; // Enhanced with detailed descriptions
}

export interface CreateCuttingJobData {
  projectName: string;
  pieceName?: string;
  quantity: number;
  materialType: string;
  thickness: number;
  notes?: string;
  file?: File;
}

export interface UpdateCuttingJobData {
  projectName?: string;
  pieceName?: string;
  quantity?: number;
  materialType?: string;
  thickness?: number;
  notes?: string;
  fileStatus?: 'معلق' | 'قيد التنفيذ' | 'مكتمل' | 'جزئي';
  dateFrom?: string;
  file?: File;
  currentlyCut?: number;
}

export interface CuttingJobsResponse {
  success: boolean;
  data: CuttingJob[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    limit: number;
  };
}

export interface CuttingJobResponse {
  success: boolean;
  message?: string;
  data: CuttingJob;
}

export interface CuttingStatistics {
  total: number;
  byStatus: {
    معلق: number;
    'قيد التنفيذ': number;
    مكتمل: number;
    جزئي: number;
  };
  byMaterial: {
    [key: string]: number;
  };
  totalProgress?: {
    totalQuantity: number;
    totalCut: number;
    percentageComplete: number;
  };
}

export interface CuttingStatisticsResponse {
  success: boolean;
  data: CuttingStatistics;
}

export interface CuttingFilters {
  fileStatus?: string;
  materialType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CuttingService {

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

  private getAuthHeadersForMultipart(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type for multipart, browser will set it automatically
    });
  }

  // ============================================
  // USER DISPLAY HELPERS
  // ============================================

  /**
   * Get display name from UserInfo object
   */
  getUserDisplayName(userInfo?: UserInfo, fallbackId?: string): string {
    if (!userInfo) {
      return fallbackId || 'Unknown User';
    }
    return userInfo.name || userInfo.username || userInfo.id;
  }

  /**
   * Get uploaded by display name
   */
  getUploadedByName(job: CuttingJob): string {
    return this.getUserDisplayName(job.uploadedByInfo, job.uploadedBy);
  }

  /**
   * Get last updated by display name
   */
  getLastUpdatedByName(job: CuttingJob): string {
    return this.getUserDisplayName(job.lastUpdatedByInfo, job.lastUpdatedBy);
  }

  /**
   * Get all workers names as comma-separated string
   */
  getCutByNames(job: CuttingJob): string {
    if (!job.cutByInfo || job.cutByInfo.length === 0) {
      return '-';
    }
    return job.cutByInfo.map(user => user.name || user.username).join(', ');
  }

  /**
   * Get workers count
   */
  getCutByCount(job: CuttingJob): number {
    return job.cutByInfo ? job.cutByInfo.length : 0;
  }

  // ============================================
  // CREATE CUTTING JOB
  // ============================================

  createCuttingJob(jobData: CreateCuttingJobData): Observable<CuttingJobResponse> {
    const formData = new FormData();

    formData.append('projectName', jobData.projectName);
    formData.append('quantity', jobData.quantity.toString());
    formData.append('materialType', jobData.materialType);
    formData.append('thickness', jobData.thickness.toString());

    if (jobData.pieceName) {
      formData.append('pieceName', jobData.pieceName);
    }
    if (jobData.notes) {
      formData.append('notes', jobData.notes);
    }
    if (jobData.file) {
      formData.append('file', jobData.file);
    }

    return this.http.post<CuttingJobResponse>(
      API_ENDPOINTS.CUTTING.CREATE,
      formData,
      { headers: this.getAuthHeadersForMultipart() }
    );
  }

  // ============================================
  // GET CUTTING JOBS
  // ============================================

  getAllCuttingJobs(filters?: CuttingFilters): Observable<CuttingJobsResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.fileStatus) {
        params = params.set('fileStatus', filters.fileStatus);
      }
      if (filters.materialType) {
        params = params.set('materialType', filters.materialType);
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
    }

    return this.http.get<CuttingJobsResponse>(
      API_ENDPOINTS.CUTTING.GET_ALL,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  getCuttingJobById(id: string): Observable<CuttingJobResponse> {
    return this.http.get<CuttingJobResponse>(
      API_ENDPOINTS.CUTTING.GET_BY_ID(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE CUTTING JOB
  // ============================================

  updateCuttingJob(id: string, updateData: UpdateCuttingJobData): Observable<CuttingJobResponse> {
    const formData = new FormData();

    if (updateData.projectName !== undefined) {
      formData.append('projectName', updateData.projectName);
    }
    if (updateData.pieceName !== undefined) {
      formData.append('pieceName', updateData.pieceName);
    }
    if (updateData.quantity !== undefined) {
      formData.append('quantity', updateData.quantity.toString());
    }
    if (updateData.materialType !== undefined) {
      formData.append('materialType', updateData.materialType);
    }
    if (updateData.thickness !== undefined) {
      formData.append('thickness', updateData.thickness.toString());
    }
    if (updateData.notes !== undefined) {
      formData.append('notes', updateData.notes);
    }
    if (updateData.fileStatus !== undefined) {
      formData.append('fileStatus', updateData.fileStatus);
    }
    if (updateData.dateFrom !== undefined) {
      formData.append('dateFrom', updateData.dateFrom);
    }
    if (updateData.currentlyCut !== undefined) {
      formData.append('currentlyCut', updateData.currentlyCut.toString());
    }
    if (updateData.file) {
      formData.append('file', updateData.file);
    }

    return this.http.put<CuttingJobResponse>(
      API_ENDPOINTS.CUTTING.UPDATE(id),
      formData,
      { headers: this.getAuthHeadersForMultipart() }
    );
  }

  updateCuttingJobStatus(id: string, fileStatus: string): Observable<CuttingJobResponse> {
    return this.http.patch<CuttingJobResponse>(
      API_ENDPOINTS.CUTTING.UPDATE_STATUS(id),
      { fileStatus },
      { headers: this.getAuthHeaders() }
    );
  }

  updateCuttingProgress(id: string, currentlyCut: number, fileStatus?: string, notes?: string): Observable<CuttingJobResponse> {
    const body: any = { currentlyCut };
    if (fileStatus) {
      body.fileStatus = fileStatus;
    }
    if (notes) {
      body.notes = notes;
    }

    return this.http.patch<CuttingJobResponse>(
      `${API_ENDPOINTS.CUTTING.TRACK(id)}`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DELETE CUTTING JOB
  // ============================================

  deleteCuttingJob(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      API_ENDPOINTS.CUTTING.DELETE(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // STATISTICS
  // ============================================

  getStatistics(): Observable<CuttingStatisticsResponse> {
    return this.http.get<CuttingStatisticsResponse>(
      API_ENDPOINTS.CUTTING.GET_STATISTICS,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DOWNLOAD FILE
  // ============================================

  downloadFile(jobId: string): Observable<Blob> {
    return this.http.get(
      API_ENDPOINTS.CUTTING.DOWNLOAD_FILE(jobId),
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getStatusLabel(status: string): string {
    const statuses: { [key: string]: string } = {
      'معلق': 'معلق',
      'قيد التنفيذ': 'قيد التنفيذ',
      'مكتمل': 'مكتمل',
      'جزئي': 'جزئي'
    };
    return statuses[status] || status;
  }

  getStatusLabelEn(status: string): string {
    const statuses: { [key: string]: string } = {
      'معلق': 'Pending',
      'قيد التنفيذ': 'In Progress',
      'مكتمل': 'Completed',
      'جزئي': 'Partial'
    };
    return statuses[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'معلق': 'status-pending',
      'قيد التنفيذ': 'status-in-progress',
      'مكتمل': 'status-completed',
      'جزئي': 'status-partial'
    };
    return colors[status] || '';
  }

  getMaterialTypeLabel(materialType: string): string {
    const materials: { [key: string]: string } = {
      'steel': 'فولاذ',
      'aluminum': 'ألومنيوم',
      'stainless': 'ستانلس ستيل',
      'copper': 'نحاس',
      'brass': 'نحاس أصفر'
    };
    return materials[materialType] || materialType;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  calculateRemaining(quantity: number, currentlyCut: number): number {
    return Math.max(0, quantity - (currentlyCut || 0));
  }

  calculateProgress(quantity: number, currentlyCut: number): number {
    if (!quantity || quantity === 0) return 0;
    const cut = currentlyCut || 0;
    return Math.min(100, Math.round((cut / quantity) * 100));
  }

  isValidFileType(file: File): boolean {
    const allowedExtensions = ['.dwg', '.dxf', '.dwt', '.nc', '.txt'];
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some(ext => fileName.endsWith(ext));
  }

  getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
