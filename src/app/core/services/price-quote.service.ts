import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
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

export interface EmailSendResponse {
  success: boolean;
  message: string;
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
  projectName?: string | null;
  date: string;
  revNumber: string;
  validForDays?: number | null;
  language: 'arabic' | 'english';
  includeTax: boolean;
  taxRate: number;
  items: PriceQuoteItem[];
  customNotes?: string | null;
  includeTermsAndConditions?: boolean;
  termsAndConditionsText?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  pdfPath: string;
  attachmentPath?: string | null;
  createdBy: string;
  createdByName?: string;
  createdByInfo?: UserInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceQuoteData {
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  projectName?: string;
  date: string;
  revNumber?: string;
  validForDays?: number;
  language?: 'arabic' | 'english';
  includeTax?: boolean;
  taxRate?: number;
  items: PriceQuoteItem[];
  customNotes?: string;
  includeTermsAndConditions?: boolean;
  termsAndConditionsText?: string;
  attachment?: File;
}

export interface UpdatePriceQuoteData {
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  projectName?: string;
  date?: string;
  revNumber?: string;
  validForDays?: number;
  language?: 'arabic' | 'english';
  includeTax?: boolean;
  taxRate?: number;
  items?: PriceQuoteItem[];
  customNotes?: string;
  includeTermsAndConditions?: boolean;
  termsAndConditionsText?: string;
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

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getMultipartHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getCreatorName(quote: PriceQuote): string {
    if (quote.createdByName && quote.createdByName.trim() !== '' && quote.createdByName !== 'Unknown User') {
      return quote.createdByName;
    }

    if (quote.createdByInfo) {
      return quote.createdByInfo.name || quote.createdByInfo.username;
    }

    return quote.createdBy || '-';
  }

  getDisplayFilename(quote: PriceQuote): string {
    if (!quote.pdfPath) return 'N/A';
    const pathParts = quote.pdfPath.split(/[/\\]/);
    const filename = pathParts[pathParts.length - 1];
    return filename;
  }

  getCreatorEmail(quote: PriceQuote): string {
    return quote.createdByInfo?.email || 'N/A';
  }

  getCreatorUsername(quote: PriceQuote): string {
    return quote.createdByInfo?.username || quote.createdBy;
  }

  // ============================================
  // CREATE PRICE QUOTE
  // ============================================

  createPriceQuote(quoteData: CreatePriceQuoteData): Observable<PriceQuoteResponse> {
    const formData = new FormData();

    formData.append('clientName', quoteData.clientName);
    formData.append('clientPhone', quoteData.clientPhone);
    formData.append('date', quoteData.date);

    if (quoteData.clientAddress) {
      formData.append('clientAddress', quoteData.clientAddress);
    }
    if (quoteData.clientCity) {
      formData.append('clientCity', quoteData.clientCity);
    }
    if (quoteData.projectName) {
      formData.append('projectName', quoteData.projectName);
    }
    if (quoteData.revNumber) {
      formData.append('revNumber', quoteData.revNumber);
    }
    if (quoteData.validForDays) {
      formData.append('validForDays', quoteData.validForDays.toString());
    }

    formData.append('language', quoteData.language || 'arabic');

    formData.append('includeTax', (quoteData.includeTax || false).toString());
    if (quoteData.includeTax === true && quoteData.taxRate && quoteData.taxRate > 0) {
      formData.append('taxRate', quoteData.taxRate.toString());
    }

    formData.append('items', JSON.stringify(quoteData.items));

    if (quoteData.customNotes) {
      formData.append('customNotes', quoteData.customNotes);
    }

    if (quoteData.includeTermsAndConditions !== undefined) {
      formData.append('includeTermsAndConditions', quoteData.includeTermsAndConditions.toString());
    }

    if (quoteData.termsAndConditionsText) {
      formData.append('termsAndConditionsText', quoteData.termsAndConditionsText);
    }

    if (quoteData.attachment) {
      formData.append('attachment', quoteData.attachment, quoteData.attachment.name);
    }

    return this.http.post<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.CREATE,
      formData,
      { headers: this.getMultipartHeaders() }
    );
  }

