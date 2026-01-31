// purchases.component.ts - UPDATED WITH OPTIONAL FIELDS (NO VALIDATION)

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PurchaseService, PurchaseOrder, POItem, CreatePurchaseOrderData } from '../../core/services/purchase.service';
import { AuthService } from '../../core/services/auth.service';
import { SupplierService, Supplier } from '../../core/services/supplier.service';

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
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss'
})
export class PurchasesComponent implements OnInit, OnDestroy {
  // View states
  suppliers: Supplier[] = [];
  loadingSuppliers: boolean = false;
  currentView: ViewMode = 'list';
  currentStep: FormStep = 'basic';
  formLanguage: FormLanguage = 'ar';

  // Data
  pos: PurchaseOrder[] = [];
  selectedPO: PurchaseOrder | null = null;

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalPOs: number = 0;
  limit: number = 10;

  // Search
  searchTerm: string = '';
  showFilterModal: boolean = false;
  filters = {
    poNumber: '',
    startDate: '',
    endDate: '',
    supplier: ''
  };

  private searchSubject = new Subject<string>();

  // Loading states
  loading: boolean = false;
  savingPO: boolean = false;
  generatingPDF: boolean = false;

  // Error handling
  formError: string = '';
  fieldErrors: { [key: string]: string } = {};

  // Form data
  poForm: CreatePurchaseOrderData = {
    date: this.getTodayDate(),
    supplier: '',
    supplierAddress: '',
    supplierPhone: '',
    receiver: '',
    receiverCity: '',
    receiverAddress: '',
    receiverPhone: '',
    tableHeaderText: '',
    taxRate: 0,
    items: [],
    notes: ''
  };

  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfPOId: string = '';
  selectedPONumber: string = '';
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
  successPOId: string = '';
  successPONumber: string = '';

  // ✅ DUPLICATE MODAL STATE
  showDuplicateModal: boolean = false;
  poToDuplicate: PurchaseOrder | null = null;

  // Translations
  private translations = {
  ar: {
    errors: {
      required: 'هذا الحقل مطلوب',
      dateRequired: 'التاريخ مطلوب',
      supplierRequired: 'المورد مطلوب',
      receiverRequired: 'المستلم مطلوب',
      itemsRequired: 'يجب إضافة عنصر واحد على الأقل',
      itemDescriptionRequired: 'الوصف مطلوب للعنصر',
      itemUnitRequired: 'الوحدة مطلوبة للعنصر',
      itemQuantityRequired: 'الكمية مطلوبة للعنصر',
      itemPriceRequired: 'السعر مطلوب للعنصر',
      loadFailed: 'فشل تحميل البيانات',
      saveFailed: 'فشل حفظ البيانات',
      deleteFailed: 'فشل حذف طلب الشراء',
      pdfFailed: 'فشل إنشاء PDF',
      networkError: 'خطأ في الاتصال بالخادم',
      invalidPdfFile: 'يرجى اختيار ملف PDF صالح',
      fileTooLarge: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
      pdfNotGenerated: 'لم يتم إنشاء PDF بعد',
      pdfGenerationWarning: 'تم إنشاء طلب الشراء ولكن فشل إنشاء PDF',
      pdfUpdateWarning: 'تم تحديث طلب الشراء ولكن فشل تحديث PDF',
      suppliersLoadFailed: 'فشل تحميل قائمة الموردين'
    },
    messages: {
      deleteConfirmTitle: 'تأكيد الحذف',
      deleteConfirmMessage: 'هل أنت متأكد من حذف طلب الشراء',
      created: 'تم إنشاء طلب الشراء بنجاح',
      updated: 'تم تحديث طلب الشراء بنجاح',
      deleted: 'تم حذف طلب الشراء بنجاح',
      pdfGenerated: 'تم إنشاء ملف PDF بنجاح',
      createdWithPdf: 'تم إنشاء طلب الشراء وملف PDF بنجاح',
      updatedWithPdf: 'تم تحديث طلب الشراء وملف PDF بنجاح'
    }
  },
    en: {
      errors: {
        required: 'This field is required',
        dateRequired: 'Date is required',
        supplierRequired: 'Supplier is required',
        receiverRequired: 'Receiver is required',
        itemsRequired: 'At least one item must be added',
        itemDescriptionRequired: 'Description is required for item',
        itemUnitRequired: 'Unit is required for item',
        itemQuantityRequired: 'Quantity is required for item',
        itemPriceRequired: 'Price is required for item',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete purchase order',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error',
        invalidPdfFile: 'Please select a valid PDF file',
        fileTooLarge: 'File size is too large. Maximum 10MB',
        pdfNotGenerated: 'PDF not generated yet',
        pdfGenerationWarning: 'Purchase Order created but PDF failed',
        pdfUpdateWarning: 'Purchase Order updated but PDF failed'
      },
      messages: {
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMessage: 'Are you sure you want to delete purchase order',
        created: 'Purchase Order created successfully',
        updated: 'Purchase Order updated successfully',
        deleted: 'Purchase Order deleted successfully',
        pdfGenerated: 'PDF generated successfully',
        createdWithPdf: 'Purchase Order and PDF created successfully',
        updatedWithPdf: 'Purchase Order and PDF updated successfully'
      }
    }
  };

