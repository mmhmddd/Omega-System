// ============================================================
// COSTING SHEET COMPONENT - WITH CORRECTED ARABIC TRANSLATIONS
// costing-sheet.component.ts
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CostingSheetService, CostingSheet, CSItem, CreateCostingSheetData } from '../../core/services/costing-sheet.service';
import { AuthService } from '../../core/services/auth.service';
import { ItemsService, SimpleItem } from '../../core/services/items.service';

type ViewMode = 'list' | 'create' | 'edit' | 'view';
type FormStep = 'basic' | 'items' | 'options';
type FormLanguage = 'ar' | 'en';
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-costing-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './costing-sheet.component.html',
  styleUrl: './costing-sheet.component.scss'
})
export class CostingSheetComponent implements OnInit, OnDestroy {
  // View states
  currentView: ViewMode = 'list';
  currentStep: FormStep = 'basic';
  formLanguage: FormLanguage = 'ar';

  // Data
  costingSheets: CostingSheet[] = [];
  selectedCS: CostingSheet | null = null;

  // Available items from Items API
  availableItems: SimpleItem[] = [];
  loadingItems: boolean = false;

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalCSs: number = 0;
  limit: number = 10;

  // Search
  searchTerm: string = '';
  showFilterModal: boolean = false;
  filters = {
    csNumber: '',
    startDate: '',
    endDate: '',
    client: '',
    project: '',
    search: ''
  };

  private searchSubject = new Subject<string>();

  // Loading states
  loading: boolean = false;
  savingCS: boolean = false;
  generatingPDF: boolean = false;

  // Error handling
  formError: string = '';
  fieldErrors: { [key: string]: string } = {};

  // Form data with includeStaticFile
  csForm: CreateCostingSheetData = {
    date: this.getTodayDate(),
    client: '',
    project: '',
    profitPercentage: 0,
    notes: '',
    items: [],
    additionalNotes: '',
    includeStaticFile: false
  };

  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfCSId: string = '';
  selectedCSNumber: string = '';
  formPdfAttachment: File | null = null;

  // User role
  userRole: string = '';

  // INLINE TOAST STATE
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // INLINE CONFIRMATION STATE
  showConfirmationModal: boolean = false;
  confirmationTitle: string = '';
  confirmationMessage: string = '';
  private confirmationCallback: (() => void) | null = null;

  // SUCCESS MODAL STATE
  showSuccessModal: boolean = false;
  successCSId: string = '';
  successCSNumber: string = '';

  // DUPLICATE MODAL STATE
  showDuplicateModal: boolean = false;
  csToDuplicate: CostingSheet | null = null;


