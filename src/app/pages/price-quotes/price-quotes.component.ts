import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PriceQuoteService, PriceQuote, PriceQuoteItem, CreatePriceQuoteData } from '../../core/services/price-quote.service';
import { AuthService } from '../../core/services/auth.service';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-price-quotes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './price-quotes.component.html',
  styleUrl: './price-quotes.component.scss'
})
export class PriceQuotesComponent implements OnInit, OnDestroy {

  // ============================================
  // ✅ USER INFO DISPLAY METHODS
  // ============================================

  /**
   * Get creator's display name (prioritizes createdByInfo)
   */
  getCreatorName(quote: PriceQuote): string {
    return this.priceQuoteService.getCreatorName(quote);
  }

  /**
   * Get creator's email
   */
  getCreatorEmail(quote: PriceQuote): string {
    return this.priceQuoteService.getCreatorEmail(quote);
  }

  /**
   * Get creator's username
   */
  getCreatorUsername(quote: PriceQuote): string {
    return this.priceQuoteService.getCreatorUsername(quote);
  }

  // ============================================
  // VIEW MANAGEMENT
  // ============================================
  currentView: 'list' | 'create' | 'edit' = 'list';
  currentStep: 'basic' | 'items' | 'tax' | 'options' = 'basic';
  formLanguage: 'ar' | 'en' = 'ar';

  // ============================================
  // DATA
  // ============================================
  quotes: PriceQuote[] = [];
  selectedQuote: PriceQuote | null = null;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // ============================================
  // FORM DATA
  // ============================================
  quoteForm: CreatePriceQuoteData = {
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    clientCity: '',
    projectName: '',
    date: '',
    revNumber: '00',
    validForDays: 30,
    language: 'arabic',
    includeTax: false,
    taxRate: 0,
    items: [],
    customNotes: '',
    includeTermsAndConditions: false,
    termsAndConditionsText: ''
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
  showSuccessModal: boolean = false;
  showDuplicateModal: boolean = false;
  generatedQuoteId: string = '';
  quoteToDuplicate: PriceQuote | null = null;

  showShareModal: boolean = false;
  shareQuoteId: string = '';
  shareQuoteNumber: string = '';
  emailSelections = {
    email1: false,
    email2: false,
    custom: false
  };
  customEmail: string = '';
  sendingEmail: boolean = false;

  // ✅ Static email addresses - UPDATE THESE
  staticEmails = {
    email1: 'alaqtash@gmail.com',
    email2: 'munther.fayed@gmail.com'
  };

  constructor(
    public priceQuoteService: PriceQuoteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadQuotes();
  }

  ngOnDestroy(): void {
    // Clear all toast timeouts
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
  }

  // ============================================
  // TOAST METHODS
  // ============================================

  showToast(type: ToastType, message: string, duration: number = 3000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message };

    this.toasts.push(toast);

    // Auto-remove
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimeouts.set(id, timeout);
    }

