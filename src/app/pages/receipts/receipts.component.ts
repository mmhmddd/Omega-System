import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReceiptService, Receipt, ReceiptItem, CreateReceiptData } from '../../core/services/receipt.service';
import { AuthService } from '../../core/services/auth.service';

type ViewMode = 'list' | 'create' | 'edit' | 'view';
type FormStep = 'basic' | 'items';
type FormLanguage = 'ar' | 'en';

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receipts.component.html',
  styleUrl: './receipts.component.scss'
})
export class ReceiptsComponent implements OnInit, OnDestroy {
  // View states
  currentView: ViewMode = 'list';
  currentStep: FormStep = 'basic';
  formLanguage: FormLanguage = 'ar'; // Default to Arabic
  
  // Data
  receipts: Receipt[] = [];
  selectedReceipt: Receipt | null = null;
  
  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalReceipts: number = 0;
  limit: number = 10;
  
  // Search and filters
  searchTerm: string = '';
  showFilterModal: boolean = false;
  filters = {
    receiptNumber: '',
    startDate: '',
    endDate: '',
    to: ''
  };
  
  // Search debounce
  private searchSubject = new Subject<string>();
  
  // Loading states
  loading: boolean = false;
  savingReceipt: boolean = false;
  generatingPDF: boolean = false;
  
  // Error handling
  formError: string = '';
  fieldErrors: { [key: string]: string } = {};
  
  // Form data
  receiptForm: CreateReceiptData = {
    to: '',
    date: this.getTodayDate(),
    address: '',
    addressTitle: '',
    attention: '',
    projectCode: '',
    workLocation: '',
    companyNumber: '',
    additionalText: '',
    items: [],
    notes: ''
  };
  
  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfReceiptId: string = '';
  
  // User role
  userRole: string = '';
  
  // Translation object
  private translations = {
    ar: {
      errors: {
        required: 'هذا الحقل مطلوب',
        dateRequired: 'التاريخ مطلوب',
        toRequired: 'حقل "إلى" مطلوب',
        invalidDate: 'تاريخ غير صالح',
        loadFailed: 'فشل تحميل البيانات',
        saveFailed: 'فشل حفظ البيانات',
        deleteFailed: 'فشل حذف الإشعار',
        pdfFailed: 'فشل إنشاء PDF',
        networkError: 'خطأ في الاتصال بالخادم'
      },
      messages: {
        deleteConfirm: 'هل أنت متأكد من حذف إشعار الاستلام',
        created: 'تم إنشاء الإشعار بنجاح',
        updated: 'تم تحديث الإشعار بنجاح',
        deleted: 'تم حذف الإشعار بنجاح'
      }
    },
    en: {
      errors: {
        required: 'This field is required',
        dateRequired: 'Date is required',
        toRequired: 'To field is required',
        invalidDate: 'Invalid date',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete receipt',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error'
      },
      messages: {
        deleteConfirm: 'Are you sure you want to delete receipt',
        created: 'Receipt created successfully',
        updated: 'Receipt updated successfully',
        deleted: 'Receipt deleted successfully'
      }
    }
  };
  
