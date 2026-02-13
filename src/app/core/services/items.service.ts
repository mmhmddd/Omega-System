// ============================================
// items.service.ts - COMPLETE WITH EXCEL EXPORT
// ============================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

// ============================================
// INTERFACES
// ============================================

export interface Item {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CreateItemData {
  name: string;
  description?: string;
  unit?: string;
}

export interface UpdateItemData {
  name?: string;
  description?: string;
  unit?: string;
}

export interface ItemsListResponse {
  success: boolean;
  data: Item[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface ItemResponse {
  success: boolean;
  message?: string;
  data: Item;
}

export interface DeleteItemResponse {
  success: boolean;
  message: string;
  data: {
    item: Item;
  };
}

export interface SimpleItem {
  id: string;
  name: string;
  unit?: string | null;
}

export interface SimpleItemsResponse {
  success: boolean;
  data: SimpleItem[];
}

export interface ItemsFilters {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemsService {

  constructor(private http: HttpClient) { }

  // ============================================
  // PRIVATE: GET AUTH HEADERS
  // ============================================

  /**
   * Get authorization headers with token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ============================================
  // CREATE ITEM
  // ============================================

  /**
   * Create a new item
   */
  createItem(itemData: CreateItemData): Observable<ItemResponse> {
    return this.http.post<ItemResponse>(
      API_ENDPOINTS.ITEMS.CREATE,
      itemData,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // GET ITEMS
  // ============================================

  /**
   * Get all items with optional filters
   */
  getAllItems(filters?: ItemsFilters): Observable<ItemsListResponse> {
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
    }

    return this.http.get<ItemsListResponse>(
      API_ENDPOINTS.ITEMS.GET_ALL,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Get specific item by ID
   */
  getItemById(id: string): Observable<ItemResponse> {
    return this.http.get<ItemResponse>(
      API_ENDPOINTS.ITEMS.GET_BY_ID(id),
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get simple items list (id and name only)
   */
  getSimpleItems(): Observable<SimpleItemsResponse> {
    return this.http.get<SimpleItemsResponse>(
      API_ENDPOINTS.ITEMS.GET_SIMPLE,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE ITEM
  // ============================================

  /**
   * Update item information
   */
  updateItem(id: string, updateData: UpdateItemData): Observable<ItemResponse> {
    return this.http.put<ItemResponse>(
      API_ENDPOINTS.ITEMS.UPDATE(id),
      updateData,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DELETE ITEM
  // ============================================

  /**
   * Delete item
   */
  deleteItem(id: string): Observable<DeleteItemResponse> {
    return this.http.delete<DeleteItemResponse>(
      API_ENDPOINTS.ITEMS.DELETE(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // EXPORT TO EXCEL
  // ============================================

  /**
   * Export items to Excel file
   * @param search Optional search filter
   * @returns Observable<Blob> - Binary blob for Excel file
   */
  exportToExcel(search?: string): Observable<Blob> {
    let params = new HttpParams();
    
    // Add search parameter if provided
    if (search && search.trim() !== '') {
      params = params.set('search', search);
    }

    // Get token for authorization
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // NOTE: Do NOT set Content-Type for blob responses
    });

    // Make HTTP GET request expecting binary blob response
    return this.http.get(
      API_ENDPOINTS.ITEMS.EXPORT_EXCEL,
      {
        headers,
        params,
        responseType: 'blob' // CRITICAL: Request binary data, not JSON
      }
    );
  }

  /**
   * Download Excel file
   * Triggers browser download of the Excel blob
   * @param blob Excel file blob from exportToExcel()
   * @param filename Optional custom filename (auto-generated if not provided)
   */
  downloadExcelFile(blob: Blob, filename?: string): void {
    // Create temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create invisible anchor element
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with current date and time if not provided
    if (!filename) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      filename = `items-export-${dateStr}-${timeStr}.xlsx`;
    }
    
    link.download = filename;
    
    // Trigger download
    link.click();
    
    // Clean up: revoke temporary URL to free memory
    window.URL.revokeObjectURL(url);
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================

  /**
   * Validate item name
   */
  validateItemName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'اسم الصنف مطلوب' };
    }

    if (name.trim().length < 2) {
      return { valid: false, error: 'اسم الصنف يجب أن يكون حرفين على الأقل' };
    }

    if (name.trim().length > 100) {
      return { valid: false, error: 'اسم الصنف يجب أن لا يتجاوز 100 حرف' };
    }

    return { valid: true };
  }

  /**
   * Validate item description
   */
  validateDescription(description: string | null): { valid: boolean; error?: string } {
    if (description && description.trim().length > 500) {
      return { valid: false, error: 'الوصف يجب أن لا يتجاوز 500 حرف' };
    }

    return { valid: true };
  }

  /**
   * Validate item unit
   */
  validateUnit(unit: string | null): { valid: boolean; error?: string } {
    if (unit && unit.trim().length > 50) {
      return { valid: false, error: 'الوحدة يجب أن لا تتجاوز 50 حرف' };
    }

    return { valid: true };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format date to Arabic locale
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format date and time
   */
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Create empty item for form
   */
  createEmptyItem(): CreateItemData {
    return {
      name: '',
      description: '',
      unit: ''
    };
  }
}