    // Limit to 5 toasts
    if (this.toasts.length > 5) {
      const oldestToast = this.toasts[0];
      this.removeToast(oldestToast.id);
    }
  }

  removeToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      const timeout = this.toastTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.toastTimeouts.delete(id);
      }
    }
  }

  // ============================================
  // EMAIL SHARING METHODS
  // ============================================

  /**
   * Open share modal for a quote
   */
  openShareModal(quote: PriceQuote): void {
    if (!quote.pdfPath) {
      this.showToast('error', this.formLanguage === 'ar' ? 'لم يتم إنشاء PDF بعد' : 'PDF not generated yet');
      return;
    }
    this.shareQuoteId = quote.id;
    this.shareQuoteNumber = quote.quoteNumber;

    // Reset selections
    this.emailSelections = {
      email1: false,
      email2: false,
      custom: false
    };
    this.customEmail = '';
    this.showShareModal = true;
  }

  /**
   * Close share modal
   */
  closeShareModal(): void {
    this.showShareModal = false;
    this.shareQuoteId = '';
    this.shareQuoteNumber = '';
    this.emailSelections = {
      email1: false,
      email2: false,
      custom: false
    };
    this.customEmail = '';
  }

  /**
   * Get list of selected emails
   */
  getSelectedEmailsList(): string[] {
    const emails: string[] = [];

    if (this.emailSelections.email1) {
      emails.push(this.staticEmails.email1);
    }

    if (this.emailSelections.email2) {
      emails.push(this.staticEmails.email2);
    }

    if (this.emailSelections.custom && this.customEmail && this.customEmail.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailPattern.test(this.customEmail.trim())) {
        emails.push(this.customEmail.trim());
      }
    }

    return emails;
  }

  /**
   * Validate email selection
   */
  isEmailValid(): boolean {
    const selectedEmails = this.getSelectedEmailsList();

    // Must have at least one valid email selected
    if (selectedEmails.length === 0) {
      return false;
    }

    // If custom is selected, validate the custom email
    if (this.emailSelections.custom) {
      if (!this.customEmail || this.customEmail.trim() === '') {
        return false;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(this.customEmail.trim())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send quote PDF to selected emails
   */
  sendEmailWithPDF(): void {
    const selectedEmails = this.getSelectedEmailsList();

    if (selectedEmails.length === 0) {
      this.showToast('error', this.formLanguage === 'ar'
        ? 'يرجى اختيار بريد إلكتروني واحد على الأقل'
        : 'Please select at least one email address'
      );
      return;
    }

    this.sendingEmail = true;

    // Send to all selected emails sequentially
    let completedCount = 0;
    let failedCount = 0;

    const sendToNextEmail = (index: number) => {
      if (index >= selectedEmails.length) {
        // All emails processed
        this.sendingEmail = false;
        this.closeShareModal();

        if (failedCount === 0) {
          const successMsg = this.formLanguage === 'ar'
            ? `تم إرسال عرض السعر بنجاح إلى ${completedCount} بريد إلكتروني`
            : `Quote sent successfully to ${completedCount} email${completedCount > 1 ? 's' : ''}`;
          this.showToast('success', successMsg);
        } else if (completedCount > 0) {
          const partialMsg = this.formLanguage === 'ar'
            ? `تم الإرسال إلى ${completedCount} من أصل ${selectedEmails.length} بريد`
            : `Sent to ${completedCount} of ${selectedEmails.length} emails`;
          this.showToast('warning', partialMsg);
        } else {
          const errorMsg = this.formLanguage === 'ar'
            ? 'فشل إرسال البريد الإلكتروني'
            : 'Failed to send email';
          this.showToast('error', errorMsg);
        }
        return;
      }

      const email = selectedEmails[index];

      this.priceQuoteService.sendQuoteByEmail(this.shareQuoteId, email).subscribe({
        next: () => {
          completedCount++;
          sendToNextEmail(index + 1);
        },
        error: (error: any) => {
          console.error(`Error sending to ${email}:`, error);
          failedCount++;
          sendToNextEmail(index + 1);
        }
      });
    };

    // Start sending
    sendToNextEmail(0);
  }

  getDisplayFilename(quote: PriceQuote): string {
    if (!quote.pdfPath) return 'N/A';
    const pathParts = quote.pdfPath.split(/[/\\]/);
    const filename = pathParts[pathParts.length - 1];
    return filename;
  }

  /**
   * Share from success modal
   */
  shareFromSuccessModal(): void {
    if (this.generatedQuoteId) {
      this.closeSuccessModal();
      this.priceQuoteService.getPriceQuoteById(this.generatedQuoteId).subscribe({
        next: (response: any) => {
          this.openShareModal(response.data);
        },
        error: () => {
          const errorMsg = this.formLanguage === 'ar'
            ? 'حدث خطأ في تحميل البيانات'
            : 'Error loading data';
          this.showToast('error', errorMsg);
        }
      });
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }

  // ============================================
  // DATA LOADING - UPDATED FOR ROLE-BASED ACCESS
  // ============================================

  loadQuotes(): void {
    this.loading = true;
    const currentUser = this.authService.currentUserValue;

    if (!currentUser) {
      this.loading = false;
      const errorMsg = this.formLanguage === 'ar'
        ? 'يجب تسجيل الدخول أولاً'
        : 'Please login first';
      this.showToast('error', errorMsg);
      return;
    }

    // Super Admin: Load all quotes with pagination and search
    if (currentUser.role === 'super_admin') {
      this.loadAllQuotes();
    }
    // Admin or Employee with permission: Load ALL their quotes with pagination
    else if (currentUser.role === 'admin' ||
             (currentUser.role === 'employee' && this.hasRouteAccess())) {
      this.loadMyQuotesWithPagination();
    }
    // No permission
    else {
      this.loading = false;
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
        : 'You do not have permission to access this page';
      this.showToast('error', errorMsg);
    }
  }

  // Load all quotes (Super Admin only)
  private loadAllQuotes(): void {
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
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل عروض الأسعار'
          : 'Error loading quotes';
        this.showToast('error', errorMsg);
        this.loading = false;
      }
    });
  }

  // Load ALL current user's quotes with pagination (Admin/Employee)
  private loadMyQuotesWithPagination(): void {
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined
    };

    // Use the main getAllQuotes endpoint which will filter by user automatically
    this.priceQuoteService.getAllPriceQuotes(filters).subscribe({
      next: (response) => {
        this.quotes = response.data;
        this.totalQuotes = response.pagination.totalQuotes;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading my quotes:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل عروض الأسعار'
          : 'Error loading quotes';
        this.showToast('error', errorMsg);
        this.loading = false;
      }
    });
  }

  // Check if employee has route access
  private hasRouteAccess(): boolean {
    return this.authService.hasRouteAccess('priceQuotes');
  }

  // ============================================
  // VIEW MANAGEMENT
  // ============================================

  createQuote(): void {
    // Check permission
    if (!this.canCreateQuote()) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لإنشاء عرض سعر'
        : 'You do not have permission to create quotes';
      this.showToast('error', errorMsg);
      return;
    }

    this.resetForm();

    // ✅ FIX: Ensure language is set correctly based on current UI language
    this.quoteForm.language = this.formLanguage === 'ar' ? 'arabic' : 'english';

    this.currentView = 'create';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};

    console.log('🆕 Creating new quote with language:', this.quoteForm.language);
  }

  editQuote(quote: PriceQuote): void {
    // Check permission
    if (!this.canEditQuote(quote)) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لتعديل هذا العرض'
        : 'You do not have permission to edit this quote';
      this.showToast('error', errorMsg);
      return;
    }

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
  // DUPLICATE QUOTE FUNCTIONALITY
  // ============================================

  /**
   * Open duplicate confirmation modal
   */
  openDuplicateModal(quote: PriceQuote): void {
    // Check permission
    if (!this.canCreateQuote()) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لإنشاء عرض سعر'
        : 'You do not have permission to create quotes';
      this.showToast('error', errorMsg);
      return;
    }

    this.quoteToDuplicate = quote;
    this.showDuplicateModal = true;
  }

  /**
   * Close duplicate modal
   */
  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.quoteToDuplicate = null;
  }

  /**
   * Confirm duplicate and create new quote with copied data
   */
  confirmDuplicate(): void {
    if (!this.quoteToDuplicate) return;

    const quote = this.quoteToDuplicate;

    this.resetForm();

    this.quoteForm = {
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientAddress: quote.clientAddress || '',
      clientCity: quote.clientCity || '',
      projectName: quote.projectName || '',
      date: this.getTodayDate(),
      revNumber: '00',
      validForDays: quote.validForDays || 30,
      language: quote.language,
      includeTax: quote.includeTax,
      taxRate: quote.taxRate,
      items: [...quote.items.map(item => ({ ...item }))],
      customNotes: quote.customNotes || '',
      includeTermsAndConditions: quote.includeTermsAndConditions || false,
      termsAndConditionsText: quote.termsAndConditionsText || ''
    };

    this.currentView = 'create';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};

    this.closeDuplicateModal();

    const successMsg = this.formLanguage === 'ar'
      ? `تم نسخ بيانات عرض السعر ${quote.quoteNumber}. يمكنك التعديل وحفظ عرض سعر جديد.`
      : `Quote ${quote.quoteNumber} data copied. You can modify and save as a new quote.`;
    this.showToast('info', successMsg, 5000);
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    // ✅ FIX: Use current formLanguage to set the initial language
    const currentLanguage = this.formLanguage === 'ar' ? 'arabic' : 'english';

    this.quoteForm = {
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      clientCity: '',
      projectName: '',
      date: this.getTodayDate(),
      revNumber: '00',
      validForDays: 30,
      language: currentLanguage, // ✅ Use current UI language
      includeTax: false,
      taxRate: 0,
      items: [],
      customNotes: '',
      includeTermsAndConditions: false,
      termsAndConditionsText: ''
    };
    this.pdfAttachment = null;
    this.fieldErrors = {};
    this.formError = '';

    console.log('📝 Form reset with language:', currentLanguage);
  }

  populateFormWithQuote(quote: PriceQuote): void {
    this.quoteForm = {
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientAddress: quote.clientAddress || '',
      clientCity: quote.clientCity || '',
      projectName: quote.projectName || '',
      date: quote.date,
      revNumber: quote.revNumber,
      validForDays: quote.validForDays || 30,
      language: quote.language,
      includeTax: quote.includeTax,
      taxRate: quote.taxRate,
      items: [...quote.items],
      customNotes: quote.customNotes || '',
      includeTermsAndConditions: quote.includeTermsAndConditions || false,
      termsAndConditionsText: quote.termsAndConditionsText || ''
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
  // LANGUAGE TOGGLE - ✅ FIXED
  // ============================================

  toggleFormLanguage(lang: 'ar' | 'en'): void {
    this.formLanguage = lang;
    this.quoteForm.language = lang === 'ar' ? 'arabic' : 'english';

    console.log('🌐 Language toggled to:', this.formLanguage, '-> Backend language:', this.quoteForm.language);

    // Update terms and conditions text when language changes
    if (this.quoteForm.includeTermsAndConditions) {
      const currentDefaultArabic = this.priceQuoteService.getDefaultTermsAndConditions('arabic');
      const currentDefaultEnglish = this.priceQuoteService.getDefaultTermsAndConditions('english');

      // Check if current text matches either default (meaning user hasn't customized it)
      const isDefaultText = this.quoteForm.termsAndConditionsText === currentDefaultArabic ||
                            this.quoteForm.termsAndConditionsText === currentDefaultEnglish ||
                            !this.quoteForm.termsAndConditionsText;

      if (isDefaultText) {
        // Update to the new language's default
        this.quoteForm.termsAndConditionsText = this.priceQuoteService.getDefaultTermsAndConditions(
          this.quoteForm.language
        );
        console.log('✅ Terms updated to', this.quoteForm.language, 'default');
      } else {
        console.log('⚠️ Terms text has been customized - keeping user edits');
      }
    }
  }

  // ============================================
  // TERMS AND CONDITIONS TOGGLE - ✅ FIXED
  // ============================================

  toggleTermsAndConditions(enabled: boolean): void {
    this.quoteForm.includeTermsAndConditions = enabled;

    if (enabled) {
      // Auto-populate with default terms if empty
      if (!this.quoteForm.termsAndConditionsText || this.quoteForm.termsAndConditionsText.trim() === '') {
        // ✅ FIX: Use quoteForm.language (backend language) instead of formLanguage
        this.quoteForm.termsAndConditionsText = this.priceQuoteService.getDefaultTermsAndConditions(
          this.quoteForm.language!
        );
        console.log('✅ Terms populated with', this.quoteForm.language, 'default');
      }
    } else {
      // Clear terms text when disabled
      this.quoteForm.termsAndConditionsText = '';
    }
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
    } else if (this.currentStep === 'tax') {
      this.currentStep = 'options';
    }
  }

  previousStep(): void {
    if (this.currentStep === 'options') {
      this.currentStep = 'tax';
    } else if (this.currentStep === 'tax') {
      this.currentStep = 'items';
    } else if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    }
  }

  // ============================================
  // ITEMS MANAGEMENT
  // ============================================

  addItem(): void {
    const newItem = this.priceQuoteService.createEmptyQuoteItem();
    // Set default unit based on current language
    newItem.unit = this.formLanguage === 'ar' ? 'قطعة' : 'pieces';
    this.quoteForm.items.push(newItem);
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
      // Clear any tax-related errors
      delete this.fieldErrors['taxRate'];
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
        this.showToast('error', validation.error || 'Invalid file');
        this.pdfAttachment = null;
        event.target.value = '';
        return;
      }
      this.pdfAttachment = file;
      this.formError = '';
      const successMsg = this.formLanguage === 'ar'
        ? 'تم إرفاق الملف بنجاح'
        : 'File attached successfully';
      this.showToast('success', successMsg);
    }
  }

  removePdfAttachment(): void {
    this.pdfAttachment = null;
    const msg = this.formLanguage === 'ar'
      ? 'تم إزالة المرفق'
      : 'Attachment removed';
    this.showToast('info', msg);
  }

  // ============================================
  // VALIDATION
  // ============================================

  validateBasicInfo(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.quoteForm.clientName || this.quoteForm.clientName.trim() === '') {
      this.fieldErrors['clientName'] = this.formLanguage === 'ar'
        ? 'اسم العميل مطلوب'
        : 'Client name is required';
      isValid = false;
    }

    if (!this.quoteForm.clientPhone || this.quoteForm.clientPhone.trim() === '') {
      this.fieldErrors['clientPhone'] = this.formLanguage === 'ar'
        ? 'رقم هاتف العميل مطلوب'
        : 'Phone number is required';
      isValid = false;
    } else if (!this.priceQuoteService.validatePhoneNumber(this.quoteForm.clientPhone)) {
      this.fieldErrors['clientPhone'] = this.formLanguage === 'ar'
        ? 'رقم الهاتف غير صالح'
        : 'Invalid phone number';
      isValid = false;
    }

    if (!this.quoteForm.date) {
      this.fieldErrors['date'] = this.formLanguage === 'ar'
        ? 'التاريخ مطلوب'
        : 'Date is required';
      isValid = false;
    }

    return isValid;
  }

  validateItems(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    // Items are optional - only validate if items exist
    if (this.quoteForm.items.length > 0) {
      this.quoteForm.items.forEach((item, index) => {
        if (!item.description || item.description.trim() === '') {
          this.fieldErrors[`item_${index}_description`] = this.formLanguage === 'ar'
            ? 'الوصف مطلوب'
            : 'Description is required';
          isValid = false;
        }

        if (!item.unit || item.unit.trim() === '') {
          this.fieldErrors[`item_${index}_unit`] = this.formLanguage === 'ar'
            ? 'الوحدة مطلوبة'
            : 'Unit is required';
          isValid = false;
        }

        if (item.quantity === undefined || item.quantity <= 0) {
          this.fieldErrors[`item_${index}_quantity`] = this.formLanguage === 'ar'
            ? 'الكمية يجب أن تكون أكبر من صفر'
            : 'Quantity must be greater than zero';
          isValid = false;
        }

        if (item.unitPrice === undefined || item.unitPrice < 0) {
          this.fieldErrors[`item_${index}_unitPrice`] = this.formLanguage === 'ar'
            ? 'السعر يجب أن يكون صفر أو أكثر'
            : 'Price must be zero or greater';
          isValid = false;
        }
      });
    }

    return isValid;
  }

  validateTaxInfo(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    // Only validate tax rate if tax is actually included
    if (this.quoteForm.includeTax === true) {
      if (!this.quoteForm.taxRate || this.quoteForm.taxRate <= 0) {
        this.fieldErrors['taxRate'] = this.formLanguage === 'ar'
          ? 'نسبة الضريبة مطلوبة'
          : 'Tax rate is required';
        isValid = false;
      }
    } else {
      // If tax is not included, ensure taxRate is 0
      this.quoteForm.taxRate = 0;
    }

    return isValid;
  }

  // ============================================
  // SAVE QUOTE - ✅ WITH DEBUG LOGGING
  // ============================================

  saveQuote(): void {
    // Validate all steps
    const basicValid = this.validateBasicInfo();
    const itemsValid = this.validateItems();
    const taxValid = this.validateTaxInfo();

    if (!basicValid) {
      this.currentStep = 'basic';
      this.formError = this.formLanguage === 'ar'
        ? 'يرجى تصحيح الأخطاء في المعلومات الأساسية'
        : 'Please correct errors in basic information';
      this.showToast('warning', this.formError);
      return;
    }

    if (!itemsValid) {
      this.currentStep = 'items';
      this.formError = this.formLanguage === 'ar'
        ? 'يرجى تصحيح الأخطاء في العناصر'
        : 'Please correct errors in items';
      this.showToast('warning', this.formError);
      return;
    }

    if (!taxValid) {
      this.currentStep = 'tax';
      this.formError = this.formLanguage === 'ar'
        ? 'يرجى تصحيح الأخطاء في معلومات الضريبة'
        : 'Please correct errors in tax information';
      this.showToast('warning', this.formError);
      return;
    }

    // ✅ DEBUG LOGGING
    console.log('💾 === SAVING QUOTE ===');
    console.log('UI Language (formLanguage):', this.formLanguage);
    console.log('Backend Language (quoteForm.language):', this.quoteForm.language);
    console.log('Include Terms:', this.quoteForm.includeTermsAndConditions);
    console.log('Terms Text Length:', this.quoteForm.termsAndConditionsText?.length || 0);
    console.log('========================');

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
        this.savingQuote = false;
        this.generatedQuoteId = response.data.id;
        this.showSuccessModal = true;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم إنشاء عرض السعر بنجاح'
          : 'Quote created successfully';
        this.showToast('success', successMsg);
      },
      error: (error) => {
        console.error('Error creating quote:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء إنشاء عرض السعر'
          : 'Error creating quote');
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.savingQuote = false;
      }
    });
  }

  updateExistingQuote(quoteData: CreatePriceQuoteData): void {
    if (!this.selectedQuote) return;

    this.priceQuoteService.updatePriceQuote(this.selectedQuote.id, quoteData).subscribe({
      next: (response) => {
        this.savingQuote = false;
        this.generatedQuoteId = response.data.id;
        this.showSuccessModal = true;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم تحديث عرض السعر بنجاح'
          : 'Quote updated successfully';
        this.showToast('success', successMsg);
      },
      error: (error) => {
        console.error('Error updating quote:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء تحديث عرض السعر'
          : 'Error updating quote');
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.savingQuote = false;
      }
    });
  }

  // ============================================
  // SUCCESS MODAL ACTIONS
  // ============================================

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.generatedQuoteId = '';
    this.backToList();
  }

  viewGeneratedPDF(): void {
    const quote = this.quotes.find(q => q.id === this.generatedQuoteId);
    if (quote) {
      this.viewPDF(quote);
    } else {
      // If quote not in current list, fetch it
      this.priceQuoteService.downloadPDF(this.generatedQuoteId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        },
        error: (error) => {
          console.error('Error viewing PDF:', error);
          const errorMsg = this.formLanguage === 'ar'
            ? 'حدث خطأ أثناء عرض الملف'
            : 'Error viewing PDF';
          this.showToast('error', errorMsg);
        }
      });
    }
  }

  printGeneratedPDF(): void {
    this.priceQuoteService.downloadPDF(this.generatedQuoteId).subscribe({
      next: (blob) => {
        this.printPDFBlob(blob);
      },
      error: (error) => {
        console.error('Error printing PDF:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء طباعة الملف'
          : 'Error printing PDF';
        this.showToast('error', errorMsg);
      }
    });
  }

  downloadGeneratedPDF(): void {
    const quote = this.quotes.find(q => q.id === this.generatedQuoteId);
    const filename = quote ? this.getDisplayFilename(quote) : `quote-${this.generatedQuoteId}.pdf`;
    this.priceQuoteService.triggerPDFDownload(this.generatedQuoteId, filename);
  }

  // ============================================
  // DELETE QUOTE
  // ============================================

  openDeleteModal(quote: PriceQuote): void {
    // Check permission
    if (!this.canDeleteQuote(quote)) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لحذف هذا العرض'
        : 'You do not have permission to delete this quote';
      this.showToast('error', errorMsg);
      return;
    }

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
        const successMsg = this.formLanguage === 'ar'
          ? 'تم حذف عرض السعر بنجاح'
          : 'Quote deleted successfully';
        this.showToast('success', successMsg);
        this.deletingQuote = false;
        this.closeDeleteModal();
        this.loadQuotes();
      },
      error: (error) => {
        console.error('Error deleting quote:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء حذف عرض السعر'
          : 'Error deleting quote');
        this.showToast('error', errorMsg);
        this.deletingQuote = false;
      }
    });
  }

  // ============================================
  // PDF OPERATIONS
  // ============================================

  downloadPDF(quote: PriceQuote): void {
    const filename = this.getDisplayFilename(quote);
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
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء عرض الملف'
          : 'Error viewing PDF';
        this.showToast('error', errorMsg);
      }
    });
  }

  printPDF(quote: PriceQuote): void {
    this.priceQuoteService.downloadPDF(quote.id).subscribe({
      next: (blob) => {
        this.printPDFBlob(blob);
      },
      error: (error) => {
        console.error('Error printing PDF:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء طباعة الملف'
          : 'Error printing PDF';
        this.showToast('error', errorMsg);
      }
    });
  }

  // Helper method to print PDF blob
  private printPDFBlob(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);

    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = url;

    document.body.appendChild(iframe);

    // Wait for PDF to load then print
    iframe.onload = () => {
      try {
        // Small delay to ensure PDF is fully loaded
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }

          // Clean up after printing or if user cancels
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }, 1000);
        }, 250);
      } catch (error) {
        console.error('Error printing PDF:', error);
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);

        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء طباعة الملف'
          : 'Error printing PDF';
        this.showToast('error', errorMsg);
      }
    };

    // Handle load errors
    iframe.onerror = () => {
      console.error('Error loading PDF for printing');
      document.body.removeChild(iframe);
      window.URL.revokeObjectURL(url);

      const errorMsg = this.formLanguage === 'ar'
        ? 'حدث خطأ أثناء تحميل الملف للطباعة'
        : 'Error loading PDF for printing';
      this.showToast('error', errorMsg);
    };
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
  // PERMISSION METHODS
  // ============================================

  isSuperAdmin(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  canCreateQuote(): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    return (
      currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      (currentUser.role === 'employee' && this.hasRouteAccess())
    );
  }

  canEditQuote(quote: PriceQuote): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    // Super admin can edit all quotes
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Admin and employees can only edit their own quotes
    if (currentUser.role === 'admin' ||
        (currentUser.role === 'employee' && this.hasRouteAccess())) {
      return quote.createdBy === currentUser.id;
    }

    return false;
  }

  canDeleteQuote(quote: PriceQuote): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    // Super admin can delete any quote
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Admin and employees can delete their own quotes
    if (currentUser.role === 'admin' ||
        (currentUser.role === 'employee' && this.hasRouteAccess())) {
      return quote.createdBy === currentUser.id;
    }

    return false;
  }

  canViewQuote(quote: PriceQuote): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    // Super admin can view all quotes
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Admin and employees can only view their own quotes
    if (currentUser.role === 'admin' ||
        (currentUser.role === 'employee' && this.hasRouteAccess())) {
      return quote.createdBy === currentUser.id;
    }

    return false;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatCurrency(amount: number): string {
    return this.priceQuoteService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.priceQuoteService.formatDate(dateString);
  }

  getLanguageLabel(language: 'arabic' | 'english'): string {
    return this.priceQuoteService.getLanguageLabel(language);
  }
}
