// ============================================================
// MATERIAL REQUEST COMPONENT - WITH DYNAMIC PDF LANGUAGE
// materials-request.component.ts (COMPLETE)
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MaterialService, MaterialRequest, MRItem, CreateMaterialRequestData } from '../../core/services/material.service';
import { AuthService } from '../../core/services/auth.service';

interface Department {
  value: string;
  labelAr: string;
  labelEn: string;
}
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
  selector: 'app-materials-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './materials-request.component.html',
  styleUrl: './materials-request.component.scss'
})
export class MaterialsRequestComponent implements OnInit, OnDestroy {
  // View states
  currentView: ViewMode = 'list';
  currentStep: FormStep = 'basic';
  formLanguage: FormLanguage = 'ar';
  
  // Data
  materialRequests: MaterialRequest[] = [];
  selectedMR: MaterialRequest | null = null;
  
  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalMRs: number = 0;
  limit: number = 10;
  
  // Search
  searchTerm: string = '';
  showFilterModal: boolean = false;
  filters = {
    mrNumber: '',
    startDate: '',
    endDate: '',
    section: '',
    project: '',
    priority: '',
    status: ''
  };
  
  departments: Department[] = [
    { value: 'procurement', labelAr: 'المشتريات', labelEn: 'Procurement' },
    { value: 'warehouse', labelAr: 'المخزن', labelEn: 'Warehouse' },
    { value: 'maintenance', labelAr: 'الصيانة', labelEn: 'Maintenance' },
    { value: 'sales', labelAr: 'المبيعات', labelEn: 'Sales' },
    { value: 'marketing', labelAr: 'التسويق', labelEn: 'Marketing' },
    { value: 'development', labelAr: 'التطوير', labelEn: 'Development' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' }
  ];
  
  getDepartmentLabel(dept: Department): string {
    return this.formLanguage === 'ar' ? dept.labelAr : dept.labelEn;
  }
  
  private searchSubject = new Subject<string>();
  
  // Loading states
  loading: boolean = false;
  savingMR: boolean = false;
  generatingPDF: boolean = false;
  
  // Error handling
  formError: string = '';
  fieldErrors: { [key: string]: string } = {};
  
  // Form data
  mrForm: CreateMaterialRequestData = {
    date: this.getTodayDate(),
    section: '',
    project: '',
    requestPriority: '',
    requestReason: '',
    items: [],
    additionalNotes: ''
  };
  
  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfMRId: string = '';
  selectedMRNumber: string = '';
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
  successMRId: string = '';
  successMRNumber: string = '';
  
  // Priority options
  priorityOptions = [
    { value: 'urgent', labelAr: 'عاجل', labelEn: 'Urgent' },
    { value: 'high', labelAr: 'عالي', labelEn: 'High' },
    { value: 'medium', labelAr: 'متوسط', labelEn: 'Medium' },
    { value: 'low', labelAr: 'منخفض', labelEn: 'Low' }
  ];

  // Translations
  private translations = {
    ar: {
      errors: {
        required: 'هذا الحقل مطلوب',
        dateRequired: 'التاريخ مطلوب',
        sectionRequired: 'القسم مطلوب',
        projectRequired: 'المشروع مطلوب',
        priorityRequired: 'أولوية الطلب مطلوبة',
        reasonRequired: 'سبب الطلب مطلوب',
        itemsRequired: 'يجب إضافة عنصر واحد على الأقل',
        itemDescriptionRequired: 'الوصف مطلوب للعنصر',
        itemUnitRequired: 'الوحدة مطلوبة للعنصر',
        itemQuantityRequired: 'الكمية مطلوبة للعنصر',
        loadFailed: 'فشل تحميل البيانات',
        saveFailed: 'فشل حفظ البيانات',
        deleteFailed: 'فشل حذف طلب المواد',
        pdfFailed: 'فشل إنشاء PDF',
        networkError: 'خطأ في الاتصال بالخادم',
        invalidPdfFile: 'يرجى اختيار ملف PDF صالح',
        fileTooLarge: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
        pdfNotGenerated: 'لم يتم إنشاء PDF بعد',
        pdfGenerationWarning: 'تم إنشاء طلب المواد ولكن فشل إنشاء PDF',
        pdfUpdateWarning: 'تم تحديث طلب المواد ولكن فشل تحديث PDF'
      },
      messages: {
        deleteConfirmTitle: 'تأكيد الحذف',
        deleteConfirmMessage: 'هل أنت متأكد من حذف طلب المواد',
        created: 'تم إنشاء طلب المواد بنجاح',
        updated: 'تم تحديث طلب المواد بنجاح',
        deleted: 'تم حذف طلب المواد بنجاح',
        pdfGenerated: 'تم إنشاء ملف PDF بنجاح',
        createdWithPdf: 'تم إنشاء طلب المواد وملف PDF بنجاح',
        updatedWithPdf: 'تم تحديث طلب المواد وملف PDF بنجاح'
      }
    },
    en: {
      errors: {
        required: 'This field is required',
        dateRequired: 'Date is required',
        sectionRequired: 'Section is required',
        projectRequired: 'Project is required',
        priorityRequired: 'Request priority is required',
        reasonRequired: 'Request reason is required',
        itemsRequired: 'At least one item must be added',
        itemDescriptionRequired: 'Description is required for item',
        itemUnitRequired: 'Unit is required for item',
        itemQuantityRequired: 'Quantity is required for item',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete material request',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error',
        invalidPdfFile: 'Please select a valid PDF file',
        fileTooLarge: 'File size is too large. Maximum 10MB',
        pdfNotGenerated: 'PDF not generated yet',
        pdfGenerationWarning: 'Material Request created but PDF failed',
        pdfUpdateWarning: 'Material Request updated but PDF failed'
      },
      messages: {
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMessage: 'Are you sure you want to delete material request',
        created: 'Material Request created successfully',
        updated: 'Material Request updated successfully',
        deleted: 'Material Request deleted successfully',
        pdfGenerated: 'PDF generated successfully',
        createdWithPdf: 'Material Request and PDF created successfully',
        updatedWithPdf: 'Material Request and PDF updated successfully'
      }
    }
  };
  
  constructor(
    private materialService: MaterialService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadMaterialRequests();
    const user = this.authService.currentUserValue;
    this.userRole = user ? user.role : '';
    
    this.updateDirection();
    
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadMaterialRequests();
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
  
  openSuccessModal(mrId: string, mrNumber: string): void {
    this.successMRId = mrId;
    this.successMRNumber = mrNumber;
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMRId = '';
    this.successMRNumber = '';
    this.backToList();
  }

  viewPDFFromSuccess(): void {
    if (this.successMRId) {
      this.materialService.viewPDFInNewTab(this.successMRId);
    }
  }

  printPDFFromSuccess(): void {
    if (this.successMRId) {
      this.materialService.openPrintDialog(this.successMRId);
    }
  }

  downloadPDFFromSuccess(): void {
    if (this.successMRId && this.successMRNumber) {
      this.materialService.downloadPDF(this.successMRId, `${this.successMRNumber}.pdf`);
    }
  }

  doneSuccess(): void {
    this.closeSuccessModal();
    this.loadMaterialRequests();
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

  getPriorityLabel(priority: string): string {
    const option = this.priorityOptions.find(p => p.value === priority);
    if (!option) return priority;
    return this.formLanguage === 'ar' ? option.labelAr : option.labelEn;
  }

  // ========================================
  // VALIDATION METHODS
  // ========================================

  private validateForm(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    let isValid = true;

    if (!this.mrForm.date) {
      this.fieldErrors['date'] = this.t('errors.dateRequired');
      isValid = false;
    }
    if (!this.mrForm.section || this.mrForm.section.trim() === '') {
      this.fieldErrors['section'] = this.t('errors.sectionRequired');
      isValid = false;
    }
    if (!this.mrForm.project || this.mrForm.project.trim() === '') {
      this.fieldErrors['project'] = this.t('errors.projectRequired');
      isValid = false;
    }
    if (!this.mrForm.requestPriority || this.mrForm.requestPriority.trim() === '') {
      this.fieldErrors['requestPriority'] = this.t('errors.priorityRequired');
      isValid = false;
    }
    if (!this.mrForm.requestReason || this.mrForm.requestReason.trim() === '') {
      this.fieldErrors['requestReason'] = this.t('errors.reasonRequired');
      isValid = false;
    }
    
    if (!this.mrForm.items || this.mrForm.items.length === 0) {
      this.fieldErrors['items'] = this.t('errors.itemsRequired');
      isValid = false;
    } else {
      this.mrForm.items.forEach((item, index) => {
        if (!item.description || item.description.trim() === '') {
          this.fieldErrors[`item_${index}_description`] = this.t('errors.itemDescriptionRequired');
          isValid = false;
        }
        if (!item.unit || item.unit.trim() === '') {
          this.fieldErrors[`item_${index}_unit`] = this.t('errors.itemUnitRequired');
          isValid = false;
        }
        if (!item.quantity || item.quantity.toString().trim() === '') {
          this.fieldErrors[`item_${index}_quantity`] = this.t('errors.itemQuantityRequired');
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

    if (!this.mrForm.date) {
      this.fieldErrors['date'] = this.t('errors.dateRequired');
      isValid = false;
    }
    if (!this.mrForm.section || this.mrForm.section.trim() === '') {
      this.fieldErrors['section'] = this.t('errors.sectionRequired');
      isValid = false;
    }
    if (!this.mrForm.project || this.mrForm.project.trim() === '') {
      this.fieldErrors['project'] = this.t('errors.projectRequired');
      isValid = false;
    }
    if (!this.mrForm.requestPriority || this.mrForm.requestPriority.trim() === '') {
      this.fieldErrors['requestPriority'] = this.t('errors.priorityRequired');
      isValid = false;
    }
    if (!this.mrForm.requestReason || this.mrForm.requestReason.trim() === '') {
      this.fieldErrors['requestReason'] = this.t('errors.reasonRequired');
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

  loadMaterialRequests(): void {
    this.loading = true;
    this.clearErrors();
    
    const filterParams: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      filterParams.search = this.searchTerm.trim();
    }

    if (this.filters.mrNumber && this.filters.mrNumber.trim() !== '') {
      filterParams.mrNumber = this.filters.mrNumber.trim();
    }
    if (this.filters.startDate && this.filters.startDate.trim() !== '') {
      filterParams.startDate = this.filters.startDate.trim();
    }
    if (this.filters.endDate && this.filters.endDate.trim() !== '') {
      filterParams.endDate = this.filters.endDate.trim();
    }
    if (this.filters.section && this.filters.section.trim() !== '') {
      filterParams.section = this.filters.section.trim();
    }
    if (this.filters.project && this.filters.project.trim() !== '') {
      filterParams.project = this.filters.project.trim();
    }
    if (this.filters.priority && this.filters.priority.trim() !== '') {
      filterParams.priority = this.filters.priority.trim();
    }
    if (this.filters.status && this.filters.status.trim() !== '') {
      filterParams.status = this.filters.status.trim();
    }

    this.materialService.getAllMaterialRequests(filterParams).subscribe({
      next: (response: any) => {
        this.materialRequests = response.data;
        this.currentPage = response.pagination.currentPage;
        this.totalPages = response.pagination.totalPages;
        this.totalMRs = response.pagination.totalMaterials;
        this.userRole = response.userRole || this.userRole;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading material requests:', error);
        this.loading = false;
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadMaterialRequests();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadMaterialRequests();
    }
  }

  createMR(): void {
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.resetForm();
    this.clearErrors();
  }

  editMR(mr: MaterialRequest): void {
    this.clearErrors();
    this.materialService.getMaterialRequestById(mr.id).subscribe({
      next: (response: any) => {
        const freshMR = response.data;
        this.selectedMR = freshMR;
        this.currentView = 'edit';
        this.currentStep = 'basic';
        
        const clonedItems = freshMR.items ? freshMR.items.map((item: any) => ({
          description: item.description || '',
          unit: item.unit || '',
          quantity: item.quantity || '',
          requiredDate: item.requiredDate || '',
          priority: item.priority || ''
        })) : [];
        
        this.mrForm = {
          date: freshMR.date || this.getTodayDate(),
          section: freshMR.section || '',
          project: freshMR.project || '',
          requestPriority: freshMR.requestPriority || '',
          requestReason: freshMR.requestReason || '',
          items: clonedItems,
          additionalNotes: freshMR.additionalNotes || ''
        };
      },
      error: (error: any) => {
        console.error('Error fetching material request:', error);
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  showDeleteConfirmation(mr: MaterialRequest): void {
    const title = this.t('messages.deleteConfirmTitle');
    const message = `${this.t('messages.deleteConfirmMessage')} ${mr.mrNumber}?`;
    this.showConfirmation(title, message, () => {
      this.performDelete(mr);
    });
  }

  private performDelete(mr: MaterialRequest): void {
    this.materialService.deleteMaterialRequest(mr.id).subscribe({
      next: () => {
        this.showToast('success', this.t('messages.deleted'));
        this.loadMaterialRequests();
      },
      error: (error: any) => {
        console.error('Error deleting material request:', error);
        this.showToast('error', this.t('errors.deleteFailed'));
      }
    });
  }

  saveMR(): void {
    if (!this.validateForm()) {
      if (this.fieldErrors['items'] || Object.keys(this.fieldErrors).some(key => key.startsWith('item_'))) {
        this.currentStep = 'items';
      } else {
        this.currentStep = 'basic';
      }
      return;
    }

    this.savingMR = true;
    this.clearErrors();
    
    const formattedItems = this.mrForm.items.map(item => ({
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity ? Number(item.quantity) : 0,
      requiredDate: item.requiredDate || '',
      priority: item.priority || ''
    }));
    
    // ✅ NO forceLanguage - let the backend detect language automatically
    const mrData = {
      date: this.mrForm.date,
      section: this.mrForm.section,
      project: this.mrForm.project,
      requestPriority: this.mrForm.requestPriority,
      requestReason: this.mrForm.requestReason,
      items: formattedItems,
      additionalNotes: this.mrForm.additionalNotes
    };

    if (this.currentView === 'create') {
      this.materialService.createMaterialRequest(mrData).subscribe({
        next: (response: any) => {
          const createdMR = response.data;
          this.materialService.generatePDF(createdMR.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingMR = false;
              this.showToast('success', this.t('messages.createdWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(createdMR.id, createdMR.mrNumber);
              }, 500);
            },
            error: () => {
              this.savingMR = false;
              this.showToast('warning', this.t('errors.pdfGenerationWarning'));
              this.backToList();
              this.loadMaterialRequests();
            }
          });
        },
        error: (error: any) => {
          this.savingMR = false;
          this.handleBackendError(error);
        }
      });
    } else if (this.currentView === 'edit' && this.selectedMR) {
      this.materialService.updateMaterialRequest(this.selectedMR.id, mrData).subscribe({
        next: (response: any) => {
          const updatedMR = response.data;
          this.materialService.generatePDF(updatedMR.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingMR = false;
              this.showToast('success', this.t('messages.updatedWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(updatedMR.id, updatedMR.mrNumber);
              }, 500);
            },
            error: () => {
              this.savingMR = false;
              this.showToast('warning', this.t('errors.pdfUpdateWarning'));
              this.backToList();
              this.loadMaterialRequests();
            }
          });
        },
        error: (error: any) => {
          this.savingMR = false;
          this.handleBackendError(error);
        }
      });
    }
  }

  // ========================================
  // PDF OPERATIONS
  // ========================================

  viewPDF(mr: MaterialRequest): void {
    if (!mr.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.materialService.viewPDFInNewTab(mr.id);
  }

  printMRPDF(mr: MaterialRequest): void {
    if (!mr.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.materialService.openPrintDialog(mr.id);
  }

  downloadPDF(mr: MaterialRequest): void {
    if (mr.pdfFilename) {
      this.materialService.downloadPDF(mr.id, mr.pdfFilename);
    }
  }

  openPDFModal(mr: MaterialRequest): void {
    this.pdfMRId = mr.id;
    this.selectedMRNumber = mr.mrNumber;
    this.showPDFModal = true;
    this.pdfAttachment = null;
  }

  closePDFModal(): void {
    this.showPDFModal = false;
    this.pdfAttachment = null;
    this.pdfMRId = '';
    this.selectedMRNumber = '';
  }

  getPDFFilename(): string {
    if (!this.selectedMRNumber) return '';
    return `${this.selectedMRNumber}.pdf`;
  }

  generatePDF(): void {
    this.generatingPDF = true;
    this.materialService.generatePDF(this.pdfMRId, this.pdfAttachment || undefined).subscribe({
      next: () => {
        this.generatingPDF = false;
        this.closePDFModal();
        this.showToast('success', this.t('messages.pdfGenerated'));
        this.loadMaterialRequests();
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
    this.mrForm.items.push({
      description: '',
      unit: '',
      quantity: '',
      requiredDate: '',
      priority: ''
    });
  }

  removeItem(index: number): void {
    this.mrForm.items.splice(index, 1);
    delete this.fieldErrors[`item_${index}_description`];
    delete this.fieldErrors[`item_${index}_unit`];
    delete this.fieldErrors[`item_${index}_quantity`];
    if (this.mrForm.items.length === 0) {
      this.fieldErrors['items'] = this.t('errors.itemsRequired');
    }
  }

  backToList(): void {
    this.currentView = 'list';
    this.currentStep = 'basic';
    this.selectedMR = null;
    this.resetForm();
    this.clearErrors();
    this.formPdfAttachment = null;
  }

  resetForm(): void {
    this.mrForm = {
      date: this.getTodayDate(),
      section: '',
      project: '',
      requestPriority: '',
      requestReason: '',
      items: [],
      additionalNotes: ''
    };
    this.formPdfAttachment = null;
    this.clearErrors();
  }

  // ========================================
  // UTILITIES
  // ========================================

  getTodayDate(): string {
    return this.materialService.getTodayDate();
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  getItemsCount(): number {
    return this.mrForm.items.length;
  }

  getCreatorName(mr: MaterialRequest): string {
    if (mr.createdByName && mr.createdByName.trim() !== '') {
      return mr.createdByName;
    }
    return mr.createdBy || '-';
  }

  getStatusClass(mr: MaterialRequest): string {
    if (mr.status === 'pending') return 'status-pending';
    if (mr.status === 'approved') return 'status-approved';
    if (mr.status === 'rejected') return 'status-rejected';
    return mr.pdfFilename ? 'status-generated' : 'status-draft';
  }

  getStatusText(mr: MaterialRequest): string {
    if (this.formLanguage === 'ar') {
      if (mr.status === 'pending') return 'قيد الانتظار';
      if (mr.status === 'approved') return 'موافق عليه';
      if (mr.status === 'rejected') return 'مرفوض';
      return mr.pdfFilename ? 'تم الإنشاء' : 'مسودة';
    }
    if (mr.status === 'pending') return 'Pending';
    if (mr.status === 'approved') return 'Approved';
    if (mr.status === 'rejected') return 'Rejected';
    return mr.pdfFilename ? 'Generated' : 'Draft';
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

  hasPDF(mr: MaterialRequest): boolean {
    return !!mr.pdfFilename;
  }
}