  constructor(
    private purchaseService: PurchaseService,
    private supplierService: SupplierService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadPOs();
    this.loadSuppliers();
    const user = this.authService.currentUserValue;
    this.userRole = user ? user.role : '';

    this.updateDirection();

    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadPOs();
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
  // ✅ DUPLICATE FUNCTIONALITY
  // ========================================
  
  openDuplicateModal(po: PurchaseOrder): void {
    this.poToDuplicate = po;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.poToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.poToDuplicate) return;

    const po = this.poToDuplicate;

    // Reset form first
    this.resetForm();

    // Populate form with duplicated data
    this.poForm = {
      date: this.getTodayDate(), // Use today's date for new PO
      supplier: po.supplier || '',
      supplierAddress: po.supplierAddress || '',
      supplierPhone: po.supplierPhone || '',
      receiver: po.receiver || '',
      receiverCity: po.receiverCity || '',
      receiverAddress: po.receiverAddress || '',
      receiverPhone: po.receiverPhone || '',
      tableHeaderText: po.tableHeaderText || '',
      taxRate: po.taxRate || 0,
      items: JSON.parse(JSON.stringify(po.items || [])), // Deep clone items
      notes: po.notes || ''
    };

    // Set view to CREATE (not edit)
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.fieldErrors = {};
    this.formError = '';

    // Close modal
    this.closeDuplicateModal();

    // Show success message
    const successMsg = this.formLanguage === 'ar'
      ? `تم نسخ بيانات طلب الشراء ${po.poNumber}. يمكنك التعديل وحفظ طلب جديد.`
      : `Purchase Order ${po.poNumber} data copied. You can modify and save as a new PO.`;
    this.showToast('info', successMsg, 5000);
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

  openSuccessModal(poId: string, poNumber: string): void {
    this.successPOId = poId;
    this.successPONumber = poNumber;
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successPOId = '';
    this.successPONumber = '';
    this.backToList();
  }

  navigateToSuppliers(): void {
    this.router.navigate(['/suppliers']);
  }

  viewPDFFromSuccess(): void {
    if (this.successPOId) {
      this.purchaseService.viewPDFInNewTab(this.successPOId);
    }
  }

  printPDFFromSuccess(): void {
    if (this.successPOId) {
      this.purchaseService.openPrintDialog(this.successPOId);
    }
  }

  downloadPDFFromSuccess(): void {
    if (this.successPOId && this.successPONumber) {
      this.purchaseService.downloadPDF(this.successPOId, `${this.successPONumber}.pdf`);
    }
  }

  doneSuccess(): void {
    this.closeSuccessModal();
    this.loadPOs();
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

  // ========================================
  // SUPPLIERS METHODS
  // ========================================

  loadSuppliers(): void {
    this.loadingSuppliers = true;
    this.supplierService.getAllSuppliers().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          this.suppliers = response.data;
        } else {
          this.suppliers = [];
        }
        this.loadingSuppliers = false;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.suppliers = [];
        this.loadingSuppliers = false;
        this.showToast('error', this.formLanguage === 'ar'
          ? 'فشل تحميل قائمة الموردين'
          : 'Failed to load suppliers list'
        );
      }
    });
  }

  onSupplierChange(): void {
    const selectedSupplier = this.suppliers.find(s => s.name === this.poForm.supplier);
    if (selectedSupplier && selectedSupplier.address) {
      this.poForm.supplierAddress = selectedSupplier.address;
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

  // ✅ UPDATED: No validation - all fields are optional
  private validateForm(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    return true;
  }

  // ✅ UPDATED: No validation - all fields are optional
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

  loadPOs(): void {
    this.loading = true;
    this.clearErrors();

    const filterParams: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      filterParams.search = this.searchTerm.trim();
    }

    if (this.filters.poNumber && this.filters.poNumber.trim() !== '') {
      filterParams.poNumber = this.filters.poNumber.trim();
    }
    if (this.filters.startDate && this.filters.startDate.trim() !== '') {
      filterParams.startDate = this.filters.startDate.trim();
    }
    if (this.filters.endDate && this.filters.endDate.trim() !== '') {
      filterParams.endDate = this.filters.endDate.trim();
    }
    if (this.filters.supplier && this.filters.supplier.trim() !== '') {
      filterParams.supplier = this.filters.supplier.trim();
    }

    this.purchaseService.getAllPOs(filterParams).subscribe({
      next: (response: any) => {
        this.pos = response.data;
        this.currentPage = response.pagination.currentPage;
        this.totalPages = response.pagination.totalPages;
        this.totalPOs = response.pagination.totalPOs;
        this.userRole = response.userRole || this.userRole;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading purchase orders:', error);
        this.loading = false;
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadPOs();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPOs();
    }
  }

  createPO(): void {
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.resetForm();
    this.clearErrors();
  }

  editPO(po: PurchaseOrder): void {
    this.clearErrors();
    this.purchaseService.getPOById(po.id).subscribe({
      next: (response: any) => {
        const freshPO = response.data;
        this.selectedPO = freshPO;
        this.currentView = 'edit';
        this.currentStep = 'basic';
        this.poForm = {
          date: freshPO.date || this.getTodayDate(),
          supplier: freshPO.supplier || '',
          supplierAddress: freshPO.supplierAddress || '',
          supplierPhone: freshPO.supplierPhone || '',
          receiver: freshPO.receiver || '',
          receiverCity: freshPO.receiverCity || '',
          receiverAddress: freshPO.receiverAddress || '',
          receiverPhone: freshPO.receiverPhone || '',
          tableHeaderText: freshPO.tableHeaderText || '',
          taxRate: freshPO.taxRate || 0,
          items: JSON.parse(JSON.stringify(freshPO.items || [])),
          notes: freshPO.notes || ''
        };
      },
      error: (error: any) => {
        console.error('Error fetching purchase order:', error);
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  showDeleteConfirmation(po: PurchaseOrder): void {
    const title = this.t('messages.deleteConfirmTitle');
    const message = `${this.t('messages.deleteConfirmMessage')} ${po.poNumber}?`;
    this.showConfirmation(title, message, () => {
      this.performDelete(po);
    });
  }

  private performDelete(po: PurchaseOrder): void {
    this.purchaseService.deletePO(po.id).subscribe({
      next: () => {
        this.showToast('success', this.t('messages.deleted'));
        this.loadPOs();
      },
      error: (error: any) => {
        console.error('Error deleting purchase order:', error);
        this.showToast('error', this.t('errors.deleteFailed'));
      }
    });
  }

  savePO(): void {
    // ✅ NO VALIDATION - Save directly
    this.savingPO = true;
    this.clearErrors();

    const poData = {
      date: this.poForm.date,
      supplier: this.poForm.supplier,
      supplierAddress: this.poForm.supplierAddress,
      supplierPhone: this.poForm.supplierPhone,
      receiver: this.poForm.receiver,
      receiverCity: this.poForm.receiverCity,
      receiverAddress: this.poForm.receiverAddress,
      receiverPhone: this.poForm.receiverPhone,
      tableHeaderText: this.poForm.tableHeaderText,
      taxRate: this.poForm.taxRate,
      items: this.poForm.items,
      notes: this.poForm.notes
    };

    if (this.currentView === 'create') {
      this.purchaseService.createPO(poData).subscribe({
        next: (response: any) => {
          const createdPO = response.data;
          this.purchaseService.generatePDF(createdPO.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingPO = false;
              this.showToast('success', this.t('messages.createdWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(createdPO.id, createdPO.poNumber);
              }, 500);
            },
            error: () => {
              this.savingPO = false;
              this.showToast('warning', this.t('errors.pdfGenerationWarning'));
              this.backToList();
              this.loadPOs();
            }
          });
        },
        error: (error: any) => {
          this.savingPO = false;
          this.handleBackendError(error);
        }
      });
    } else if (this.currentView === 'edit' && this.selectedPO) {
      this.purchaseService.updatePO(this.selectedPO.id, poData).subscribe({
        next: (response: any) => {
          const updatedPO = response.data;
          this.purchaseService.generatePDF(updatedPO.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingPO = false;
              this.showToast('success', this.t('messages.updatedWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(updatedPO.id, updatedPO.poNumber);
              }, 500);
            },
            error: () => {
              this.savingPO = false;
              this.showToast('warning', this.t('errors.pdfUpdateWarning'));
              this.backToList();
              this.loadPOs();
            }
          });
        },
        error: (error: any) => {
          this.savingPO = false;
          this.handleBackendError(error);
        }
      });
    }
  }

  // ========================================
  // PDF OPERATIONS
  // ========================================

  viewPDF(po: PurchaseOrder): void {
    if (!po.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.purchaseService.viewPDFInNewTab(po.id);
  }

  printPOPDF(po: PurchaseOrder): void {
    if (!po.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.purchaseService.openPrintDialog(po.id);
  }

  downloadPDF(po: PurchaseOrder): void {
    if (po.pdfFilename) {
      this.purchaseService.downloadPDF(po.id, po.pdfFilename);
    }
  }

  openPDFModal(po: PurchaseOrder): void {
    this.pdfPOId = po.id;
    this.selectedPONumber = po.poNumber;
    this.showPDFModal = true;
    this.pdfAttachment = null;
  }

  closePDFModal(): void {
    this.showPDFModal = false;
    this.pdfAttachment = null;
    this.pdfPOId = '';
    this.selectedPONumber = '';
  }

  getPDFFilename(): string {
    if (!this.selectedPONumber) return '';
    return `${this.selectedPONumber}.pdf`;
  }

  generatePDF(): void {
    this.generatingPDF = true;
    this.purchaseService.generatePDF(this.pdfPOId, this.pdfAttachment || undefined).subscribe({
      next: () => {
        this.generatingPDF = false;
        this.closePDFModal();
        this.showToast('success', this.t('messages.pdfGenerated'));
        this.loadPOs();
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
      // ✅ NO VALIDATION - Just move to next step
      this.currentStep = 'items';
    }
  }

  previousStep(): void {
    if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    }
  }

  addItem(): void {
    this.poForm.items.push({
      description: '',
      unit: '',
      quantity: '',
      unitPrice: ''
    });
  }

  removeItem(index: number): void {
    this.poForm.items.splice(index, 1);
    delete this.fieldErrors[`item_${index}_description`];
    delete this.fieldErrors[`item_${index}_unit`];
    delete this.fieldErrors[`item_${index}_quantity`];
    delete this.fieldErrors[`item_${index}_unitPrice`];
  }

  backToList(): void {
    this.currentView = 'list';
    this.currentStep = 'basic';
    this.selectedPO = null;
    this.resetForm();
    this.clearErrors();
    this.formPdfAttachment = null;
  }

  resetForm(): void {
    this.poForm = {
      date: this.getTodayDate(),
      supplier: '',
      supplierAddress: '',
      supplierPhone: '',
      receiver: '',
      receiverCity: '',
      receiverAddress: '',
      receiverPhone: '',
      tableHeaderText: '',
      taxRate: 0,
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
    return this.purchaseService.getTodayDate();
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  getItemsCount(): number {
    return this.poForm.items.length;
  }

  getCreatorName(po: PurchaseOrder): string {
    if (po.createdByName && po.createdByName.trim() !== '') {
      return po.createdByName;
    }
    return po.createdBy || '-';
  }

  getStatusClass(po: PurchaseOrder): string {
    if (po.status === 'pending') return 'status-pending';
    if (po.status === 'approved') return 'status-approved';
    if (po.status === 'rejected') return 'status-rejected';
    return po.pdfFilename ? 'status-generated' : 'status-draft';
  }

  getStatusText(po: PurchaseOrder): string {
    if (this.formLanguage === 'ar') {
      if (po.status === 'pending') return 'قيد الانتظار';
      if (po.status === 'approved') return 'موافق عليه';
      if (po.status === 'rejected') return 'مرفوض';
      return po.pdfFilename ? 'تم الإنشاء' : 'مسودة';
    }
    if (po.status === 'pending') return 'Pending';
    if (po.status === 'approved') return 'Approved';
    if (po.status === 'rejected') return 'Rejected';
    return po.pdfFilename ? 'Generated' : 'Draft';
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

  hasPDF(po: PurchaseOrder): boolean {
    return !!po.pdfFilename;
  }

  calculateItemTotal(item: POItem): number {
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
    return (qty || 0) * (price || 0);
  }

  calculateSubtotal(): number {
    return this.poForm.items.reduce((sum, item) => sum + this.calculateItemTotal(item), 0);
  }

  calculateTax(): number {
    return this.calculateSubtotal() * (this.poForm.taxRate / 100);
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax();
  }
}