  /**
   * Send quote PDF by email
   */
  sendQuoteByEmail(id: string, email: string): Observable<{success: boolean; message: string}> {
    return this.http.post<{success: boolean; message: string}>(
      `${API_ENDPOINTS.PRICE_QUOTES.GET_BY_ID(id)}/send-email`,
      { email },
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // GET PRICE QUOTES
  // ============================================

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

  getMyLatestQuote(): Observable<PriceQuoteResponse> {
    return this.http.get<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.GET_MY_LATEST,
      { headers: this.getAuthHeaders() }
    );
  }

  getPriceQuoteById(id: string): Observable<PriceQuoteResponse> {
    return this.http.get<PriceQuoteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.GET_BY_ID(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE PRICE QUOTE
  // ============================================

  updatePriceQuote(id: string, updateData: UpdatePriceQuoteData): Observable<PriceQuoteResponse> {
    const formData = new FormData();

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
    if (updateData.projectName !== undefined) {
      formData.append('projectName', updateData.projectName || '');
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
    if (updateData.includeTax === true && updateData.taxRate !== undefined && updateData.taxRate > 0) {
      formData.append('taxRate', updateData.taxRate.toString());
    }
    if (updateData.items) {
      formData.append('items', JSON.stringify(updateData.items));
    }
    if (updateData.customNotes !== undefined) {
      formData.append('customNotes', updateData.customNotes);
    }

    if (updateData.includeTermsAndConditions !== undefined) {
      formData.append('includeTermsAndConditions', updateData.includeTermsAndConditions.toString());
    }

    if (updateData.termsAndConditionsText !== undefined) {
      formData.append('termsAndConditionsText', updateData.termsAndConditionsText || '');
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

  deletePriceQuote(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(
      API_ENDPOINTS.PRICE_QUOTES.DELETE(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DOWNLOAD PDF
  // ============================================

  downloadPDF(id: string): Observable<Blob> {
    return this.http.get(
      API_ENDPOINTS.PRICE_QUOTES.DOWNLOAD_PDF(id),
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }

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

  validateQuoteItems(items: PriceQuoteItem[]): boolean {
    if (!items || items.length === 0) {
      return false;
    }
    return items.every(item => this.validateQuoteItem(item));
  }

  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  formatCurrency(amount: number): string {
    return `JOD ${amount.toFixed(2)}`;
  }

  getLanguageLabel(language: 'arabic' | 'english'): string {
    return language === 'arabic' ? 'عربي' : 'إنجليزي';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  createEmptyQuoteItem(): PriceQuoteItem {
    return {
      description: '',
      unit: '',
      quantity: 0,
      unitPrice: 0
    };
  }

  validatePDFFile(file: File): { valid: boolean; error?: string } {
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'يجب أن يكون الملف من نوع PDF'
      };
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'حجم الملف يجب أن لا يتجاوز 10 ميجابايت'
      };
    }

    return { valid: true };
  }

  generateQuoteNumberPreview(lastNumber: string): string {
    const match = lastNumber.match(/PQ(\d+)/);
    if (!match) return 'PQ0001';

    const number = parseInt(match[1]) + 1;
    return `PQ${number.toString().padStart(4, '0')}`;
  }

  // ============================================
  // GET DEFAULT TERMS AND CONDITIONS TEXT
  // ============================================

  getDefaultTermsAndConditions(language: 'arabic' | 'english'): string {
    if (language === 'arabic') {
      return `الشروط والأحكام

تُعتبر جميع المواد والبنود والخدمات غير المذكورة صراحةً في هذا المستند مستثناة. كما أن أي خدمات أو أعمال تقع خارج نطاق عمل المورد غير مشمولة. ضريبة القيمة المضافة وأي رسوم حكومية أو تصاريح أو موافقات رسمية غير مشمولة ما لم يُذكر خلاف ذلك. كما أن الأعمال المدنية وأعمال الرفع والمناولة وفك وإعادة تركيب العوائق الموجودة في الموقع أو أي أعمال مشابهة غير مشمولة ما لم يتم ذكرها بشكل صريح.

أي أعمال إضافية أو تغييرات أو متطلبات غير مذكورة في هذا المستند تخضع لتكاليف إضافية وتعديل في مدة التنفيذ حسب الحالة. كما أن رسوم الدراسات واعتماد التصاميم والموافقات الرسمية والتصاريح وختم المخططات والحسابات الهندسية أو أي متطلبات فنية مشابهة غير مشمولة ما لم يُذكر خلاف ذلك صراحةً.

الأسعار مبنية على أساس تنفيذ الطلب بالكامل كما هو محدد، وفي حال تنفيذ جزء من الطلب يحق للمورد تعديل الأسعار وفقاً لذلك.

تكون شروط الدفع على النحو التالي:
( )% دفعة مقدمة عند تأكيد الطلب،
( )% أثناء التنفيذ / عند التوريد،
( )% عند الانتهاء والتسليم النهائي.

يسري هذا المستند لمدة ( ) يوم تقويمي/يوم عمل من تاريخ الإصدار ما لم يُذكر خلاف ذلك.

تعتمد مدة التنفيذ والتوريد على تأكيد الطلب واستلام الموافقات اللازمة وجاهزية الموقع. مدة التنفيذ التقديرية: ( ) يوم/أسبوع/شهر من تاريخ تأكيد الطلب.`;
    } else {
      return `Terms and Conditions

All materials, items, and services not explicitly stated in this document shall be considered excluded. Any services or works falling outside the supplier's scope are not included. Value Added Tax (VAT) and any applicable governmental fees, permits, or approvals are not included unless otherwise stated. Civil works, lifting equipment, handling, dismantling, and re-installation of existing site obstacles or any similar activities are excluded unless clearly mentioned.

Any additional work, variations, or requirements not specified in this document shall be subject to additional cost and time adjustments as applicable. Fees related to studies, design approvals, authority approvals, permits, stamping, engineering calculations, or similar technical requirements are not included unless explicitly stated.

Prices are based on the execution of the complete order as specified. In the event of partial orders, the supplier reserves the right to revise and amend the prices accordingly.

Payment terms shall be as follows:
( )% advance payment upon order confirmation,
( )% during project execution / upon delivery,
( )% upon completion and final handover.

This document is valid for ( ) calendar/working days from the date of issuance unless otherwise stated.

Execution and delivery timelines are subject to order confirmation, receipt of required approvals, and readiness of the project/site conditions. Estimated execution period: ( ) days/weeks/months from the date of order confirmation.`;
    }
  }
}