  constructor(
    private receiptService: ReceiptService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
    const user = this.authService.currentUserValue;
    this.userRole = user ? user.role : '';
    
    // Set default direction to RTL (Arabic)
    this.updateDirection();
    
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(500), // Wait 500ms after user stops typing
      distinctUntilChanged() // Only if search term changed
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadReceipts();
    });
  }

  /**
   * Toggle form language (Arabic/English) and direction
   */
  toggleFormLanguage(lang: FormLanguage): void {
    this.formLanguage = lang;
    this.updateDirection();
    
    // Re-validate if there are errors to update error messages
    if (Object.keys(this.fieldErrors).length > 0) {
      this.validateForm();
    }
  }

  /**
   * Update HTML direction based on language
   */
  private updateDirection(): void {
    const direction = this.formLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.body.setAttribute('dir', direction);
  }

  /**
   * Reset direction when leaving component
   */
  ngOnDestroy(): void {
    // Complete search subject
    this.searchSubject.complete();
    
    // Reset to default RTL when leaving receipts page
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.setAttribute('dir', 'rtl');
  }

  /**
   * Get translated text
   */
  private t(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations[this.formLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  }

  /**
   * Validate form fields
   */
  private validateForm(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    let isValid = true;

    // Validate required: To
    if (!this.receiptForm.to || this.receiptForm.to.trim() === '') {
      this.fieldErrors['to'] = this.t('errors.toRequired');
      isValid = false;
    }

    // Validate required: Date
    if (!this.receiptForm.date) {
      this.fieldErrors['date'] = this.t('errors.dateRequired');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Clear all errors
   */
  private clearErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  /**
   * Handle backend errors
   */
  private handleBackendError(error: any): void {
    console.error('Backend error:', error);
    
    if (error.status === 0) {
      this.formError = this.t('errors.networkError');
    } else if (error.status === 400 && error.error?.errors) {
      // Handle field-specific errors from backend
      const backendErrors = error.error.errors;
      Object.keys(backendErrors).forEach(key => {
        this.fieldErrors[key] = backendErrors[key];
      });
    } else if (error.error?.message) {
      this.formError = error.error.message;
    } else {
      this.formError = this.t('errors.saveFailed');
    }
  }

  /**
   * Load receipts from API with search/filter
   */
  loadReceipts(): void {
    this.loading = true;
    this.clearErrors();
    
    const filterParams = {
      search: this.searchTerm || undefined,
      receiptNumber: this.filters.receiptNumber || undefined,
      startDate: this.filters.startDate || undefined,
      endDate: this.filters.endDate || undefined,
      to: this.filters.to || undefined,
      page: this.currentPage,
      limit: this.limit
    };

    this.receiptService.getAllReceipts(filterParams).subscribe({
      next: (response: any) => {
        this.receipts = response.data;
        this.currentPage = response.pagination.currentPage;
        this.totalPages = response.pagination.totalPages;
        this.totalReceipts = response.pagination.totalReceipts;
        this.userRole = response.userRole || this.userRole;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading receipts:', error);
        this.loading = false;
        this.formError = this.t('errors.loadFailed');
      }
    });
  }

  /**
   * Search receipts - triggers on Enter key
   */
  onSearch(): void {
    this.currentPage = 1;
    this.loadReceipts();
  }

  /**
   * Real-time search as user types (with debounce)
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.currentPage = 1;
    this.showFilterModal = false;
    this.loadReceipts();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.filters = {
      receiptNumber: '',
      startDate: '',
      endDate: '',
      to: ''
    };
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadReceipts();
  }

  /**
   * Pagination
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadReceipts();
    }
  }

  /**
   * Get status badge class
   */
  getStatusClass(receipt: Receipt): string {
    return receipt.pdfFilename ? 'status-generated' : 'status-draft';
  }

  /**
   * Get status text
   */
  getStatusText(receipt: Receipt): string {
    return receipt.pdfFilename ? 'generated' : 'draft';
  }

  /**
   * Check if PDF exists
   */
  hasPDF(receipt: Receipt): boolean {
    return !!receipt.pdfFilename;
  }

  /**
   * Navigate to create receipt
   */
  createReceipt(): void {
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.resetForm();
    this.clearErrors();
  }

  /**
   * View receipt details
   */
  viewReceipt(receipt: Receipt): void {
    this.selectedReceipt = receipt;
    this.currentView = 'view';
  }

  /**
   * Edit receipt - Fetch fresh data from backend
   */
  editReceipt(receipt: Receipt): void {
    this.clearErrors();
    
    // Fetch fresh data from backend
    this.receiptService.getReceiptById(receipt.id).subscribe({
      next: (response: any) => {
        const freshReceipt = response.data;
        this.selectedReceipt = freshReceipt;
        this.currentView = 'edit';
        this.currentStep = 'basic';
        
        // Populate form with fresh backend data
        this.receiptForm = {
          to: freshReceipt.to || '',
          date: freshReceipt.date || this.getTodayDate(),
          address: freshReceipt.address || '',
          addressTitle: freshReceipt.addressTitle || '',
          attention: freshReceipt.attention || '',
          projectCode: freshReceipt.projectCode || '',
          workLocation: freshReceipt.workLocation || '',
          companyNumber: freshReceipt.companyNumber || '',
          additionalText: freshReceipt.additionalText || '',
          items: JSON.parse(JSON.stringify(freshReceipt.items || [])), // Deep copy
          notes: freshReceipt.notes || ''
        };
      },
      error: (error: any) => {
        console.error('Error fetching receipt:', error);
        this.formError = this.t('errors.loadFailed');
      }
    });
  }

  /**
   * Delete receipt
   */
  deleteReceipt(receipt: Receipt): void {
    const confirmMessage = `${this.t('messages.deleteConfirm')} ${receipt.receiptNumber}?`;
    
    if (confirm(confirmMessage)) {
      this.receiptService.deleteReceipt(receipt.id).subscribe({
        next: () => {
          alert(this.t('messages.deleted'));
          this.loadReceipts();
        },
        error: (error: any) => {
          console.error('Error deleting receipt:', error);
          alert(this.t('errors.deleteFailed'));
        }
      });
    }
  }

  /**
   * Generate PDF
   */
  openPDFModal(receipt: Receipt): void {
    this.pdfReceiptId = receipt.id;
    this.showPDFModal = true;
    this.pdfAttachment = null;
  }

  onPDFFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.pdfAttachment = file;
    } else {
      const errorMsg = this.formLanguage === 'ar' 
        ? 'يرجى اختيار ملف PDF صالح'
        : 'Please select a valid PDF file';
      alert(errorMsg);
      event.target.value = '';
    }
  }

  generatePDF(): void {
    this.generatingPDF = true;
    
    this.receiptService.generatePDF(this.pdfReceiptId, this.pdfAttachment || undefined).subscribe({
      next: (response: any) => {
        this.generatingPDF = false;
        this.showPDFModal = false;
        alert(response.message);
        this.loadReceipts();
      },
      error: (error: any) => {
        console.error('Error generating PDF:', error);
        this.generatingPDF = false;
        alert(this.t('errors.pdfFailed'));
      }
    });
  }

  /**
   * Download PDF
   */
  downloadPDF(receipt: Receipt): void {
    if (receipt.pdfFilename) {
      this.receiptService.downloadPDF(receipt.id);
    }
  }

  /**
   * Form navigation
   */
  nextStep(): void {
    if (this.currentStep === 'basic') {
      if (this.validateForm()) {
        this.currentStep = 'items';
      }
    }
  }

  previousStep(): void {
    if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    }
  }

  /**
   * Items management
   */
  addItem(): void {
    this.receiptForm.items.push({
      quantity: '',
      description: '',
      element: ''
    });
  }

  removeItem(index: number): void {
    this.receiptForm.items.splice(index, 1);
  }

  /**
   * Save receipt (Create or Update)
   */
  saveReceipt(): void {
    // Validate form
    if (!this.validateForm()) {
      return;
    }

    this.savingReceipt = true;
    this.clearErrors();

    const receiptData = { ...this.receiptForm };

    if (this.currentView === 'create') {
      // CREATE
      this.receiptService.createReceipt(receiptData).subscribe({
        next: (response: any) => {
          this.savingReceipt = false;
          alert(this.t('messages.created'));
          this.backToList();
          this.loadReceipts();
        },
        error: (error: any) => {
          this.savingReceipt = false;
          this.handleBackendError(error);
        }
      });
    } else if (this.currentView === 'edit' && this.selectedReceipt) {
      // UPDATE
      this.receiptService.updateReceipt(this.selectedReceipt.id, receiptData).subscribe({
        next: (response: any) => {
          this.savingReceipt = false;
          alert(this.t('messages.updated'));
          this.backToList();
          this.loadReceipts();
        },
        error: (error: any) => {
          this.savingReceipt = false;
          this.handleBackendError(error);
        }
      });
    }
  }

  /**
   * Cancel and go back
   */
  backToList(): void {
    this.currentView = 'list';
    this.currentStep = 'basic';
    this.selectedReceipt = null;
    this.resetForm();
    this.clearErrors();
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.receiptForm = {
      to: '',
      date: this.getTodayDate(),
      address: '',
      addressTitle: '',
      attention: '',
      projectCode: '',
      workLocation: '',
      companyNumber: '',
      additionalText: '',
      items: [],
      notes: ''
    };
    this.clearErrors();
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate(): string {
    return this.receiptService.getTodayDate();
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  /**
   * Get items count
   */
  getItemsCount(): number {
    return this.receiptForm.items.length;
  }
}