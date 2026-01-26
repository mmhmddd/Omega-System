import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PriceQuoteService, PriceQuote, PriceQuoteItem, CreatePriceQuoteData } from '../../core/services/price-quote.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-price-quotes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './price-quotes.component.html',
  styleUrl: './price-quotes.component.scss'
})
export class PriceQuotesComponent implements OnInit {
  // ============================================
  // VIEW MANAGEMENT
  // ============================================
  currentView: 'list' | 'create' | 'edit' = 'list';
  currentStep: 'basic' | 'items' | 'tax' = 'basic';
  formLanguage: 'ar' | 'en' = 'ar';

  // ============================================
  // DATA
  // ============================================
  quotes: PriceQuote[] = [];
  selectedQuote: PriceQuote | null = null;

  // ============================================
  // FORM DATA
  // ============================================
  quoteForm: CreatePriceQuoteData = {
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    clientCity: '',
    date: '',
    revNumber: '00',
    validForDays: 30,
    language: 'arabic',
    includeTax: false,
    taxRate: 0,
    items: [],
    customNotes: ''
  };

  // File attachment
  pdfAttachment: File | null = null;

  // ============================================
  // PAGINATION
  // ============================================
  currentPage: number = 1;
  totalPages: number = 1;
  totalQuotes: number = 0;
  pageSize: number = 10;

  // ============================================
  // FILTERS & SEARCH
  // ============================================
  searchTerm: string = '';

  // ============================================
  // LOADING STATES
  // ============================================
  loading: boolean = false;
  savingQuote: boolean = false;
  deletingQuote: boolean = false;
  generatingPDF: boolean = false;

  // ============================================
  // VALIDATION ERRORS
  // ============================================
  fieldErrors: { [key: string]: string } = {};
  formError: string = '';

  // ============================================
  // MESSAGES
  // ============================================
  successMessage: string = '';
  errorMessage: string = '';

  // ============================================
  // MODALS
  // ============================================
  showDeleteModal: boolean = false;

  constructor(
    private priceQuoteService: PriceQuoteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadQuotes();
    this.setTodayDate();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadQuotes(): void {
    this.loading = true;
    this.errorMessage = '';

    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined
    };

    this.priceQuoteService.getAllPriceQuotes(filters).subscribe({
      next: (response) => {
        this.quotes = response.data;
        this.totalQuotes = response.pagination.totalQuotes;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading quotes:', error);
        this.errorMessage = 'حدث خطأ في تحميل عروض الأسعار';
        this.loading = false;
      }
    });
  }

  // ============================================
  // VIEW MANAGEMENT
  // ============================================