  showShareModal: boolean = false;
  shareCSId: string = '';
  shareCSNumber: string = '';
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
  // Translations (Updated Arabic: كشف التكاليف)
  private translations = {
    ar: {
      errors: {
        required: 'هذا الحقل مطلوب',
        dateRequired: 'التاريخ مطلوب',
        clientRequired: 'العميل مطلوب',
        projectRequired: 'المشروع مطلوب',
        profitPercentageRequired: 'نسبة الربح مطلوبة',
        notesRequired: 'الملاحظات مطلوبة',
        itemsRequired: 'يجب إضافة عنصر واحد على الأقل',
        itemDescriptionRequired: 'الوصف مطلوب للعنصر',
        itemUnitRequired: 'الوحدة مطلوبة للعنصر',
        itemQuantityRequired: 'الكمية مطلوبة للعنصر',
        itemUnitPriceRequired: 'سعر الوحدة مطلوب للعنصر',
        loadFailed: 'فشل تحميل البيانات',
        saveFailed: 'فشل حفظ البيانات',
        deleteFailed: 'فشل حذف كشف التكاليف',
        pdfFailed: 'فشل إنشاء PDF',
        networkError: 'خطأ في الاتصال بالخادم',
        invalidPdfFile: 'يرجى اختيار ملف PDF صالح',
        fileTooLarge: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
        pdfNotGenerated: 'لم يتم إنشاء PDF بعد',
        pdfGenerationWarning: 'تم إنشاء كشف التكاليف ولكن فشل إنشاء PDF',
        pdfUpdateWarning: 'تم تحديث كشف التكاليف ولكن فشل تحديث PDF',
        loadItemsFailed: 'فشل تحميل قائمة العناصر',
        invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
        emailRequired: 'يرجى اختيار بريد إلكتروني أو إدخال بريد مخصص',
        emailFailed: 'فشل إرسال البريد الإلكتروني'
      },
      messages: {
        deleteConfirmTitle: 'تأكيد الحذف',
        deleteConfirmMessage: 'هل أنت متأكد من حذف كشف التكاليف',
        created: 'تم إنشاء كشف التكاليف بنجاح',
        updated: 'تم تحديث كشف التكاليف بنجاح',
        deleted: 'تم حذف كشف التكاليف بنجاح',
        pdfGenerated: 'تم إنشاء ملف PDF بنجاح',
        createdWithPdf: 'تم إنشاء كشف التكاليف وملف PDF بنجاح',
        updatedWithPdf: 'تم تحديث كشف التكاليف وملف PDF بنجاح',
        duplicateSuccess: 'تم نسخ بيانات كشف التكاليف',
        duplicateInfo: 'يمكنك التعديل وحفظ كشف جديد',
        emailSent: 'تم إرسال البريد الإلكتروني بنجاح',
        emailSending: 'جاري إرسال البريد الإلكتروني...'
      }
    },
    en: {
      errors: {
        required: 'This field is required',
        dateRequired: 'Date is required',
        clientRequired: 'Client is required',
        projectRequired: 'Project is required',
        profitPercentageRequired: 'Profit percentage is required',
        notesRequired: 'Notes is required',
        itemsRequired: 'At least one item must be added',
        itemDescriptionRequired: 'Description is required for item',
        itemUnitRequired: 'Unit is required for item',
        itemQuantityRequired: 'Quantity is required for item',
        itemUnitPriceRequired: 'Unit price is required for item',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete costing sheet',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error',
        invalidPdfFile: 'Please select a valid PDF file',
        fileTooLarge: 'File size is too large. Maximum 10MB',
        pdfNotGenerated: 'PDF not generated yet',
        pdfGenerationWarning: 'Costing Sheet created but PDF failed',
        pdfUpdateWarning: 'Costing Sheet updated but PDF failed',
        loadItemsFailed: 'Failed to load items list',
        invalidEmail: 'Please enter a valid email address',
        emailRequired: 'Please select an email or enter a custom email',
        emailFailed: 'Failed to send email'
      },
      messages: {
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMessage: 'Are you sure you want to delete costing sheet',
        created: 'Costing Sheet created successfully',
        updated: 'Costing Sheet updated successfully',
        deleted: 'Costing Sheet deleted successfully',
        pdfGenerated: 'PDF generated successfully',
        createdWithPdf: 'Costing Sheet and PDF created successfully',
        updatedWithPdf: 'Costing Sheet and PDF updated successfully',
        duplicateSuccess: 'Costing Sheet data copied',
        duplicateInfo: 'You can modify and save as a new sheet',
        emailSent: 'Email sent successfully',
        emailSending: 'Sending email...'
      }
    }
  };

  constructor(
    private costingSheetService: CostingSheetService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private itemsService: ItemsService
  ) {}

ngOnInit(): void {
  // ✅ AUTHENTICATION DEBUG - Check if user is logged in
  console.log('🔐 Costing Sheet Component Initialized');
  
  // Check localStorage for auth data
  const token = localStorage.getItem('token');
  const userDataString = localStorage.getItem('user');
  
  console.log('Token exists:', !!token);
  console.log('User data exists:', !!userDataString);
  
  if (!token) {
    console.error('❌ NO TOKEN FOUND! User may not be logged in.');
    console.error('Redirecting to login...');
    this.router.navigate(['/login']);
    return;
  }
  
  if (token) {
    console.log('✅ Token found:', token.substring(0, 20) + '...');
  }
  
  if (userDataString) {
    try {
      const userData = JSON.parse(userDataString);
      console.log('✅ User data:', {
        id: userData.id,
        name: userData.name,
        role: userData.role
      });
      this.userRole = userData.role;
    } catch (e) {
      console.error('❌ Failed to parse user data:', e);
    }
  }
  
  // Log authentication status from service
  this.costingSheetService.logAuthStatus();
  
  // Verify AuthService has user
  const currentUser = this.authService.currentUserValue;
  console.log('AuthService currentUser:', currentUser);
  
  if (!currentUser) {
    console.error('❌ AuthService has no current user!');
    console.error('Redirecting to login...');
    this.router.navigate(['/login']);
    return;
  }
  
  // Set user role from AuthService if not already set
  if (!this.userRole && currentUser) {
    this.userRole = currentUser.role || '';
  }
  
  // If we made it here, we have auth data - proceed with loading
  console.log('✅ Authentication verified, loading data...');
  
  this.loadCostingSheets();
  this.loadAvailableItems();

  this.updateDirection();

  this.searchSubject.pipe(
    debounceTime(500),
    distinctUntilChanged()
  ).subscribe(() => {
    this.currentPage = 1;
    this.loadCostingSheets();
  });
}

