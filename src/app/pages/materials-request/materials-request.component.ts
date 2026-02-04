// ============================================================
// MATERIAL REQUEST COMPONENT - WITH TERMS & CONDITIONS SUPPORT
// materials-request.component.ts (COMPLETE WITH includeStaticFile)
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
// ✅ استيراد ItemsService
import { ItemsService, SimpleItem } from '../../core/services/items.service';

interface Department {
  value: string;
  labelAr: string;
  labelEn: string;
}
type ViewMode = 'list' | 'create' | 'edit' | 'view';
type FormStep = 'basic' | 'items' | 'options'; // ✅ ADDED 'options'
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

  // ✅ قائمة العناصر من Items API
  availableItems: SimpleItem[] = [];
  loadingItems: boolean = false;

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

  // Form data with includeStaticFile
  mrForm: CreateMaterialRequestData = {
    date: this.getTodayDate(),
    section: '',
    project: '',
    requestPriority: '',
    requestReason: '',
    items: [],
    additionalNotes: '',
    includeStaticFile: false // ✅ NEW: Terms & Conditions flag
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

  // DUPLICATE MODAL STATE
  showDuplicateModal: boolean = false;
  mrToDuplicate: MaterialRequest | null = null;

  // Priority options
  priorityOptions = [
    { value: 'urgent', labelAr: 'عاجل', labelEn: 'Urgent' },
    { value: 'high', labelAr: 'عالي', labelEn: 'High' },
    { value: 'medium', labelAr: 'متوسط', labelEn: 'Medium' },
    { value: 'low', labelAr: 'منخفض', labelEn: 'Low' }
  ];

  // Email/Share Modal State
showShareModal: boolean = false;
shareMRId: string = '';
shareMRNumber: string = '';
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
        pdfUpdateWarning: 'تم تحديث طلب المواد ولكن فشل تحديث PDF',
        loadItemsFailed: 'فشل تحميل قائمة العناصر',
        invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
        emailRequired: 'يرجى اختيار بريد إلكتروني أو إدخال بريد مخصص',
        emailFailed: 'فشل إرسال البريد الإلكتروني'
      },
      messages: {
        deleteConfirmTitle: 'تأكيد الحذف',
        deleteConfirmMessage: 'هل أنت متأكد من حذف طلب المواد',
        created: 'تم إنشاء طلب المواد بنجاح',
        updated: 'تم تحديث طلب المواد بنجاح',
        deleted: 'تم حذف طلب المواد بنجاح',
        pdfGenerated: 'تم إنشاء ملف PDF بنجاح',
        createdWithPdf: 'تم إنشاء طلب المواد وملف PDF بنجاح',
        updatedWithPdf: 'تم تحديث طلب المواد وملف PDF بنجاح',
        duplicateSuccess: 'تم نسخ بيانات طلب المواد',
        duplicateInfo: 'يمكنك التعديل وحفظ طلب جديد',
        emailSent: 'تم إرسال البريد الإلكتروني بنجاح',
        emailSending: 'جاري إرسال البريد الإلكتروني...'
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
        pdfUpdateWarning: 'Material Request updated but PDF failed',
        loadItemsFailed: 'Failed to load items list',
        invalidEmail: 'Please enter a valid email address',
        emailRequired: 'Please select an email or enter a custom email',
        emailFailed: 'Failed to send email'
      },
      messages: {
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMessage: 'Are you sure you want to delete material request',
        created: 'Material Request created successfully',
        updated: 'Material Request updated successfully',
        deleted: 'Material Request deleted successfully',
        pdfGenerated: 'PDF generated successfully',
        createdWithPdf: 'Material Request and PDF created successfully',
        updatedWithPdf: 'Material Request and PDF updated successfully',
        duplicateSuccess: 'Material Request data copied',
        duplicateInfo: 'You can modify and save as a new request',
        emailSent: 'Email sent successfully',
        emailSending: 'Sending email...'
      }
    }
  };

  constructor(
    private materialService: MaterialService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer,
    // ✅ إضافة ItemsService
    private itemsService: ItemsService
  ) {}

  ngOnInit(): void {
    this.loadMaterialRequests();
    // ✅ تحميل قائمة العناصر عند بدء التطبيق
    this.loadAvailableItems();

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
    this.closeDuplicateModal();
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.setAttribute('dir', 'rtl');
  }

  // ========================================
  // ✅ ITEMS API METHODS
  // ========================================

  /**
   * تحميل قائمة العناصر المتاحة من Items API
   */
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

  /**
   * عند اختيار عنصر من القائمة، يتم ملء الوحدة تلقائياً
   */
  onItemSelected(index: number, itemId: string): void {
    if (!itemId) {
      // إذا تم إلغاء الاختيار، امسح الحقول
      this.mrForm.items[index].description = '';
      this.mrForm.items[index].unit = '';
      return;
    }

    // البحث عن العنصر المختار
    const selectedItem = this.availableItems.find(item => item.id === itemId);

    if (selectedItem) {
      // ملء الوصف والوحدة تلقائياً
      this.mrForm.items[index].description = selectedItem.name;
      this.mrForm.items[index].unit = selectedItem.unit || '';
    }
  }

  /**
   * التحقق إذا كان العنصر مخصصاً (غير موجود في القائمة)
   */
  isCustomItem(index: number): boolean {
    const item = this.mrForm.items[index];
    if (!item.description) return false;

    return !this.availableItems.some(
      availableItem => availableItem.name === item.description
    );
  }

  /**
   * الحصول على ID العنصر المختار
   */
  getSelectedItemId(index: number): string {
    const item = this.mrForm.items[index];
    if (!item.description) return '';

    const foundItem = this.availableItems.find(
      availableItem => availableItem.name === item.description
    );

    return foundItem ? foundItem.id : '';
  }

  /**
   * ✅ Check if unit is auto-filled from item selection
   */
  hasAutoFilledUnit(index: number): boolean {
    const selectedItemId = this.getSelectedItemId(index);
    if (!selectedItemId) return false;
    
    const selectedItem = this.availableItems.find(item => item.id === selectedItemId);
    return !!(selectedItem && selectedItem.unit && this.mrForm.items[index].unit);
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
  // DUPLICATE FUNCTIONALITY
  // ========================================

  openDuplicateModal(mr: MaterialRequest): void {
    this.mrToDuplicate = mr;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.mrToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.mrToDuplicate) return;

    const mr = this.mrToDuplicate;

    this.materialService.getMaterialRequestById(mr.id).subscribe({
      next: (response: any) => {
        const sourceMR = response.data;

        this.resetForm();

        const clonedItems = sourceMR.items ? sourceMR.items.map((item: any) => ({
          description: item.description || '',
          unit: item.unit || '',
          quantity: item.quantity || '',
          requiredDate: item.requiredDate || '',
          priority: item.priority || ''
        })) : [];

        this.mrForm = {
          date: this.getTodayDate(),
          section: sourceMR.section || '',
          project: sourceMR.project || '',
          requestPriority: sourceMR.requestPriority || '',
          requestReason: sourceMR.requestReason || '',
          items: clonedItems,
          additionalNotes: sourceMR.additionalNotes || '',
          includeStaticFile: sourceMR.includeStaticFile || false // ✅ Copy T&C flag
        };

        this.currentView = 'create';
        this.currentStep = 'basic';
        this.selectedMR = null;
        this.fieldErrors = {};
        this.formError = '';
        this.formPdfAttachment = null;

        this.closeDuplicateModal();

        const successMsg = this.formLanguage === 'ar'
          ? `تم نسخ بيانات طلب المواد ${mr.mrNumber}. يمكنك التعديل وحفظ طلب جديد.`
          : `Material Request ${mr.mrNumber} data copied. You can modify and save as a new request.`;
        this.showToast('info', successMsg, 5000);
      },
      error: (error: any) => {
        console.error('Error fetching material request for duplication:', error);
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
          additionalNotes: freshMR.additionalNotes || '',
          includeStaticFile: freshMR.includeStaticFile || false // ✅ Load T&C flag
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
    this.savingMR = true;
    this.clearErrors();

    const formattedItems = this.mrForm.items.map(item => ({
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity ? Number(item.quantity) : 0,
      requiredDate: item.requiredDate || '',
      priority: item.priority || ''
    }));

    const mrData: CreateMaterialRequestData = {
      date: this.mrForm.date,
      section: this.mrForm.section,
      project: this.mrForm.project,
      requestPriority: this.mrForm.requestPriority,
      requestReason: this.mrForm.requestReason,
      items: formattedItems,
      additionalNotes: this.mrForm.additionalNotes,
      includeStaticFile: this.mrForm.includeStaticFile // ✅ Include T&C flag
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
// ✅ SHARE/EMAIL FUNCTIONALITY WITH EMAIL SELECTION
// ========================================

openShareModal(mr: MaterialRequest): void {
  if (!mr.pdfFilename) {
    this.showToast('error', this.t('errors.pdfNotGenerated'));
    return;
  }
  this.shareMRId = mr.id;
  this.shareMRNumber = mr.mrNumber;
  
  // Reset selections
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
  this.shareMRId = '';
  this.shareMRNumber = '';
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
          ? `تم إرسال طلب المواد بنجاح إلى ${completedCount} بريد إلكتروني`
          : `Material Request sent successfully to ${completedCount} email${completedCount > 1 ? 's' : ''}`;
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
    
    this.materialService.sendMaterialByEmail(this.shareMRId, email).subscribe({
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

shareFromSuccessModal(): void {
  if (this.successMRId) {
    this.closeSuccessModal();
    this.materialService.getMaterialRequestById(this.successMRId).subscribe({
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
      this.currentStep = 'options'; // ✅ Go to options step
    }
  }

  previousStep(): void {
    if (this.currentStep === 'items') {
      this.currentStep = 'basic';
    } else if (this.currentStep === 'options') {
      this.currentStep = 'items'; // ✅ Go back to items
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
      additionalNotes: '',
      includeStaticFile: false // ✅ Reset T&C flag
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