  createQuote(): void {
    this.resetForm();
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};
  }

  editQuote(quote: PriceQuote): void {
    this.selectedQuote = quote;
    this.populateFormWithQuote(quote);
    this.currentView = 'edit';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};
  }

  backToList(): void {
    this.currentView = 'list';
    this.resetForm();
    this.loadQuotes();
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    this.quoteForm = {
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      clientCity: '',
      date: this.getTodayDate(),
      revNumber: '00',
      validForDays: 30,
      language: 'arabic',
      includeTax: false,
      taxRate: 0,
      items: [],
      customNotes: ''
    };
    this.pdfAttachment = null;
    this.fieldErrors = {};
    this.formError = '';
  }

  populateFormWithQuote(quote: PriceQuote): void {
    this.quoteForm = {
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientAddress: quote.clientAddress || '',
      clientCity: quote.clientCity || '',
      date: quote.date,
      revNumber: quote.revNumber,
      validForDays: quote.validForDays || 30,
      language: quote.language,
      includeTax: quote.includeTax,
      taxRate: quote.taxRate,
      items: [...quote.items],
      customNotes: quote.customNotes || ''
    };
  }

  setTodayDate(): void {
    this.quoteForm.date = this.getTodayDate();
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // ============================================
  // LANGUAGE TOGGLE
  // ============================================

  toggleFormLanguage(lang: 'ar' | 'en'): void {
    this.formLanguage = lang;
    this.quoteForm.language = lang === 'ar' ? 'arabic' : 'english';
  }

  // ============================================
  // STEP NAVIGATION
  // ============================================

  nextStep(): void {
    if (this.currentStep === 'basic') {
      if (this.validateBasicInfo()) {
        this.currentStep = 'items';
      }
    } else if (this.currentStep === 'items') {
      if (this.validateItems()) {
        this.currentStep = 'tax';
      }
    }
  }

  previousStep(): void {
    if (this.currentStep === 'tax') {
      this.currentStep = 'items';
    } else if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    }
  }

  // ============================================
  // ITEMS MANAGEMENT
  // ============================================

  addItem(): void {
    this.quoteForm.items.push(this.priceQuoteService.createEmptyQuoteItem());
  }

  removeItem(index: number): void {
    this.quoteForm.items.splice(index, 1);
  }

  getItemsCount(): number {
    return this.quoteForm.items.length;
  }

  calculateItemTotal(item: PriceQuoteItem): number {
    return (item.quantity || 0) * (item.unitPrice || 0);
  }

  // ============================================
  // TAX CALCULATION
  // ============================================

  get calculatedTotals() {
    return this.priceQuoteService.calculateTotals(
      this.quoteForm.items,
      this.quoteForm.includeTax || false,
      this.quoteForm.taxRate || 0
    );
  }

  toggleTax(includeTax: boolean): void {
    this.quoteForm.includeTax = includeTax;
    if (!includeTax) {
      this.quoteForm.taxRate = 0;
    }
  }

  // ============================================
  // FILE UPLOAD
  // ============================================

  onPdfAttachmentSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validation = this.priceQuoteService.validatePDFFile(file);
      if (!validation.valid) {
        this.formError = validation.error || '';
        this.pdfAttachment = null;
        event.target.value = '';
        return;
      }
      this.pdfAttachment = file;
      this.formError = '';
    }
  }

  removePdfAttachment(): void {
    this.pdfAttachment = null;
  }

  // ============================================
  // VALIDATION
  // ============================================

  validateBasicInfo(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.quoteForm.clientName || this.quoteForm.clientName.trim() === '') {
      this.fieldErrors['clientName'] = 'اسم العميل مطلوب';
      isValid = false;
    }

    if (!this.quoteForm.clientPhone || this.quoteForm.clientPhone.trim() === '') {
      this.fieldErrors['clientPhone'] = 'رقم هاتف العميل مطلوب';
      isValid = false;
    } else if (!this.priceQuoteService.validatePhoneNumber(this.quoteForm.clientPhone)) {
      this.fieldErrors['clientPhone'] = 'رقم الهاتف غير صالح';
      isValid = false;
    }

    if (!this.quoteForm.date) {
      this.fieldErrors['date'] = 'التاريخ مطلوب';
      isValid = false;
    }

    return isValid;
  }

  validateItems(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (this.quoteForm.items.length === 0) {
      this.fieldErrors['items'] = 'يجب إضافة عنصر واحد على الأقل';
      isValid = false;
    }

    this.quoteForm.items.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        this.fieldErrors[`item_${index}_description`] = 'الوصف مطلوب';
        isValid = false;
      }

      if (!item.unit || item.unit.trim() === '') {
        this.fieldErrors[`item_${index}_unit`] = 'الوحدة مطلوبة';
        isValid = false;
      }

      if (item.quantity === undefined || item.quantity <= 0) {
        this.fieldErrors[`item_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من صفر';
        isValid = false;
      }

      if (item.unitPrice === undefined || item.unitPrice < 0) {
        this.fieldErrors[`item_${index}_unitPrice`] = 'السعر يجب أن يكون صفر أو أكثر';
        isValid = false;
      }
    });

    return isValid;
  }

  validateTaxInfo(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (this.quoteForm.includeTax) {
      if (!this.quoteForm.taxRate || this.quoteForm.taxRate <= 0) {
        this.fieldErrors['taxRate'] = 'نسبة الضريبة مطلوبة';
        isValid = false;
      }
    }

    return isValid;
  }

  // ============================================
  // SAVE QUOTE
  // ============================================

  saveQuote(): void {
    // Validate all steps
    const basicValid = this.validateBasicInfo();
    const itemsValid = this.validateItems();
    const taxValid = this.validateTaxInfo();

    if (!basicValid) {
      this.currentStep = 'basic';
      this.formError = 'يرجى تصحيح الأخطاء في المعلومات الأساسية';
      return;
    }

    if (!itemsValid) {
      this.currentStep = 'items';
      this.formError = 'يرجى تصحيح الأخطاء في العناصر';
      return;
    }

    if (!taxValid) {
      this.currentStep = 'tax';
      this.formError = 'يرجى تصحيح الأخطاء في معلومات الضريبة';
      return;
    }

    this.savingQuote = true;
    this.formError = '';

    const quoteData: CreatePriceQuoteData = {
      ...this.quoteForm,
      attachment: this.pdfAttachment || undefined
    };

    if (this.currentView === 'create') {
      this.createNewQuote(quoteData);
    } else {
      this.updateExistingQuote(quoteData);
    }
  }

  createNewQuote(quoteData: CreatePriceQuoteData): void {
    this.priceQuoteService.createPriceQuote(quoteData).subscribe({
      next: (response) => {
        this.successMessage = 'تم إنشاء عرض السعر بنجاح';
        this.savingQuote = false;
        this.backToList();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error creating quote:', error);
        this.formError = error.error?.message || 'حدث خطأ أثناء إنشاء عرض السعر';
        this.savingQuote = false;
      }
    });
  }

  updateExistingQuote(quoteData: CreatePriceQuoteData): void {
    if (!this.selectedQuote) return;

    this.priceQuoteService.updatePriceQuote(this.selectedQuote.id, quoteData).subscribe({
      next: (response) => {
        this.successMessage = 'تم تحديث عرض السعر بنجاح';
        this.savingQuote = false;
        this.backToList();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating quote:', error);
        this.formError = error.error?.message || 'حدث خطأ أثناء تحديث عرض السعر';
        this.savingQuote = false;
      }
    });
  }

  // ============================================
  // DELETE QUOTE
  // ============================================

  openDeleteModal(quote: PriceQuote): void {
    this.selectedQuote = quote;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedQuote = null;
  }

  confirmDelete(): void {
    if (!this.selectedQuote) return;

    this.deletingQuote = true;

    this.priceQuoteService.deletePriceQuote(this.selectedQuote.id).subscribe({
      next: (response) => {
        this.successMessage = 'تم حذف عرض السعر بنجاح';
        this.deletingQuote = false;
        this.closeDeleteModal();
        this.loadQuotes();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error deleting quote:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء حذف عرض السعر';
        this.deletingQuote = false;
      }
    });
  }

  // ============================================
  // PDF OPERATIONS
  // ============================================

  downloadPDF(quote: PriceQuote): void {
    const filename = `${quote.quoteNumber}-${quote.clientName}.pdf`;
    this.priceQuoteService.triggerPDFDownload(quote.id, filename);
  }

  viewPDF(quote: PriceQuote): void {
    this.priceQuoteService.downloadPDF(quote.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (error) => {
        console.error('Error viewing PDF:', error);
        this.errorMessage = 'حدث خطأ أثناء عرض الملف';
      }
    });
  }

  printPDF(quote: PriceQuote): void {
    this.priceQuoteService.downloadPDF(quote.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.print();
        };
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
        }, 100);
      },
      error: (error) => {
        console.error('Error printing PDF:', error);
        this.errorMessage = 'حدث خطأ أثناء طباعة الملف';
      }
    });
  }

  // ============================================
  // SEARCH & PAGINATION
  // ============================================

  onSearchChange(): void {
    if (this.searchTerm.length >= 3 || this.searchTerm.length === 0) {
      this.currentPage = 1;
      this.loadQuotes();
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadQuotes();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadQuotes();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getCreatorName(quote: PriceQuote): string {
    return quote.createdBy || 'غير معروف';
  }

  formatCurrency(amount: number): string {
    return this.priceQuoteService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.priceQuoteService.formatDate(dateString);
  }

  isSuperAdmin(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  canEditQuote(quote: PriceQuote): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    return (
      currentUser.role === 'super_admin' ||
      quote.createdBy === currentUser.id
    );
  }

  getLanguageLabel(language: 'arabic' | 'english'): string {
    return this.priceQuoteService.getLanguageLabel(language);
  }
}
