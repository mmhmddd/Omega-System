// receipts.component.ts - WITH SUCCESS MODAL AFTER SAVE

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReceiptService, Receipt, ReceiptItem, CreateReceiptData } from '../../core/services/receipt.service';
import { AuthService } from '../../core/services/auth.service';

type ViewMode = 'list' | 'create' | 'edit' | 'view';
type FormStep = 'basic' | 'items';
type FormLanguage = 'ar' | 'en';
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

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
  formLanguage: FormLanguage = 'ar';
  
  // Data
  receipts: Receipt[] = [];
  selectedReceipt: Receipt | null = null;
  
  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalReceipts: number = 0;
  limit: number = 10;
  
  // Search
  searchTerm: string = '';
  showFilterModal: boolean = false;
  filters = {
    receiptNumber: '',
    startDate: '',
    endDate: '',
    to: ''
  };
  
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
    vehicleNumber: '',
    additionalText: '',
    items: [],
    notes: ''
  };
  
  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfReceiptId: string = '';
  selectedReceiptNumber: string = '';
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
  successReceiptId: string = '';
  successReceiptNumber: string = '';
  
  // Translations
  private translations = {
    ar: {
      errors: {
        required: 'هذا الحقل مطلوب',
        dateRequired: 'التاريخ مطلوب',
        toRequired: 'حقل "إلى" مطلوب',
        addressRequired: 'العنوان مطلوب',
        attentionRequired: 'حقل "عناية" مطلوب',
        projectCodeRequired: 'رمز المشروع مطلوب',
        workLocationRequired: 'موقع العمل مطلوب',
        vehicleNumberRequired: 'رقم المركبة مطلوب',
        notesRequired: 'الملاحظات مطلوبة',
        itemsRequired: 'يجب إضافة عنصر واحد على الأقل',
        itemQuantityRequired: 'الكمية مطلوبة للعنصر',
        itemDescriptionRequired: 'الوصف مطلوب للعنصر',
        itemElementRequired: 'العنصر مطلوب للعنصر',
        loadFailed: 'فشل تحميل البيانات',
        saveFailed: 'فشل حفظ البيانات',
        deleteFailed: 'فشل حذف الإشعار',
        pdfFailed: 'فشل إنشاء PDF',
        networkError: 'خطأ في الاتصال بالخادم',
        invalidPdfFile: 'يرجى اختيار ملف PDF صالح',
        fileTooLarge: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
        pdfNotGenerated: 'لم يتم إنشاء PDF بعد',
        pdfGenerationWarning: 'تم إنشاء الإشعار ولكن فشل إنشاء PDF',
        pdfUpdateWarning: 'تم تحديث الإشعار ولكن فشل تحديث PDF'
      },
      messages: {
        deleteConfirmTitle: 'تأكيد الحذف',
        deleteConfirmMessage: 'هل أنت متأكد من حذف إشعار الاستلام',
        created: 'تم إنشاء الإشعار بنجاح',
        updated: 'تم تحديث الإشعار بنجاح',
        deleted: 'تم حذف الإشعار بنجاح',
        pdfGenerated: 'تم إنشاء ملف PDF بنجاح',
        createdWithPdf: 'تم إنشاء الإشعار وملف PDF بنجاح',
        updatedWithPdf: 'تم تحديث الإشعار وملف PDF بنجاح',
        successTitle: 'تم إنشاء السعر بنجاح',
        successMessage: 'يمكنك ماذا تريد أن تفعل؟ PDF تم إنشاء ملف'
      }
    },
    en: {
      errors: {
        required: 'This field is required',
        dateRequired: 'Date is required',
        toRequired: 'To field is required',
        addressRequired: 'Address is required',
        attentionRequired: 'Attention field is required',
        projectCodeRequired: 'Project Code is required',
        workLocationRequired: 'Work Location is required',
        vehicleNumberRequired: 'Vehicle Number is required',
        notesRequired: 'Notes are required',
        itemsRequired: 'At least one item must be added',
        itemQuantityRequired: 'Quantity is required for item',
        itemDescriptionRequired: 'Description is required for item',
        itemElementRequired: 'Element is required for item',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete receipt',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error',
        invalidPdfFile: 'Please select a valid PDF file',
        fileTooLarge: 'File size is too large. Maximum 10MB',
        pdfNotGenerated: 'PDF not generated yet',
        pdfGenerationWarning: 'Receipt created but PDF failed',
        pdfUpdateWarning: 'Receipt updated but PDF failed'
      },
      messages: {
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMessage: 'Are you sure you want to delete receipt',
        created: 'Receipt created successfully',
        updated: 'Receipt updated successfully',
        deleted: 'Receipt deleted successfully',
        pdfGenerated: 'PDF generated successfully',
        createdWithPdf: 'Receipt and PDF created successfully',
        updatedWithPdf: 'Receipt and PDF updated successfully',
        successTitle: 'Quote Created Successfully',
        successMessage: 'PDF file has been created. What would you like to do?'
      }
    }
  };
  
  constructor(
    private receiptService: ReceiptService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadReceipts();
    const user = this.authService.currentUserValue;
    this.userRole = user ? user.role : '';
    
    this.updateDirection();
    
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadReceipts();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.setAttribute('dir', 'rtl');
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
  
  openSuccessModal(receiptId: string, receiptNumber: string): void {
    this.successReceiptId = receiptId;
    this.successReceiptNumber = receiptNumber;
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successReceiptId = '';
    this.successReceiptNumber = '';
    this.backToList();
  }

  viewPDFFromSuccess(): void {
    if (this.successReceiptId) {
      this.receiptService.viewPDFInNewTab(this.successReceiptId);
    }
  }

  printPDFFromSuccess(): void {
    if (this.successReceiptId) {
      this.receiptService.openPrintDialog(this.successReceiptId);
    }
  }

  downloadPDFFromSuccess(): void {
    if (this.successReceiptId && this.successReceiptNumber) {
      this.receiptService.downloadPDF(this.successReceiptId, `${this.successReceiptNumber}.pdf`);
    }
  }

  doneSuccess(): void {
    this.closeSuccessModal();
    this.loadReceipts();
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

  private validateForm(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    let isValid = true;

    if (!this.receiptForm.to || this.receiptForm.to.trim() === '') {
      this.fieldErrors['to'] = this.t('errors.toRequired');
      isValid = false;
    }
    if (!this.receiptForm.date) {
      this.fieldErrors['date'] = this.t('errors.dateRequired');
      isValid = false;
    }
    if (!this.receiptForm.address || this.receiptForm.address.trim() === '') {
      this.fieldErrors['address'] = this.t('errors.addressRequired');
      isValid = false;
    }
    if (!this.receiptForm.attention || this.receiptForm.attention.trim() === '') {
      this.fieldErrors['attention'] = this.t('errors.attentionRequired');
      isValid = false;
    }
    if (!this.receiptForm.projectCode || this.receiptForm.projectCode.trim() === '') {
      this.fieldErrors['projectCode'] = this.t('errors.projectCodeRequired');
      isValid = false;
    }
    if (!this.receiptForm.workLocation || this.receiptForm.workLocation.trim() === '') {
      this.fieldErrors['workLocation'] = this.t('errors.workLocationRequired');
      isValid = false;
    }
    if (!this.receiptForm.vehicleNumber || this.receiptForm.vehicleNumber.trim() === '') {
      this.fieldErrors['vehicleNumber'] = this.t('errors.vehicleNumberRequired');
      isValid = false;
    }
    if (!this.receiptForm.notes || this.receiptForm.notes.trim() === '') {
      this.fieldErrors['notes'] = this.t('errors.notesRequired');
      isValid = false;
    }
    if (!this.receiptForm.items || this.receiptForm.items.length === 0) {
      this.fieldErrors['items'] = this.t('errors.itemsRequired');
      isValid = false;
    } else {
      this.receiptForm.items.forEach((item, index) => {
        if (!item.quantity || item.quantity.toString().trim() === '') {
          this.fieldErrors[`item_${index}_quantity`] = this.t('errors.itemQuantityRequired');
          isValid = false;
        }
        if (!item.description || item.description.trim() === '') {
          this.fieldErrors[`item_${index}_description`] = this.t('errors.itemDescriptionRequired');
          isValid = false;
        }
        if (!item.element || item.element.trim() === '') {
          this.fieldErrors[`item_${index}_element`] = this.t('errors.itemElementRequired');
          isValid = false;
        }
      });
    }
    return isValid;
  }

  private validateBasicFields(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    let isValid = true;

    if (!this.receiptForm.to || this.receiptForm.to.trim() === '') {
      this.fieldErrors['to'] = this.t('errors.toRequired');
      isValid = false;
    }
    if (!this.receiptForm.date) {
      this.fieldErrors['date'] = this.t('errors.dateRequired');
      isValid = false;
    }
    if (!this.receiptForm.address || this.receiptForm.address.trim() === '') {
      this.fieldErrors['address'] = this.t('errors.addressRequired');
      isValid = false;
    }
    if (!this.receiptForm.attention || this.receiptForm.attention.trim() === '') {
      this.fieldErrors['attention'] = this.t('errors.attentionRequired');
      isValid = false;
    }
    if (!this.receiptForm.projectCode || this.receiptForm.projectCode.trim() === '') {
      this.fieldErrors['projectCode'] = this.t('errors.projectCodeRequired');
      isValid = false;
    }
    if (!this.receiptForm.workLocation || this.receiptForm.workLocation.trim() === '') {
      this.fieldErrors['workLocation'] = this.t('errors.workLocationRequired');
      isValid = false;
    }
    if (!this.receiptForm.vehicleNumber || this.receiptForm.vehicleNumber.trim() === '') {
      this.fieldErrors['vehicleNumber'] = this.t('errors.vehicleNumberRequired');
      isValid = false;
    }
    if (!this.receiptForm.notes || this.receiptForm.notes.trim() === '') {
      this.fieldErrors['notes'] = this.t('errors.notesRequired');
      isValid = false;
    }
    return isValid;
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
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadReceipts();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadReceipts();
    }
  }

  createReceipt(): void {
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.resetForm();
    this.clearErrors();
  }

  editReceipt(receipt: Receipt): void {
    this.clearErrors();
    this.receiptService.getReceiptById(receipt.id).subscribe({
      next: (response: any) => {
        const freshReceipt = response.data;
        this.selectedReceipt = freshReceipt;
        this.currentView = 'edit';
        this.currentStep = 'basic';
        this.receiptForm = {
          to: freshReceipt.to || '',
          date: freshReceipt.date || this.getTodayDate(),
          address: freshReceipt.address || '',
          addressTitle: freshReceipt.addressTitle || '',
          attention: freshReceipt.attention || '',
          projectCode: freshReceipt.projectCode || '',
          workLocation: freshReceipt.workLocation || '',
          companyNumber: '',
          vehicleNumber: freshReceipt.companyNumber || '',
          additionalText: freshReceipt.additionalText || '',
          items: JSON.parse(JSON.stringify(freshReceipt.items || [])),
          notes: freshReceipt.notes || ''
        };
      },
      error: (error: any) => {
        console.error('Error fetching receipt:', error);
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  showDeleteConfirmation(receipt: Receipt): void {
    const title = this.t('messages.deleteConfirmTitle');
    const message = `${this.t('messages.deleteConfirmMessage')} ${receipt.receiptNumber}?`;
    this.showConfirmation(title, message, () => {
      this.performDelete(receipt);
    });
  }

  private performDelete(receipt: Receipt): void {
    this.receiptService.deleteReceipt(receipt.id).subscribe({
      next: () => {
        this.showToast('success', this.t('messages.deleted'));
        this.loadReceipts();
      },
      error: (error: any) => {
        console.error('Error deleting receipt:', error);
        this.showToast('error', this.t('errors.deleteFailed'));
      }
    });
  }

  saveReceipt(): void {
    if (!this.validateForm()) {
      if (this.fieldErrors['items'] || Object.keys(this.fieldErrors).some(key => key.startsWith('item_'))) {
        this.currentStep = 'items';
      } else {
        this.currentStep = 'basic';
      }
      return;
    }

    this.savingReceipt = true;
    this.clearErrors();
    
    const receiptData = {
      to: this.receiptForm.to,
      date: this.receiptForm.date,
      address: this.receiptForm.address,
      addressTitle: this.receiptForm.addressTitle,
      attention: this.receiptForm.attention,
      projectCode: this.receiptForm.projectCode,
      workLocation: this.receiptForm.workLocation,
      companyNumber: this.receiptForm.vehicleNumber,
      additionalText: this.receiptForm.additionalText,
      items: this.receiptForm.items,
      notes: this.receiptForm.notes
    };

    if (this.currentView === 'create') {
      this.receiptService.createReceipt(receiptData).subscribe({
        next: (response: any) => {
          const createdReceipt = response.data;
          this.receiptService.generatePDF(createdReceipt.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingReceipt = false;
              this.showToast('success', this.t('messages.createdWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(createdReceipt.id, createdReceipt.receiptNumber);
              }, 500);
            },
            error: () => {
              this.savingReceipt = false;
              this.showToast('warning', this.t('errors.pdfGenerationWarning'));
              this.backToList();
              this.loadReceipts();
            }
          });
        },
        error: (error: any) => {
          this.savingReceipt = false;
          this.handleBackendError(error);
        }
      });
    } else if (this.currentView === 'edit' && this.selectedReceipt) {
      this.receiptService.updateReceipt(this.selectedReceipt.id, receiptData).subscribe({
        next: (response: any) => {
          const updatedReceipt = response.data;
          this.receiptService.generatePDF(updatedReceipt.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingReceipt = false;
              this.showToast('success', this.t('messages.createdWithPdf'));
                setTimeout(() => {
                  this.openSuccessModal(updatedReceipt.id, updatedReceipt.receiptNumber);
                }, 500);
            },
            error: () => {
              this.savingReceipt = false;
              this.showToast('warning', this.t('errors.pdfUpdateWarning'));
              this.backToList();
              this.loadReceipts();
            }
          });
        },
        error: (error: any) => {
          this.savingReceipt = false;
          this.handleBackendError(error);
        }
      });
    }
  }

  // ========================================
  // PDF OPERATIONS
  // ========================================

  viewPDF(receipt: Receipt): void {
    if (!receipt.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.receiptService.viewPDFInNewTab(receipt.id);
  }

  printReceiptPDF(receipt: Receipt): void {
    if (!receipt.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.receiptService.openPrintDialog(receipt.id);
  }

  downloadPDF(receipt: Receipt): void {
    if (receipt.pdfFilename) {
      this.receiptService.downloadPDF(receipt.id, receipt.pdfFilename);
    }
  }

  openPDFModal(receipt: Receipt): void {
    this.pdfReceiptId = receipt.id;
    this.selectedReceiptNumber = receipt.receiptNumber;
    this.showPDFModal = true;
    this.pdfAttachment = null;
  }

  closePDFModal(): void {
    this.showPDFModal = false;
    this.pdfAttachment = null;
    this.pdfReceiptId = '';
    this.selectedReceiptNumber = '';
  }

  getPDFFilename(): string {
    if (!this.selectedReceiptNumber) return '';
    return `${this.selectedReceiptNumber}.pdf`;
  }

  generatePDF(): void {
    this.generatingPDF = true;
    this.receiptService.generatePDF(this.pdfReceiptId, this.pdfAttachment || undefined).subscribe({
      next: () => {
        this.generatingPDF = false;
        this.closePDFModal();
        this.showToast('success', this.t('messages.pdfGenerated'));
        this.loadReceipts();
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
  // FORM NAVIGATION
  // ========================================

  nextStep(): void {
    if (this.currentStep === 'basic') {
      const itemsErrorKeys = Object.keys(this.fieldErrors).filter(key => 
        key === 'items' || key.startsWith('item_')
      );
      itemsErrorKeys.forEach(key => delete this.fieldErrors[key]);
      if (this.validateBasicFields()) {
        this.currentStep = 'items';
      }
    }
  }

  previousStep(): void {
    if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    }
  }

  addItem(): void {
    this.receiptForm.items.push({
      quantity: '',
      description: '',
      element: ''
    });
  }

  removeItem(index: number): void {
    this.receiptForm.items.splice(index, 1);
    delete this.fieldErrors[`item_${index}_quantity`];
    delete this.fieldErrors[`item_${index}_description`];
    delete this.fieldErrors[`item_${index}_element`];
    if (this.receiptForm.items.length === 0) {
      this.fieldErrors['items'] = this.t('errors.itemsRequired');
    }
  }

  backToList(): void {
    this.currentView = 'list';
    this.currentStep = 'basic';
    this.selectedReceipt = null;
    this.resetForm();
    this.clearErrors();
    this.formPdfAttachment = null;
  }

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
      vehicleNumber: '',
      additionalText: '',
      items: [],
      notes: ''
    };
    this.formPdfAttachment = null;
    this.clearErrors();
  }

  // ========================================
  // UTILITIES
  // ========================================

  getTodayDate(): string {
    return this.receiptService.getTodayDate();
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  getItemsCount(): number {
    return this.receiptForm.items.length;
  }

  getCreatorName(receipt: Receipt): string {
    if (receipt.createdByName && receipt.createdByName.trim() !== '') {
      return receipt.createdByName;
    }
    return receipt.createdBy || '-';
  }

  getStatusClass(receipt: Receipt): string {
    return receipt.pdfFilename ? 'status-generated' : 'status-draft';
  }

  getStatusText(receipt: Receipt): string {
    if (receipt.pdfFilename) {
      return this.formLanguage === 'ar' ? 'تم الإنشاء' : 'Generated';
    }
    return this.formLanguage === 'ar' ? 'مسودة' : 'Draft';
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
      return 'مستخدم';
    }
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    return 'User';
  }

  hasPDF(receipt: Receipt): boolean {
    return !!receipt.pdfFilename;
  }
}