  ngOnDestroy(): void {
    this.searchSubject.complete();
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
    this.closeDuplicateModal();
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.setAttribute('dir', 'rtl');
  }

  // ========================================
  // ITEMS API METHODS
  // ========================================

  loadAvailableItems(): void {
    this.loadingItems = true;
    this.itemsService.getSimpleItems().subscribe({
      next: (response) => {
        this.availableItems = response.data;
        this.loadingItems = false;
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.loadingItems = false;
        this.showToast('error', this.t('errors.loadItemsFailed'));
      }
    });
  }

  onItemSelected(index: number, itemId: string): void {
    if (!itemId) {
      this.csForm.items[index].description = '';
      this.csForm.items[index].unit = '';
      return;
    }

    const selectedItem = this.availableItems.find(item => item.id === itemId);

    if (selectedItem) {
      this.csForm.items[index].description = selectedItem.name;
      this.csForm.items[index].unit = selectedItem.unit || '';
    }
  }

  isCustomItem(index: number): boolean {
    const item = this.csForm.items[index];
    if (!item.description) return false;

    return !this.availableItems.some(
      availableItem => availableItem.name === item.description
    );
  }

  getSelectedItemId(index: number): string {
    const item = this.csForm.items[index];
    if (!item.description) return '';

    const foundItem = this.availableItems.find(
      availableItem => availableItem.name === item.description
    );

    return foundItem ? foundItem.id : '';
  }

  hasAutoFilledUnit(index: number): boolean {
    const selectedItemId = this.getSelectedItemId(index);
    if (!selectedItemId) return false;
    
    const selectedItem = this.availableItems.find(item => item.id === selectedItemId);
    return !!(selectedItem && selectedItem.unit && this.csForm.items[index].unit);
  }

  // ========================================
  // INLINE TOAST METHODS
  // ========================================

  showToast(type: ToastType, message: string, duration: number = 3000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message };

