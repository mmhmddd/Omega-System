import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

// ============================================
// INTERFACES
// ============================================

// ✅ NEW: User information interface
export interface UserInfo {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface PriceQuoteItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface PriceQuote {
  [x: string]: any;
  id: string;
  quoteNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string | null;
  clientCity?: string | null;
  date: string;
  revNumber: string;
  validForDays?: number | null;
  language: 'arabic' | 'english';
  includeTax: boolean;
  taxRate: number;
  items: PriceQuoteItem[];
  customNotes?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  pdfPath: string;
  attachmentPath?: string | null;
  createdBy: string;
  createdByName?: string;
  createdByInfo?: UserInfo;  // ✅ NEW: Full user information
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceQuoteData {
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  date: string;
  revNumber?: string;
  validForDays?: number;
  language?: 'arabic' | 'english';
  includeTax?: boolean;
  taxRate?: number;
  items: PriceQuoteItem[];
  customNotes?: string;
  attachment?: File;
}

export interface UpdatePriceQuoteData {
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  date?: string;
  revNumber?: string;
  validForDays?: number;
  language?: 'arabic' | 'english';
  includeTax?: boolean;
  taxRate?: number;
  items?: PriceQuoteItem[];
  customNotes?: string;
  attachment?: File;
}

export interface PriceQuotesListResponse {
  success: boolean;
  data: PriceQuote[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalQuotes: number;
    limit: number;
  };
}

export interface PriceQuoteResponse {
  success: boolean;
  message?: string;
  data: PriceQuote;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface PriceQuotesFilters {
  search?: string;
  page?: number;
  limit?: number;
  createdBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PriceQuoteService {

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
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get authorization headers for multipart/form-data
   */
  private getMultipartHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    // Don't set Content-Type for FormData - browser will set it with boundary
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

/**
 * Get creator's display name from quote
 */
getCreatorName(quote: PriceQuote): string {
  // Priority 1: Use createdByName from backend
  if (quote.createdByName && quote.createdByName.trim() !== '' && quote.createdByName !== 'Unknown User') {
    return quote.createdByName;
  }
  
  // Priority 2: Use createdByInfo if available
  if (quote.createdByInfo) {
    return quote.createdByInfo.name || quote.createdByInfo.username;
  }
  
  // Priority 3: Fallback to createdBy ID
  return quote.createdBy || '-';
}

/**
 * Get creator's email from quote
 */
getCreatorEmail(quote: PriceQuote): string {
  return quote.createdByInfo?.email || 'N/A';
}

/**
 * Get creator's username from quote
 */
getCreatorUsername(quote: PriceQuote): string {
  return quote.createdByInfo?.username || quote.createdBy;
}

  // ============================================
  // CREATE PRICE QUOTE
  // ============================================

  /**
   * Create a new price quote with optional attachment
   */
  createPriceQuote(quoteData: CreatePriceQuoteData): Observable<PriceQuoteResponse> {
    const formData = new FormData();

    // Add required fields
    formData.append('clientName', quoteData.clientName);
    formData.append('clientPhone', quoteData.clientPhone);
    formData.append('date', quoteData.date);

    // Add optional fields
    if (quoteData.clientAddress) {
      formData.append('clientAddress', quoteData.clientAddress);
    }
    if (quoteData.clientCity) {
      formData.append('clientCity', quoteData.clientCity);
    }
    if (quoteData.revNumber) {
      formData.append('revNumber', quoteData.revNumber);
    }
    if (quoteData.validForDays) {
      formData.append('validForDays', quoteData.validForDays.toString());
    }

    // Add language (default: arabic)
    formData.append('language', quoteData.language || 'arabic');

    // Add tax information - FIXED: Only send taxRate if includeTax is true
    formData.append('includeTax', (quoteData.includeTax || false).toString());
    if (quoteData.includeTax === true && quoteData.taxRate && quoteData.taxRate > 0) {
      formData.append('taxRate', quoteData.taxRate.toString());
    }

    // Add items as JSON string
    formData.append('items', JSON.stringify(quoteData.items));

    // Add custom notes
    if (quoteData.customNotes) {
      formData.append('customNotes', quoteData.customNotes);
    }

    // Add attachment file if provided
    if (quoteData.attachment) {
      formData.append('attachment', quoteData.attachment, quoteData.attachment.name);
    }

    return this.http.post<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.CREATE,
      formData,
      { headers: this.getMultipartHeaders() }
    );
  }

  // ============================================
  // GET PRICE QUOTES
  // ============================================

  /**
   * Get all price quotes (Super Admin only)
   */
  getAllPriceQuotes(filters?: PriceQuotesFilters): Observable<PriceQuotesListResponse> {
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
      if (filters.createdBy) {
        params = params.set('createdBy', filters.createdBy);
      }
    }

    return this.http.get<PriceQuotesListResponse>(
      API_ENDPOINTS.PRICE_QUOTES.GET_ALL,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Get latest quote by current user
   */
  getMyLatestQuote(): Observable<PriceQuoteResponse> {
    return this.http.get<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.GET_MY_LATEST,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get specific price quote by ID
   */
  getPriceQuoteById(id: string): Observable<PriceQuoteResponse> {
    return this.http.get<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.GET_BY_ID(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE PRICE QUOTE
  // ============================================

  /**
   * Update price quote
   */
  updatePriceQuote(id: string, updateData: UpdatePriceQuoteData): Observable<PriceQuoteResponse> {
    const formData = new FormData();

    // Add fields only if they are provided
    if (updateData.clientName) {
      formData.append('clientName', updateData.clientName);
    }
    if (updateData.clientPhone) {
      formData.append('clientPhone', updateData.clientPhone);
    }
    if (updateData.clientAddress !== undefined) {
      formData.append('clientAddress', updateData.clientAddress || '');
    }
    if (updateData.clientCity !== undefined) {
      formData.append('clientCity', updateData.clientCity || '');
    }
    if (updateData.date) {
      formData.append('date', updateData.date);
    }
    if (updateData.revNumber !== undefined) {
      formData.append('revNumber', updateData.revNumber);
    }
    if (updateData.validForDays !== undefined) {
      formData.append('validForDays', updateData.validForDays.toString());
    }
    if (updateData.language) {
      formData.append('language', updateData.language);
    }
    if (updateData.includeTax !== undefined) {
      formData.append('includeTax', updateData.includeTax.toString());
    }
    // FIXED: Only send taxRate if includeTax is true
    if (updateData.includeTax === true && updateData.taxRate !== undefined && updateData.taxRate > 0) {
      formData.append('taxRate', updateData.taxRate.toString());
    }
    if (updateData.items) {
      formData.append('items', JSON.stringify(updateData.items));
    }
    if (updateData.customNotes !== undefined) {
      formData.append('customNotes', updateData.customNotes);
    }
    if (updateData.attachment) {
      formData.append('attachment', updateData.attachment, updateData.attachment.name);
    }

    return this.http.put<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.UPDATE(id),
      formData,
      { headers: this.getMultipartHeaders() }
    );
  }

  // ============================================
  // DELETE PRICE QUOTE
  // ============================================

  /**
   * Delete price quote (Super Admin only)
   */
  deletePriceQuote(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.DELETE(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DOWNLOAD PDF
  // ============================================

  /**
   * Download PDF of price quote
   */
  downloadPDF(id: string): Observable<Blob> {
    return this.http.get(
      API_ENDPOINTS.PRICE_QUOTES.DOWNLOAD_PDF(id),
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Helper method to trigger PDF download in browser
   */
  triggerPDFDownload(id: string, filename?: string): void {
    this.downloadPDF(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `quote-${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Calculate totals for quote items
   */
  calculateTotals(items: PriceQuoteItem[], includeTax: boolean, taxRate: number): {
    subtotal: number;
    taxAmount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    let taxAmount = 0;
    if (includeTax && taxRate) {
      taxAmount = (subtotal * taxRate) / 100;
    }

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat((subtotal + taxAmount).toFixed(2))
    };
  }

  /**
   * Validate quote item
   */
  validateQuoteItem(item: PriceQuoteItem): boolean {
    return !!(
      item.description &&
      item.description.trim() !== '' &&
      item.quantity !== undefined &&
      item.quantity > 0 &&
      item.unitPrice !== undefined &&
      item.unitPrice >= 0
    );
  }

  /**
   * Validate all items in array
   */
  validateQuoteItems(items: PriceQuoteItem[]): boolean {
    if (!items || items.length === 0) {
      return false;
    }
    return items.every(item => this.validateQuoteItem(item));
  }

  /**
   * Validate phone number format (basic validation)
   */
  validatePhoneNumber(phone: string): boolean {
    // Basic validation: at least 10 digits
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format currency (JOD)
   */
  formatCurrency(amount: number): string {
    return `JOD ${amount.toFixed(2)}`;
  }

  /**
   * Get language label in Arabic
   */
  getLanguageLabel(language: 'arabic' | 'english'): string {
    return language === 'arabic' ? 'عربي' : 'إنجليزي';
  }

  /**
   * Format date for display (DD/MM/YYYY)
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Format date for input (YYYY-MM-DD)
   */
  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  /**
   * Create empty quote item
   */
  createEmptyQuoteItem(): PriceQuoteItem {
    return {
      description: '',
      unit: '',
      quantity: 0,
      unitPrice: 0
    };
  }

  /**
   * Validate PDF file
   */
  validatePDFFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'يجب أن يكون الملف من نوع PDF'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'حجم الملف يجب أن لا يتجاوز 10 ميجابايت'
      };
    }

    return { valid: true };
  }

  /**
   * Generate quote number preview (for display purposes)
   */
  generateQuoteNumberPreview(lastNumber: string): string {
    const match = lastNumber.match(/PQ(\d+)/);
    if (!match) return 'PQ0001';

    const number = parseInt(match[1]) + 1;
    return `PQ${number.toString().padStart(4, '0')}`;
  }
}
