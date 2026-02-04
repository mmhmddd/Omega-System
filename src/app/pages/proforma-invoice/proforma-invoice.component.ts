import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProformaInvoiceService, ProformaInvoice, ProformaInvoiceItem, CreateProformaInvoiceData } from '../../core/services/proforma-invoice.service';
import { AuthService } from '../../core/services/auth.service';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-proforma-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './proforma-invoice.component.html',
  styleUrl: './proforma-invoice.component.scss'
})
export class ProformaInvoiceComponent implements OnInit, OnDestroy {

  // ============================================
  // ✅ USER INFO DISPLAY METHODS
  // ============================================

  /**
   * Get creator's display name (prioritizes createdByInfo)
   */
  getCreatorName(invoice: ProformaInvoice): string {
    return this.proformaInvoiceService.getCreatorName(invoice);
  }

  /**
   * Get creator's email
   */
  getCreatorEmail(invoice: ProformaInvoice): string {
    return this.proformaInvoiceService.getCreatorEmail(invoice);
  }

  /**
   * Get creator's username
   */
  getCreatorUsername(invoice: ProformaInvoice): string {
    return this.proformaInvoiceService.getCreatorUsername(invoice);
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
  invoices: ProformaInvoice[] = [];
  selectedInvoice: ProformaInvoice | null = null;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // ============================================
  // FORM DATA
  // ============================================
  invoiceForm: CreateProformaInvoiceData = {
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
    includeStaticFile: false
  };

  // File attachment
  pdfAttachment: File | null = null;

  // ============================================
  // PAGINATION
  // ============================================
  currentPage: number = 1;
  totalPages: number = 1;
  totalInvoices: number = 0;
  pageSize: number = 10;

  // ============================================
  // FILTERS & SEARCH
  // ============================================
  searchTerm: string = '';

  // ============================================
  // LOADING STATES
  // ============================================
  loading: boolean = false;
  savingInvoice: boolean = false;
  deletingInvoice: boolean = false;
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
  generatedInvoiceId: string = '';
  invoiceToDuplicate: ProformaInvoice | null = null;
showShareModal: boolean = false;
shareInvoiceId: string = '';
shareInvoiceNumber: string = '';
emailSelections = {
  email1: false,
  email2: false,
  custom: false
};
customEmail: string = '';
sendingEmail: boolean = false;

// ✅ Static email addresses - UPDATE THESE WITH YOUR ACTUAL EMAILS
staticEmails = {
  email1: 'first.email@company.com',
  email2: 'second.email@company.com'
};
  constructor(
    public proformaInvoiceService: ProformaInvoiceService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
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

  /**
 * Open share modal for an invoice
 */
openShareModal(invoice: ProformaInvoice): void {
  if (!invoice.pdfPath) {
    this.showToast('error', this.formLanguage === 'ar' ? 'لم يتم إنشاء PDF بعد' : 'PDF not generated yet');
    return;
  }
  this.shareInvoiceId = invoice.id;
  this.shareInvoiceNumber = invoice.invoiceNumber;
  
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
  this.shareInvoiceId = '';
  this.shareInvoiceNumber = '';
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
 * Send invoice PDF to selected emails
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
          ? `تم إرسال الفاتورة بنجاح إلى ${completedCount} بريد إلكتروني`
          : `Invoice sent successfully to ${completedCount} email${completedCount > 1 ? 's' : ''}`;
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
    
    this.proformaInvoiceService.sendInvoiceByEmail(this.shareInvoiceId, email).subscribe({
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

/**
 * Share from success modal
 */
shareFromSuccessModal(): void {
  if (this.generatedInvoiceId) {
    this.closeSuccessModal();
    this.proformaInvoiceService.getProformaInvoiceById(this.generatedInvoiceId).subscribe({
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
  // DATA LOADING - ROLE-BASED ACCESS
  // ============================================

  loadInvoices(): void {
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

    // Super Admin: Load all invoices with pagination and search
    if (currentUser.role === 'super_admin') {
      this.loadAllInvoices();
    }
    // Admin or Employee with permission: Load ALL their invoices with pagination
    else if (currentUser.role === 'admin' ||
             (currentUser.role === 'employee' && this.hasRouteAccess())) {
      this.loadMyInvoicesWithPagination();
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

  // Load all invoices (Super Admin only)
  private loadAllInvoices(): void {
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined
    };

    this.proformaInvoiceService.getAllProformaInvoices(filters).subscribe({
      next: (response) => {
        this.invoices = response.data;
        this.totalInvoices = response.pagination.totalInvoices;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل الفواتير الأولية'
          : 'Error loading proforma invoices';
        this.showToast('error', errorMsg);
        this.loading = false;
      }
    });
  }

  // Load ALL current user's invoices with pagination (Admin/Employee)
  private loadMyInvoicesWithPagination(): void {
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined
    };

    this.proformaInvoiceService.getAllProformaInvoices(filters).subscribe({
      next: (response) => {
        this.invoices = response.data;
        this.totalInvoices = response.pagination.totalInvoices;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading my invoices:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل الفواتير الأولية'
          : 'Error loading proforma invoices';
        this.showToast('error', errorMsg);
        this.loading = false;
      }
    });
  }

  // Check if employee has route access
  private hasRouteAccess(): boolean {
    return this.authService.hasRouteAccess('proformaInvoices');
  }

  // ============================================
  // VIEW MANAGEMENT - ✅ CRITICAL FIXES
  // ============================================

  createInvoice(): void {
    // Check permission
    if (!this.canCreateInvoice()) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لإنشاء فاتورة أولية'
        : 'You do not have permission to create proforma invoices';
      this.showToast('error', errorMsg);
      return;
    }

    // ✅ CRITICAL FIX: Save current language before reset
    const currentLanguage = this.formLanguage;

    this.resetForm();

    // ✅ CRITICAL FIX: Restore the language after reset
    this.formLanguage = currentLanguage;
    this.invoiceForm.language = currentLanguage === 'ar' ? 'arabic' : 'english';

    this.currentView = 'create';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};

    console.log('✅ Create Invoice - Language preserved:', this.formLanguage, this.invoiceForm.language);
  }

  editInvoice(invoice: ProformaInvoice): void {
    // Check permission
    if (!this.canEditInvoice(invoice)) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لتعديل هذه الفاتورة'
        : 'You do not have permission to edit this invoice';
      this.showToast('error', errorMsg);
      return;
    }

    this.selectedInvoice = invoice;
    this.populateFormWithInvoice(invoice);
    this.currentView = 'edit';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};
  }

  backToList(): void {
    this.currentView = 'list';
    this.resetForm();
    this.loadInvoices();
  }

  // ============================================
  // DUPLICATE INVOICE FUNCTIONALITY
  // ============================================

  openDuplicateModal(invoice: ProformaInvoice): void {
    // Check permission
    if (!this.canCreateInvoice()) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لإنشاء فاتورة أولية'
        : 'You do not have permission to create invoices';
      this.showToast('error', errorMsg);
      return;
    }

    this.invoiceToDuplicate = invoice;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.invoiceToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.invoiceToDuplicate) return;

    const invoice = this.invoiceToDuplicate;

    this.resetForm();

    // ✅ FIX: Set language FIRST before creating the form object
    const duplicatedLanguage = invoice.language;

    this.invoiceForm = {
      clientName: invoice.clientName,
      clientPhone: invoice.clientPhone,
      clientAddress: invoice.clientAddress || '',
      clientCity: invoice.clientCity || '',
      projectName: invoice.projectName || '',
      date: this.getTodayDate(),
      revNumber: '00',
      validForDays: invoice.validForDays || 30,
      language: duplicatedLanguage,  // ✅ Use the original invoice language
      includeTax: invoice.includeTax,
      taxRate: invoice.taxRate,
      items: [...invoice.items.map(item => ({ ...item }))],
      customNotes: invoice.customNotes || '',
      includeStaticFile: invoice.includeStaticFile || false
    };

    // ✅ FIX: Sync formLanguage AFTER setting invoiceForm
    this.formLanguage = duplicatedLanguage === 'arabic' ? 'ar' : 'en';
    this.cdr.detectChanges();

    this.currentView = 'create';
    this.currentStep = 'basic';
    this.formError = '';
    this.fieldErrors = {};

    this.closeDuplicateModal();

    const successMsg = this.formLanguage === 'ar'
      ? `تم نسخ بيانات الفاتورة ${invoice.invoiceNumber}. يمكنك التعديل وحفظ فاتورة جديدة.`
      : `Invoice ${invoice.invoiceNumber} data copied. You can modify and save as a new invoice.`;
    this.showToast('info', successMsg, 5000);
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    this.invoiceForm = {
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      clientCity: '',
      projectName: '',
      date: this.getTodayDate(),
      revNumber: '00',
      validForDays: 30,
      language: 'arabic',
      includeTax: false,
      taxRate: 0,
      items: [],
      customNotes: '',
      includeStaticFile: false
    };
    // ✅ FIX: Reset formLanguage to match
    this.formLanguage = 'ar';
    this.pdfAttachment = null;
    this.fieldErrors = {};
    this.formError = '';
  }

  populateFormWithInvoice(invoice: ProformaInvoice): void {
    this.invoiceForm = {
      clientName: invoice.clientName,
      clientPhone: invoice.clientPhone,
      clientAddress: invoice.clientAddress || '',
      clientCity: invoice.clientCity || '',
      projectName: invoice.projectName || '',
      date: invoice.date,
      revNumber: invoice.revNumber,
      validForDays: invoice.validForDays || 30,
      language: invoice.language,
      includeTax: invoice.includeTax,
      taxRate: invoice.taxRate,
      items: [...invoice.items],
      customNotes: invoice.customNotes || '',
      includeStaticFile: invoice.includeStaticFile || false
    };
    // ✅ FIX: Sync formLanguage with invoice language
    this.formLanguage = invoice.language === 'arabic' ? 'ar' : 'en';
  }

  setTodayDate(): void {
    this.invoiceForm.date = this.getTodayDate();
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // ============================================
  // LANGUAGE TOGGLE - ✅ FIXED
  // ============================================

  toggleFormLanguage(lang: 'ar' | 'en'): void {
    console.log('🔄 Language toggle clicked:', lang);
    console.log('📝 Before change - formLanguage:', this.formLanguage);
    console.log('📝 Before change - invoiceForm.language:', this.invoiceForm.language);

    // ✅ FIX: Update both values simultaneously
    this.formLanguage = lang;
    this.invoiceForm.language = lang === 'ar' ? 'arabic' : 'english';

    console.log('✅ After change - formLanguage:', this.formLanguage);
    console.log('✅ After change - invoiceForm.language:', this.invoiceForm.language);

    // ✅ ADDITIONAL: Force change detection to ensure UI updates
    this.cdr.detectChanges();
  }

  // ... (rest of the methods remain the same - continuing in next part due to length)

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
    const newItem = this.proformaInvoiceService.createEmptyInvoiceItem();
    // Set default unit based on current language
    newItem.unit = this.formLanguage === 'ar' ? 'قطعة' : 'pieces';
    this.invoiceForm.items.push(newItem);
  }

  removeItem(index: number): void {
    this.invoiceForm.items.splice(index, 1);
  }

  getItemsCount(): number {
    return this.invoiceForm.items.length;
  }

  calculateItemTotal(item: ProformaInvoiceItem): number {
    return (item.quantity || 0) * (item.unitPrice || 0);
  }

  // ============================================
  // TAX CALCULATION
  // ============================================

  get calculatedTotals() {
    return this.proformaInvoiceService.calculateTotals(
      this.invoiceForm.items,
      this.invoiceForm.includeTax || false,
      this.invoiceForm.taxRate || 0
    );
  }

  toggleTax(includeTax: boolean): void {
    this.invoiceForm.includeTax = includeTax;
    if (!includeTax) {
      this.invoiceForm.taxRate = 0;
      delete this.fieldErrors['taxRate'];
    }
  }

  // ============================================
  // FILE UPLOAD
  // ============================================

  onPdfAttachmentSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validation = this.proformaInvoiceService.validatePDFFile(file);
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

    if (!this.invoiceForm.clientName || this.invoiceForm.clientName.trim() === '') {
      this.fieldErrors['clientName'] = this.formLanguage === 'ar'
        ? 'اسم العميل مطلوب'
        : 'Client name is required';
      isValid = false;
    }

    if (!this.invoiceForm.clientPhone || this.invoiceForm.clientPhone.trim() === '') {
      this.fieldErrors['clientPhone'] = this.formLanguage === 'ar'
        ? 'رقم هاتف العميل مطلوب'
        : 'Phone number is required';
      isValid = false;
    } else if (!this.proformaInvoiceService.validatePhoneNumber(this.invoiceForm.clientPhone)) {
      this.fieldErrors['clientPhone'] = this.formLanguage === 'ar'
        ? 'رقم الهاتف غير صالح'
        : 'Invalid phone number';
      isValid = false;
    }

    if (!this.invoiceForm.date) {
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

    if (this.invoiceForm.items.length > 0) {
      this.invoiceForm.items.forEach((item, index) => {
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

    if (this.invoiceForm.includeTax === true) {
      if (!this.invoiceForm.taxRate || this.invoiceForm.taxRate <= 0) {
        this.fieldErrors['taxRate'] = this.formLanguage === 'ar'
          ? 'نسبة الضريبة مطلوبة'
          : 'Tax rate is required';
        isValid = false;
      }
    } else {
      this.invoiceForm.taxRate = 0;
    }

    return isValid;
  }

  // ============================================
  // SAVE INVOICE - ✅ WITH CRITICAL FIX
  // ============================================

  saveInvoice(): void {
    console.log('💾 ========== SAVE INVOICE CALLED ==========');
    console.log('💾 Current formLanguage:', this.formLanguage);
    console.log('💾 Current invoiceForm.language:', this.invoiceForm.language);

    // ✅ CRITICAL FIX: Ensure invoiceForm.language matches formLanguage before validation
    this.invoiceForm.language = this.formLanguage === 'ar' ? 'arabic' : 'english';
    console.log('💾 ✅ Synchronized invoiceForm.language:', this.invoiceForm.language);

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

    this.savingInvoice = true;
    this.formError = '';

    const invoiceData: CreateProformaInvoiceData = {
      ...this.invoiceForm,
      attachment: this.pdfAttachment || undefined
    };

    console.log('📤 ========== DATA BEING SENT TO API ==========');
    console.log('📤 Invoice Data:', invoiceData);
    console.log('📤 Language field:', invoiceData.language);
    console.log('📤 Expected: "english" for English PDF, "arabic" for Arabic PDF');
    console.log('================================================');

    if (this.currentView === 'create') {
      this.createNewInvoice(invoiceData);
    } else {
      this.updateExistingInvoice(invoiceData);
    }
  }

  createNewInvoice(invoiceData: CreateProformaInvoiceData): void {
    this.proformaInvoiceService.createProformaInvoice(invoiceData).subscribe({
      next: (response) => {
        console.log('✅ Invoice created:', response.data);
        console.log('✅ Created with language:', response.data.language);

        this.savingInvoice = false;
        this.generatedInvoiceId = response.data.id;
        this.showSuccessModal = true;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم إنشاء الفاتورة الأولية بنجاح'
          : 'Proforma invoice created successfully';
        this.showToast('success', successMsg);
      },
      error: (error) => {
        console.error('❌ Error creating invoice:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء إنشاء الفاتورة الأولية'
          : 'Error creating proforma invoice');
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.savingInvoice = false;
      }
    });
  }

  updateExistingInvoice(invoiceData: CreateProformaInvoiceData): void {
    if (!this.selectedInvoice) return;

    this.proformaInvoiceService.updateProformaInvoice(this.selectedInvoice.id, invoiceData).subscribe({
      next: (response) => {
        console.log('✅ Invoice updated:', response.data);
        console.log('✅ Updated with language:', response.data.language);

        this.savingInvoice = false;
        this.generatedInvoiceId = response.data.id;
        this.showSuccessModal = true;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم تحديث الفاتورة الأولية بنجاح'
          : 'Proforma invoice updated successfully';
        this.showToast('success', successMsg);
      },
      error: (error) => {
        console.error('❌ Error updating invoice:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء تحديث الفاتورة الأولية'
          : 'Error updating proforma invoice');
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.savingInvoice = false;
      }
    });
  }

  // (All other methods remain exactly the same)
  // ============================================
  // SUCCESS MODAL ACTIONS
  // ============================================

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.generatedInvoiceId = '';
    this.backToList();
  }

  viewGeneratedPDF(): void {
    const invoice = this.invoices.find(i => i.id === this.generatedInvoiceId);
    if (invoice) {
      this.viewPDF(invoice);
    } else {
      this.proformaInvoiceService.downloadPDF(this.generatedInvoiceId).subscribe({
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
    this.proformaInvoiceService.downloadPDF(this.generatedInvoiceId).subscribe({
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
    const invoice = this.invoices.find(i => i.id === this.generatedInvoiceId);
    const filename = invoice ? `${invoice.invoiceNumber}-${invoice.clientName}.pdf` : `invoice-${this.generatedInvoiceId}.pdf`;
    this.proformaInvoiceService.triggerPDFDownload(this.generatedInvoiceId, filename);
  }

  // ============================================
  // DELETE INVOICE
  // ============================================

  openDeleteModal(invoice: ProformaInvoice): void {
    if (!this.canDeleteInvoice(invoice)) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية لحذف هذه الفاتورة'
        : 'You do not have permission to delete this invoice';
      this.showToast('error', errorMsg);
      return;
    }

    this.selectedInvoice = invoice;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedInvoice = null;
  }

  confirmDelete(): void {
    if (!this.selectedInvoice) return;

    this.deletingInvoice = true;

    this.proformaInvoiceService.deleteProformaInvoice(this.selectedInvoice.id).subscribe({
      next: (response) => {
        const successMsg = this.formLanguage === 'ar'
          ? 'تم حذف الفاتورة الأولية بنجاح'
          : 'Proforma invoice deleted successfully';
        this.showToast('success', successMsg);
        this.deletingInvoice = false;
        this.closeDeleteModal();
        this.loadInvoices();
      },
      error: (error) => {
        console.error('Error deleting invoice:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء حذف الفاتورة الأولية'
          : 'Error deleting proforma invoice');
        this.showToast('error', errorMsg);
        this.deletingInvoice = false;
      }
    });
  }

  // ============================================
  // PDF OPERATIONS
  // ============================================

  downloadPDF(invoice: ProformaInvoice): void {
    const filename = `${invoice.invoiceNumber}-${invoice.clientName}.pdf`;
    this.proformaInvoiceService.triggerPDFDownload(invoice.id, filename);
  }

  viewPDF(invoice: ProformaInvoice): void {
    this.proformaInvoiceService.downloadPDF(invoice.id).subscribe({
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

  printPDF(invoice: ProformaInvoice): void {
    this.proformaInvoiceService.downloadPDF(invoice.id).subscribe({
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

  private printPDFBlob(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = url;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }

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
      this.loadInvoices();
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadInvoices();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadInvoices();
    }
  }

  // ============================================
  // PERMISSION METHODS
  // ============================================

  isSuperAdmin(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  canCreateInvoice(): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    return (
      currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      (currentUser.role === 'employee' && this.hasRouteAccess())
    );
  }

  canEditInvoice(invoice: ProformaInvoice): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    if (currentUser.role === 'super_admin') {
      return true;
    }

    if (currentUser.role === 'admin' ||
        (currentUser.role === 'employee' && this.hasRouteAccess())) {
      return invoice.createdBy === currentUser.id;
    }

    return false;
  }

  canDeleteInvoice(invoice: ProformaInvoice): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    if (currentUser.role === 'super_admin') {
      return true;
    }

    if (currentUser.role === 'admin' ||
        (currentUser.role === 'employee' && this.hasRouteAccess())) {
      return invoice.createdBy === currentUser.id;
    }

    return false;
  }

  canViewInvoice(invoice: ProformaInvoice): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;

    if (currentUser.role === 'super_admin') {
      return true;
    }

    if (currentUser.role === 'admin' ||
        (currentUser.role === 'employee' && this.hasRouteAccess())) {
      return invoice.createdBy === currentUser.id;
    }

    return false;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatCurrency(amount: number): string {
    return this.proformaInvoiceService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.proformaInvoiceService.formatDate(dateString);
  }

  getLanguageLabel(language: 'arabic' | 'english'): string {
    return this.proformaInvoiceService.getLanguageLabel(language);
  }
}
