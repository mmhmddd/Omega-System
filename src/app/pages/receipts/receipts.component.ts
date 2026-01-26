// receipts.component.ts - UPDATED WITH VEHICLE NUMBER & REQUIRED ITEMS

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
  
  // Form data - UPDATED WITH VEHICLE NUMBER
  receiptForm: CreateReceiptData = {
    to: '',
    date: this.getTodayDate(),
    address: '',
    addressTitle: '',
    attention: '',
    projectCode: '',
    workLocation: '',
    companyNumber: '',
    vehicleNumber: '', // NEW FIELD
    additionalText: '',
    items: [],
    notes: ''
  };
  
  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfReceiptId: string = '';
  selectedReceiptNumber: string = '';
  
  // Form PDF Attachment - NEW
  formPdfAttachment: File | null = null;
  
  // User role
  userRole: string = '';
  
  // Translation object - UPDATED WITH ITEMS VALIDATION
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
        invalidDate: 'تاريخ غير صالح',
        loadFailed: 'فشل تحميل البيانات',
        saveFailed: 'فشل حفظ البيانات',
        deleteFailed: 'فشل حذف الإشعار',
        pdfFailed: 'فشل إنشاء PDF',
        networkError: 'خطأ في الاتصال بالخادم',
        invalidPdfFile: 'يرجى اختيار ملف PDF صالح'
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
        invalidDate: 'Invalid date',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete receipt',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error',
        invalidPdfFile: 'Please select a valid PDF file'
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

  ngOnDestroy(): void {
    this.searchSubject.complete();
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.setAttribute('dir', 'rtl');
  }

  private t(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations[this.formLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  }

  /**
   * UPDATED VALIDATION - ALL FIELDS REQUIRED INCLUDING ITEMS
   */
  private validateForm(): boolean {
    this.fieldErrors = {};
    this.formError = '';
    let isValid = true;

    // Required fields validation
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

    // Vehicle Number validation
    if (!this.receiptForm.vehicleNumber || this.receiptForm.vehicleNumber.trim() === '') {
      this.fieldErrors['vehicleNumber'] = this.t('errors.vehicleNumberRequired');
      isValid = false;
    }

    if (!this.receiptForm.notes || this.receiptForm.notes.trim() === '') {
      this.fieldErrors['notes'] = this.t('errors.notesRequired');
      isValid = false;
    }

    // NEW: Items validation - at least one item required
    if (!this.receiptForm.items || this.receiptForm.items.length === 0) {
      this.fieldErrors['items'] = this.t('errors.itemsRequired');
      isValid = false;
    } else {
      // Validate each item has all required fields
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

    // additionalText is OPTIONAL - no validation

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
    } else if (error.status === 400 && error.error?.errors) {
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
   * Handle form PDF attachment selection
   */
  onFormPdfAttachmentSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const errorMsg = this.formLanguage === 'ar' 
          ? 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
          : 'File size is too large. Maximum 10MB allowed';
        alert(errorMsg);
        event.target.value = '';
        return;
      }
      
      this.formPdfAttachment = file;
    } else {
      alert(this.t('errors.invalidPdfFile'));
      event.target.value = '';
    }
  }

  /**
   * Remove form PDF attachment
   */
  removeFormPdfAttachment(): void {
    this.formPdfAttachment = null;
    const fileInput = document.getElementById('form-pdf-attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

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

  onSearch(): void {
    this.currentPage = 1;
    this.loadReceipts();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.showFilterModal = false;
    this.loadReceipts();
  }

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

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadReceipts();
    }
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

  viewPDF(receipt: Receipt): void {
    if (!receipt.pdfFilename) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'لم يتم إنشاء PDF بعد'
        : 'PDF not generated yet';
      alert(errorMsg);
      return;
    }

    this.receiptService.viewPDFInNewTab(receipt.id);
  }

  printReceiptPDF(receipt: Receipt): void {
    if (!receipt.pdfFilename) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'لم يتم إنشاء PDF بعد'
        : 'PDF not generated yet';
      alert(errorMsg);
      return;
    }

    this.receiptService.openPrintDialog(receipt.id);
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
          companyNumber: freshReceipt.companyNumber || '',
          vehicleNumber: freshReceipt.vehicleNumber || '',
          additionalText: freshReceipt.additionalText || '',
          items: JSON.parse(JSON.stringify(freshReceipt.items || [])),
          notes: freshReceipt.notes || ''
        };
      },
      error: (error: any) => {
        console.error('Error fetching receipt:', error);
        this.formError = this.t('errors.loadFailed');
      }
    });
  }

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

  onPDFFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const errorMsg = this.formLanguage === 'ar' 
          ? 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
          : 'File size is too large. Maximum 10MB allowed';
        alert(errorMsg);
        event.target.value = '';
        return;
      }
      
      this.pdfAttachment = file;
    } else {
      const errorMsg = this.formLanguage === 'ar' 
        ? 'يرجى اختيار ملف PDF صالح'
        : 'Please select a valid PDF file';
      alert(errorMsg);
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

  generatePDF(): void {
    this.generatingPDF = true;
    
    this.receiptService.generatePDF(this.pdfReceiptId, this.pdfAttachment || undefined).subscribe({
      next: (response: any) => {
        this.generatingPDF = false;
        this.closePDFModal();
        
        const successMsg = this.formLanguage === 'ar'
          ? 'تم إنشاء ملف PDF بنجاح'
          : 'PDF generated successfully';
        alert(successMsg);
        
        this.loadReceipts();
      },
      error: (error: any) => {
        console.error('Error generating PDF:', error);
        this.generatingPDF = false;
        
        const errorMsg = error.error?.message || this.t('errors.pdfFailed');
        alert(errorMsg);
      }
    });
  }

  downloadPDF(receipt: Receipt): void {
    if (receipt.pdfFilename) {
      this.receiptService.downloadPDF(receipt.id, receipt.pdfFilename);
    }
  }

  nextStep(): void {
    if (this.currentStep === 'basic') {
      // Clear items-related errors when moving to next step
      const itemsErrorKeys = Object.keys(this.fieldErrors).filter(key => 
        key === 'items' || key.startsWith('item_')
      );
      itemsErrorKeys.forEach(key => delete this.fieldErrors[key]);
      
      if (this.validateBasicFields()) {
        this.currentStep = 'items';
      }
    }
  }

  /**
   * NEW: Validate only basic fields (without items)
   */
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
    
    // Clear errors for this item
    delete this.fieldErrors[`item_${index}_quantity`];
    delete this.fieldErrors[`item_${index}_description`];
    delete this.fieldErrors[`item_${index}_element`];
    
    // If items are now empty, add items error
    if (this.receiptForm.items.length === 0) {
      this.fieldErrors['items'] = this.t('errors.itemsRequired');
    }
  }

  /**
   * Save receipt with full validation including items
   */
  saveReceipt(): void {
    if (!this.validateForm()) {
      // If validation fails, scroll to the error
      if (this.fieldErrors['items'] || Object.keys(this.fieldErrors).some(key => key.startsWith('item_'))) {
        this.currentStep = 'items';
      } else {
        this.currentStep = 'basic';
      }
      return;
    }

    this.savingReceipt = true;
    this.clearErrors();

    const receiptData = { ...this.receiptForm };

    if (this.currentView === 'create') {
      this.receiptService.createReceipt(receiptData).subscribe({
        next: (response: any) => {
          const createdReceipt = response.data;
          
          const creatingMsg = this.formLanguage === 'ar'
            ? 'جاري إنشاء الإشعار وملف PDF...'
            : 'Creating receipt and generating PDF...';
          console.log(creatingMsg);
          
          // Generate PDF with optional attachment
          this.receiptService.generatePDF(createdReceipt.id, this.formPdfAttachment || undefined).subscribe({
            next: (pdfResponse: any) => {
              this.savingReceipt = false;
              const successMsg = this.formLanguage === 'ar'
                ? 'تم إنشاء الإشعار وملف PDF بنجاح'
                : 'Receipt and PDF created successfully';
              alert(successMsg);
              this.backToList();
              this.loadReceipts();
            },
            error: (pdfError: any) => {
              console.error('Error generating PDF:', pdfError);
              this.savingReceipt = false;
              const warningMsg = this.formLanguage === 'ar'
                ? 'تم إنشاء الإشعار ولكن فشل إنشاء PDF. يمكنك إنشاءه لاحقاً.'
                : 'Receipt created but PDF generation failed. You can generate it later.';
              alert(warningMsg);
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
            next: (pdfResponse: any) => {
              this.savingReceipt = false;
              const successMsg = this.formLanguage === 'ar'
                ? 'تم تحديث الإشعار وملف PDF بنجاح'
                : 'Receipt and PDF updated successfully';
              alert(successMsg);
              this.backToList();
              this.loadReceipts();
            },
            error: (pdfError: any) => {
              console.error('Error regenerating PDF:', pdfError);
              this.savingReceipt = false;
              const warningMsg = this.formLanguage === 'ar'
                ? 'تم تحديث الإشعار ولكن فشل تحديث PDF'
                : 'Receipt updated but PDF regeneration failed';
              alert(warningMsg);
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
}