    this.toasts.push(toast);

    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimeouts.set(id, timeout);
    }

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

  // ========================================
  // SUCCESS MODAL METHODS
  // ========================================

  openSuccessModal(csId: string, csNumber: string): void {
    this.successCSId = csId;
    this.successCSNumber = csNumber;
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successCSId = '';
    this.successCSNumber = '';
    this.backToList();
  }

  viewPDFFromSuccess(): void {
    if (this.successCSId) {
      this.costingSheetService.viewPDFInNewTab(this.successCSId);
    }
  }

  printPDFFromSuccess(): void {
    if (this.successCSId) {
      this.costingSheetService.openPrintDialog(this.successCSId);
    }
  }

  downloadPDFFromSuccess(): void {
    if (this.successCSId && this.successCSNumber) {
      this.costingSheetService.downloadPDF(this.successCSId, `${this.successCSNumber}.pdf`);
    }
  }

  doneSuccess(): void {
    this.closeSuccessModal();
    this.loadCostingSheets();
  }

  // ========================================
  // INLINE CONFIRMATION METHODS
  // ========================================

  showConfirmation(title: string, message: string, callback: () => void): void {
    this.confirmationTitle = title;
    this.confirmationMessage = message;
    this.confirmationCallback = callback;
    this.showConfirmationModal = true;
  }

  confirmAction(): void {
    if (this.confirmationCallback) {
      this.confirmationCallback();
    }
    this.closeConfirmationModal();
  }

  cancelConfirmation(): void {
    this.closeConfirmationModal();
  }

  private closeConfirmationModal(): void {
    this.showConfirmationModal = false;
    this.confirmationTitle = '';
    this.confirmationMessage = '';
    this.confirmationCallback = null;
  }

  // ========================================
  // DUPLICATE FUNCTIONALITY
  // ========================================

  openDuplicateModal(cs: CostingSheet): void {
    this.csToDuplicate = cs;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.csToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.csToDuplicate) return;

    const cs = this.csToDuplicate;

    this.costingSheetService.getCostingSheetById(cs.id).subscribe({
      next: (response: any) => {
        const sourceCS = response.data;

        this.resetForm();

        const clonedItems = sourceCS.items ? sourceCS.items.map((item: any) => ({
          description: item.description || '',
          unit: item.unit || '',
          quantity: item.quantity || '',
          unitPrice: item.unitPrice || ''
        })) : [];

        this.csForm = {
          date: this.getTodayDate(),
          client: sourceCS.client || '',
          project: sourceCS.project || '',
          profitPercentage: sourceCS.profitPercentage || 0,
          notes: sourceCS.notes || '',
          items: clonedItems,
          additionalNotes: sourceCS.additionalNotes || '',
          includeStaticFile: sourceCS.includeStaticFile || false
        };

        this.currentView = 'create';
        this.currentStep = 'basic';
        this.selectedCS = null;
        this.fieldErrors = {};
        this.formError = '';
        this.formPdfAttachment = null;

        this.closeDuplicateModal();

        const successMsg = this.formLanguage === 'ar'
          ? `تم نسخ بيانات كشف التكاليف ${cs.csNumber}. يمكنك التعديل وحفظ كشف جديد.`
          : `Costing Sheet ${cs.csNumber} data copied. You can modify and save as a new sheet.`;
        this.showToast('info', successMsg, 5000);
      },
      error: (error: any) => {
        console.error('Error fetching costing sheet for duplication:', error);
        this.closeDuplicateModal();
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  toggleFormLanguage(lang: FormLanguage): void {
    this.formLanguage = lang;
    this.updateDirection();
    if (Object.keys(this.fieldErrors).length > 0) {
      this.validateForm();
    }
  }

  private updateDirection(): void {
    const direction = this.formLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.body.setAttribute('dir', direction);
  }

  private t(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations[this.formLanguage];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }

  // ========================================
  // VALIDATION METHODS
  // ========================================

  private validateForm(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    return true;
  }

  private validateBasicFields(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    return true;
  }

  private clearErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  private handleBackendError(error: any): void {
    console.error('Backend error:', error);
    if (error.status === 0) {
      this.formError = this.t('errors.networkError');
      this.showToast('error', this.t('errors.networkError'));
    } else if (error.status === 400 && error.error?.errors) {
      const backendErrors = error.error.errors;
      Object.keys(backendErrors).forEach(key => {
        this.fieldErrors[key] = backendErrors[key];
      });
    } else if (error.error?.message) {
      this.formError = error.error.message;
      this.showToast('error', error.error.message);
    } else {
      this.formError = this.t('errors.saveFailed');
      this.showToast('error', this.t('errors.saveFailed'));
    }
  }

  // ========================================
  // FILE HANDLERS
  // ========================================

  onFormPdfAttachmentSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.showToast('error', this.t('errors.fileTooLarge'));
        event.target.value = '';
        return;
      }
      this.formPdfAttachment = file;
    } else {
      this.showToast('error', this.t('errors.invalidPdfFile'));
      event.target.value = '';
    }
  }

  removeFormPdfAttachment(): void {
    this.formPdfAttachment = null;
    const fileInput = document.getElementById('form-pdf-attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onPDFFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.showToast('error', this.t('errors.fileTooLarge'));
        event.target.value = '';
        return;
      }
      this.pdfAttachment = file;
    } else {
      this.showToast('error', this.t('errors.invalidPdfFile'));
      event.target.value = '';
    }
  }

  removePDFAttachment(): void {
    this.pdfAttachment = null;
    const fileInput = document.getElementById('pdf-attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // ========================================
  // DATA OPERATIONS
  // ========================================

  loadCostingSheets(): void {
    this.loading = true;
    this.clearErrors();

    const filterParams: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      filterParams.search = this.searchTerm.trim();
    }

    if (this.filters.csNumber && this.filters.csNumber.trim() !== '') {
      filterParams.csNumber = this.filters.csNumber.trim();
    }
    if (this.filters.startDate && this.filters.startDate.trim() !== '') {
      filterParams.startDate = this.filters.startDate.trim();
    }
    if (this.filters.endDate && this.filters.endDate.trim() !== '') {
      filterParams.endDate = this.filters.endDate.trim();
    }
    if (this.filters.client && this.filters.client.trim() !== '') {
      filterParams.client = this.filters.client.trim();
    }
    if (this.filters.project && this.filters.project.trim() !== '') {
      filterParams.project = this.filters.project.trim();
    }

    this.costingSheetService.getAllCostingSheets(filterParams).subscribe({
      next: (response: any) => {
        this.costingSheets = response.data;
        this.currentPage = response.pagination.currentPage;
        this.totalPages = response.pagination.totalPages;
        this.totalCSs = response.pagination.totalCostingSheets;
        this.userRole = response.userRole || this.userRole;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading costing sheets:', error);
        this.loading = false;
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadCostingSheets();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadCostingSheets();
    }
  }

  createCS(): void {
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.resetForm();
    this.clearErrors();
  }

  editCS(cs: CostingSheet): void {
    this.clearErrors();
    this.costingSheetService.getCostingSheetById(cs.id).subscribe({
      next: (response: any) => {
        const freshCS = response.data;
        this.selectedCS = freshCS;
        this.currentView = 'edit';
        this.currentStep = 'basic';

        const clonedItems = freshCS.items ? freshCS.items.map((item: any) => ({
          description: item.description || '',
          unit: item.unit || '',
          quantity: item.quantity || '',
          unitPrice: item.unitPrice || ''
        })) : [];

        this.csForm = {
          date: freshCS.date || this.getTodayDate(),
          client: freshCS.client || '',
          project: freshCS.project || '',
          profitPercentage: freshCS.profitPercentage || 0,
          notes: freshCS.notes || '',
          items: clonedItems,
          additionalNotes: freshCS.additionalNotes || '',
          includeStaticFile: freshCS.includeStaticFile || false
        };
      },
      error: (error: any) => {
        console.error('Error fetching costing sheet:', error);
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  showDeleteConfirmation(cs: CostingSheet): void {
    const title = this.t('messages.deleteConfirmTitle');
    const message = `${this.t('messages.deleteConfirmMessage')} ${cs.csNumber}?`;
    this.showConfirmation(title, message, () => {
      this.performDelete(cs);
    });
  }

  private performDelete(cs: CostingSheet): void {
    this.costingSheetService.deleteCostingSheet(cs.id).subscribe({
      next: () => {
        this.showToast('success', this.t('messages.deleted'));
        this.loadCostingSheets();
      },
      error: (error: any) => {
        console.error('Error deleting costing sheet:', error);
        this.showToast('error', this.t('errors.deleteFailed'));
      }
    });
  }

  saveCS(): void {
    this.savingCS = true;
    this.clearErrors();

    const formattedItems = this.csForm.items.map(item => ({
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity ? Number(item.quantity) : 0,
      unitPrice: item.unitPrice ? Number(item.unitPrice) : 0
    }));

    const csData: CreateCostingSheetData = {
      date: this.csForm.date,
      client: this.csForm.client,
      project: this.csForm.project,
      profitPercentage: Number(this.csForm.profitPercentage) || 0,
      notes: this.csForm.notes,
      items: formattedItems,
      additionalNotes: this.csForm.additionalNotes,
      includeStaticFile: this.csForm.includeStaticFile
    };

    if (this.currentView === 'create') {
      this.costingSheetService.createCostingSheet(csData).subscribe({
        next: (response: any) => {
          const createdCS = response.data;
          this.costingSheetService.generatePDF(createdCS.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingCS = false;
              this.showToast('success', this.t('messages.createdWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(createdCS.id, createdCS.csNumber);
              }, 500);
            },
            error: () => {
              this.savingCS = false;
              this.showToast('warning', this.t('errors.pdfGenerationWarning'));
              this.backToList();
              this.loadCostingSheets();
            }
          });
        },
        error: (error: any) => {
          this.savingCS = false;
          this.handleBackendError(error);
        }
      });
    } else if (this.currentView === 'edit' && this.selectedCS) {
      this.costingSheetService.updateCostingSheet(this.selectedCS.id, csData).subscribe({
        next: (response: any) => {
          const updatedCS = response.data;
          this.costingSheetService.generatePDF(updatedCS.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingCS = false;
              this.showToast('success', this.t('messages.updatedWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(updatedCS.id, updatedCS.csNumber);
              }, 500);
            },
            error: () => {
              this.savingCS = false;
              this.showToast('warning', this.t('errors.pdfUpdateWarning'));
              this.backToList();
              this.loadCostingSheets();
            }
          });
        },
        error: (error: any) => {
          this.savingCS = false;
          this.handleBackendError(error);
        }
      });
    }
  }

  // ========================================
  // PDF OPERATIONS
  // ========================================

  viewPDF(cs: CostingSheet): void {
    if (!cs.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.costingSheetService.viewPDFInNewTab(cs.id);
  }

  printCSPDF(cs: CostingSheet): void {
    if (!cs.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.costingSheetService.openPrintDialog(cs.id);
  }

  downloadPDF(cs: CostingSheet): void {
    if (cs.pdfFilename) {
      this.costingSheetService.downloadPDF(cs.id, cs.pdfFilename);
    }
  }

  openPDFModal(cs: CostingSheet): void {
    this.pdfCSId = cs.id;
    this.selectedCSNumber = cs.csNumber;
    this.showPDFModal = true;
    this.pdfAttachment = null;
  }

  closePDFModal(): void {
    this.showPDFModal = false;
    this.pdfAttachment = null;
    this.pdfCSId = '';
    this.selectedCSNumber = '';
  }

  getPDFFilename(): string {
    if (!this.selectedCSNumber) return '';
    return `${this.selectedCSNumber}.pdf`;
  }

  generatePDF(): void {
    this.generatingPDF = true;
    this.costingSheetService.generatePDF(this.pdfCSId, this.pdfAttachment || undefined).subscribe({
      next: () => {
        this.generatingPDF = false;
        this.closePDFModal();
        this.showToast('success', this.t('messages.pdfGenerated'));
        this.loadCostingSheets();
      },
      error: (error: any) => {
        console.error('Error generating PDF:', error);
        this.generatingPDF = false;
        const errorMsg = error.error?.message || this.t('errors.pdfFailed');
        this.showToast('error', errorMsg);
      }
    });
  }


  // ========================================
// ✅ SHARE/EMAIL FUNCTIONALITY
// ========================================

openShareModal(cs: CostingSheet): void {
  if (!cs.pdfFilename) {
    this.showToast('error', this.t('errors.pdfNotGenerated'));
    return;
  }
  this.shareCSId = cs.id;
  this.shareCSNumber = cs.csNumber;
  
  this.emailSelections = {
    email1: false,
    email2: false,
    custom: false
  };
  this.customEmail = '';
  this.showShareModal = true;
}

closeShareModal(): void {
  this.showShareModal = false;
  this.shareCSId = '';
  this.shareCSNumber = '';
  this.emailSelections = {
    email1: false,
    email2: false,
    custom: false
  };
  this.customEmail = '';
}

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

isEmailValid(): boolean {
  const selectedEmails = this.getSelectedEmailsList();
  
  if (selectedEmails.length === 0) {
    return false;
  }
  
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
  
  let completedCount = 0;
  let failedCount = 0;
  
  const sendToNextEmail = (index: number) => {
    if (index >= selectedEmails.length) {
      this.sendingEmail = false;
      this.closeShareModal();
      
      if (failedCount === 0) {
        const successMsg = this.formLanguage === 'ar'
          ? `تم الإرسال بنجاح إلى ${completedCount} بريد إلكتروني`
          : `Sent successfully to ${completedCount} email${completedCount > 1 ? 's' : ''}`;
        this.showToast('success', successMsg);
      } else if (completedCount > 0) {
        const partialMsg = this.formLanguage === 'ar'
          ? `تم الإرسال إلى ${completedCount} من أصل ${selectedEmails.length} بريد`
          : `Sent to ${completedCount} of ${selectedEmails.length} emails`;
        this.showToast('warning', partialMsg);
      } else {
        this.showToast('error', this.t('errors.emailFailed'));
      }
      return;
    }
    
    const email = selectedEmails[index];
    
    this.costingSheetService.sendCostingSheetByEmail(this.shareCSId, email).subscribe({
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
  
  sendToNextEmail(0);
}

shareFromSuccessModal(): void {
  if (this.successCSId) {
    this.closeSuccessModal();
    this.costingSheetService.getCostingSheetById(this.successCSId).subscribe({
      next: (response: any) => {
        this.openShareModal(response.data);
      },
      error: () => {
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }
}

isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}
  // ========================================
  // FORM NAVIGATION
  // ========================================

  nextStep(): void {
    if (this.currentStep === 'basic') {
      this.currentStep = 'items';
    } else if (this.currentStep === 'items') {
      this.currentStep = 'options';
    }
  }

  previousStep(): void {
    if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    } else if (this.currentStep === 'options') {
      this.currentStep = 'items';
    }
  }

  addItem(): void {
    this.csForm.items.push({
      description: '',
      unit: '',
      quantity: '',
      unitPrice: ''
    });
  }

  removeItem(index: number): void {
    this.csForm.items.splice(index, 1);
    delete this.fieldErrors[`item_${index}_description`];
    delete this.fieldErrors[`item_${index}_unit`];
    delete this.fieldErrors[`item_${index}_quantity`];
    delete this.fieldErrors[`item_${index}_unitPrice`];
  }

  backToList(): void {
    this.currentView = 'list';
    this.currentStep = 'basic';
    this.selectedCS = null;
    this.resetForm();
    this.clearErrors();
    this.formPdfAttachment = null;
  }

  resetForm(): void {
    this.csForm = {
      date: this.getTodayDate(),
      client: '',
      project: '',
      profitPercentage: 0,
      notes: '',
      items: [],
      additionalNotes: '',
      includeStaticFile: false
    };
    this.formPdfAttachment = null;
    this.clearErrors();
  }

  // ========================================
  // PROFIT CALCULATION METHODS
  // ========================================

  calculateItemTotal(item: CSItem): number {
    const quantity = parseFloat(item.quantity as string) || 0;
    const unitPrice = parseFloat(item.unitPrice as string) || 0;
    return quantity * unitPrice;
  }

  calculateSubtotal(): number {
    return this.csForm.items.reduce((sum, item) => {
      return sum + this.calculateItemTotal(item);
    }, 0);
  }

  calculateProfit(): number {
    const subtotal = this.calculateSubtotal();
    const profitPercentage = parseFloat(this.csForm.profitPercentage as any) || 0;
    return (subtotal * profitPercentage) / 100;
  }

  calculateGrandTotal(): number {
    return this.calculateSubtotal() + this.calculateProfit();
  }

  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  // ========================================
  // UTILITIES
  // ========================================

  getTodayDate(): string {
    return this.costingSheetService.getTodayDate();
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  getItemsCount(): number {
    return this.csForm.items.length;
  }

  getCreatorName(cs: CostingSheet): string {
    if (cs.createdByName && cs.createdByName.trim() !== '') {
      return cs.createdByName;
    }
    return cs.createdBy || '-';
  }

  getStatusClass(cs: CostingSheet): string {
    if (cs.status === 'pending') return 'status-pending';
    if (cs.status === 'approved') return 'status-approved';
    if (cs.status === 'rejected') return 'status-rejected';
    return cs.pdfFilename ? 'status-generated' : 'status-draft';
  }

  getStatusText(cs: CostingSheet): string {
    if (this.formLanguage === 'ar') {
      if (cs.status === 'pending') return 'قيد الانتظار';
      if (cs.status === 'approved') return 'موافق عليه';
      if (cs.status === 'rejected') return 'مرفوض';
      return cs.pdfFilename ? 'تم الإنشاء' : 'مسودة';
    }
    if (cs.status === 'pending') return 'Pending';
    if (cs.status === 'approved') return 'Approved';
    if (cs.status === 'rejected') return 'Rejected';
    return cs.pdfFilename ? 'Generated' : 'Draft';
  }

  getRoleClass(role: string): string {
    if (role === 'super_admin') return 'role-super';
    if (role === 'admin') return 'role-admin';
    return 'role-user';
  }

  getRoleText(role: string): string {
    if (this.formLanguage === 'ar') {
      if (role === 'super_admin') return 'مدير عام';
      if (role === 'admin') return 'مدير';
      return 'موظف';
    }
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    return 'Employee';
  }

  hasPDF(cs: CostingSheet): boolean {
    return !!cs.pdfFilename;
  }
}