import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

// ============================================
// INTERFACES
// ============================================

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  secondaryPhone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  website?: string | null;
  taxId?: string | null;
  materialTypes: string[];
  rating: number;
  paymentTerms?: string | null;
  deliveryTime?: string | null;
  minimumOrder?: string | null;
  currency: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateSupplierData {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  contactPerson?: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  taxId?: string;
  materialTypes?: string[];
  rating?: number;
  paymentTerms?: string;
  deliveryTime?: string;
  minimumOrder?: string;
  currency?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  notes?: string;
}

export interface UpdateSupplierData {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  contactPerson?: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  taxId?: string;
  materialTypes?: string[];
  rating?: number;
  paymentTerms?: string;
  deliveryTime?: string;
  minimumOrder?: string;
  currency?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  notes?: string;
}

export interface SuppliersListResponse {
  success: boolean;
  count: number;
  data: Supplier[];
}

export interface SupplierResponse {
  success: boolean;
  message?: string;
  data: Supplier;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  data?: Supplier;
}

export interface StatisticsResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byMaterial: { [material: string]: number };
    byCountry: { [country: string]: number };
    byCity: { [city: string]: number };
    averageRating: number;
    topRated: Array<{ id: string; name: string; rating: number }>;
    recentlyAdded: Array<{ id: string; name: string; createdAt: string }>;
  };
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  data: {
    success: Array<{ id: string; name: string }>;
    failed: Array<{ name: string; error: string }>;
  };
}

export interface SuppliersFilters {
  status?: string;
  materialType?: string;
  country?: string;
  city?: string;
  minRating?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

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
  // GET SUPPLIERS
  // ============================================

  /**
   * Get all suppliers with optional filters
   */
  getAllSuppliers(filters?: SuppliersFilters): Observable<SuppliersListResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.materialType) {
        params = params.set('materialType', filters.materialType);
      }
      if (filters.country) {
        params = params.set('country', filters.country);
      }
      if (filters.city) {
        params = params.set('city', filters.city);
      }
      if (filters.minRating) {
        params = params.set('minRating', filters.minRating.toString());
      }
    }

    return this.http.get<SuppliersListResponse>(
      `${environment.apiUrl}/suppliers`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Get specific supplier by ID
   */
  getSupplierById(id: string): Observable<SupplierResponse> {
    return this.http.get<SupplierResponse>(
      `${environment.apiUrl}/suppliers/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Search suppliers
   */
  searchSuppliers(query: string): Observable<SuppliersListResponse> {
    const params = new HttpParams().set('q', query);
    
    return this.http.get<SuppliersListResponse>(
      `${environment.apiUrl}/suppliers/search`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Get suppliers by material type
   */
  getSuppliersByMaterial(materialType: string): Observable<SuppliersListResponse> {
    return this.http.get<SuppliersListResponse>(
      `${environment.apiUrl}/suppliers/material/${materialType}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get supplier statistics
   */
  getStatistics(): Observable<StatisticsResponse> {
    return this.http.get<StatisticsResponse>(
      `${environment.apiUrl}/suppliers/statistics`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // CREATE SUPPLIER
  // ============================================

  /**
   * Create a new supplier
   */
  createSupplier(supplierData: CreateSupplierData): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>(
      `${environment.apiUrl}/suppliers`,
      supplierData,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE SUPPLIER
  // ============================================

  /**
   * Update supplier information
   */
  updateSupplier(id: string, updateData: UpdateSupplierData): Observable<SupplierResponse> {
    return this.http.put<SupplierResponse>(
      `${environment.apiUrl}/suppliers/${id}`,
      updateData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update supplier status
   */
  updateSupplierStatus(id: string, status: 'active' | 'inactive' | 'pending' | 'suspended'): Observable<SupplierResponse> {
    return this.http.patch<SupplierResponse>(
      `${environment.apiUrl}/suppliers/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DELETE SUPPLIER
  // ============================================

  /**
   * Delete supplier
   */
  deleteSupplier(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(
      `${environment.apiUrl}/suppliers/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk import suppliers
   */
  bulkImportSuppliers(suppliers: CreateSupplierData[]): Observable<BulkImportResponse> {
    return this.http.post<BulkImportResponse>(
      `${environment.apiUrl}/suppliers/bulk-import`,
      { suppliers },
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s-]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Format phone number
   */
  formatPhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Get status label in Arabic
   */
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'نشط',
      'inactive': 'غير نشط',
      'pending': 'قيد الانتظار',
      'suspended': 'معلق'
    };
    return statusMap[status] || status;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': '#22c55e',
      'inactive': '#ef4444',
      'pending': '#f59e0b',
      'suspended': '#6b7280'
    };
    return colorMap[status] || '#64748b';
  }

  /**
   * Calculate rating stars
   */
  getRatingStars(rating: number): { full: number; half: boolean; empty: number } {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return {
      full: fullStars,
      half: hasHalfStar,
      empty: emptyStars
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount: string | number, currency: string = 'EGP'): string {
    const currencySymbols: { [key: string]: string } = {
      'EGP': 'ج.م',
      'USD': '$',
      'EUR': '€',
      'SAR': 'ر.س',
      'AED': 'د.إ'
    };

    const symbol = currencySymbols[currency] || currency;
    return `${amount} ${symbol}`;
  }
}