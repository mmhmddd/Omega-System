// src/app/pages/rfqs/rfqs.component.ts - UPDATED WITH OPTIONAL FIELDS

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RfqService, RFQ, RFQItem, CreateRFQData } from '../../core/services/rfq.service';
import { SupplierService, Supplier } from '../../core/services/supplier.service';
import { AuthService } from '../../core/services/auth.service';

type ViewMode = 'list' | 'create' | 'edit' | 'view';
type FormStep = 'basic' | 'items' | 'options';
type FormLanguage = 'ar' | 'en';
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Department Interface
interface Department {
  value: string;
  labelAr: string;
  labelEn: string;
}

@Component({
  selector: 'app-rfqs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rfqs.component.html',
  styleUrl: './rfqs.component.scss'
})
export class RFQsComponent implements OnInit, OnDestroy {

 // ✅ DEFAULT TERMS & CONDITIONS TEXT

private readonly DEFAULT_TERMS_AR = `الشروط والأحكام

تُعتبر جميع المواد والبنود والخدمات غير المذكورة صراحةً في هذا المستند مستثناة. كما أن أي خدمات أو أعمال تقع خارج نطاق عمل المورد غير مشمولة. ضريبة القيمة المضافة وأي رسوم حكومية أو تصاريح أو موافقات رسمية غير مشمولة ما لم يُذكر خلاف ذلك صراحةً. كما أن الأعمال المدنية وأعمال الرفع والمناولة وفك وإعادة تركيب العوائق الموجودة في الموقع أو أي أعمال مشابهة غير مشمولة ما لم يتم ذكرها بشكل واضح.

أي أعمال إضافية أو تغييرات أو تعديلات أو متطلبات غير مذكورة في هذا المستند تخضع لتكاليف إضافية وتعديل في مدة التنفيذ حسب الحالة. كما أن رسوم الدراسات واعتماد التصاميم والموافقات الرسمية والتصاريح وختم المخططات والحسابات الهندسية أو أي متطلبات فنية مشابهة غير مشمولة ما لم يُذكر خلاف ذلك صراحةً.

الأسعار مبنية على أساس تنفيذ الطلب بالكامل كما هو محدد، وفي حال تنفيذ جزء من الطلب يحق للمورد تعديل الأسعار وفقًا لذلك.

تكون شروط الدفع على النحو التالي:
• ( )% دفعة مقدمة عند تأكيد الطلب  
• ( )% أثناء التنفيذ / عند التوريد  
• ( )% عند الانتهاء والتسليم النهائي  

يسري هذا المستند لمدة ( ) يوم تقويمي / يوم عمل من تاريخ الإصدار ما لم يُذكر خلاف ذلك.

تعتمد مدة التنفيذ والتوريد على تأكيد الطلب واستلام الموافقات اللازمة وجاهزية الموقع.  
مدة التنفيذ التقديرية: ( ) يوم / أسبوع / شهر من تاريخ تأكيد الطلب.`;



private readonly DEFAULT_TERMS_EN = `Terms and Conditions

All materials, items, and services not explicitly stated in this document shall be considered excluded. Any services or works falling outside the Supplier’s scope are not included. Value Added Tax (VAT) and any applicable governmental fees, permits, or approvals are not included unless otherwise expressly stated. Civil works, lifting equipment, handling, dismantling, re-installation of existing site obstacles, or any similar activities are excluded unless clearly mentioned.

Any additional work, variations, modifications, or requirements not specified in this document shall be subject to additional cost and corresponding time adjustments, as applicable. Fees related to studies, design approvals, authority approvals, permits, stamping, engineering calculations, or any similar technical requirements are not included unless explicitly stated.

Prices are based on the execution of the complete order as specified. In the event of partial order execution, the Supplier reserves the right to revise and amend the prices accordingly.

Payment terms shall be as follows:
• ( )% advance payment upon order confirmation  
• ( )% during project execution / upon delivery  
• ( )% upon completion and final handover  

This document is valid for ( ) calendar / working days from the date of issuance unless otherwise stated.

Execution and delivery timelines are subject to order confirmation, receipt of required approvals, and readiness of the project/site conditions.  
Estimated execution period: ( ) days / weeks / months from the date of order confirmation.`;




  // View states
  currentView: ViewMode = 'list';
  currentStep: FormStep = 'basic';
  formLanguage: FormLanguage = 'ar';
  
  // Data
  rfqs: RFQ[] = [];
  selectedRFQ: RFQ | null = null;
  
  // ✅ NEW: Departments and Suppliers
  departments: Department[] = [
    { value: 'procurement', labelAr: 'المشتريات', labelEn: 'Procurement' },
    { value: 'warehouse', labelAr: 'المخزن', labelEn: 'Warehouse' },
    { value: 'maintenance', labelAr: 'الصيانة', labelEn: 'Maintenance' },
    { value: 'sales', labelAr: 'المبيعات', labelEn: 'Sales' },
    { value: 'marketing', labelAr: 'التسويق', labelEn: 'Marketing' },
    { value: 'development', labelAr: 'التطوير', labelEn: 'Development' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' }
  ];
  
  suppliers: Supplier[] = [];
  loadingSuppliers: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalRFQs: number = 0;
  limit: number = 10;
  
  // Search
  searchTerm: string = '';
  showFilterModal: boolean = false;
  filters = {
    rfqNumber: '',
    startDate: '',
    endDate: '',
    supplier: '',
    production: '',
    status: '',
    urgent: ''
  };
  
  private searchSubject = new Subject<string>();
  
  // Loading states
  loading: boolean = false;
  savingRFQ: boolean = false;
  generatingPDF: boolean = false;
  
  // Error handling
  formError: string = '';
  fieldErrors: { [key: string]: string } = {};
  
  // Form data
  rfqForm: CreateRFQData = {
  date: this.getTodayDate(),
  time: this.getCurrentTime(),
  requester: '',
  production: '',
  supplier: '',
  supplierAddress: '',
  urgent: false,
  items: [],
  notes: '',
  includeTermsAndConditions: false,
  termsAndConditionsText: ''
};


  /**
   * Get default Terms & Conditions based on current language
   */
  getDefaultTermsAndConditions(): string {
    return this.formLanguage === 'ar' ? this.DEFAULT_TERMS_AR : this.DEFAULT_TERMS_EN;
  }

  /**
   * Handle Terms & Conditions checkbox change
   */
  onTermsAndConditionsToggle(): void {
    if (this.rfqForm.includeTermsAndConditions) {
      if (!this.rfqForm.termsAndConditionsText || this.rfqForm.termsAndConditionsText.trim() === '') {
        this.rfqForm.termsAndConditionsText = this.getDefaultTermsAndConditions();
      }
    }
  }
  
    /**
   * Reset Terms & Conditions to default
   */
  resetTermsToDefault(): void {
    this.rfqForm.termsAndConditionsText = this.getDefaultTermsAndConditions();
  }
  // PDF generation
  showPDFModal: boolean = false;
  pdfAttachment: File | null = null;
  pdfRFQId: string = '';
  selectedRFQNumber: string = '';
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
  successRFQId: string = '';
  successRFQNumber: string = '';
  
  // ✅ DUPLICATE MODAL STATE
  showDuplicateModal: boolean = false;
  rfqToDuplicate: RFQ | null = null;
  
showShareModal: boolean = false;
shareRFQId: string = '';
shareRFQNumber: string = '';
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
        timeRequired: 'الوقت مطلوب',
        requesterRequired: 'مقدم الطلب مطلوب',
        productionRequired: 'القسم مطلوب',
        supplierRequired: 'المورد مطلوب',
        supplierAddressRequired: 'عنوان المورد مطلوب',
        itemsRequired: 'يجب إضافة عنصر واحد على الأقل',
        itemDescriptionRequired: 'الوصف مطلوب للعنصر',
        itemUnitRequired: 'الوحدة مطلوبة للعنصر',
        itemQuantityRequired: 'الكمية مطلوبة للعنصر',
        loadFailed: 'فشل تحميل البيانات',
        saveFailed: 'فشل حفظ البيانات',
        deleteFailed: 'فشل حذف الطلب',
        pdfFailed: 'فشل إنشاء PDF',
        networkError: 'خطأ في الاتصال بالخادم',
        invalidPdfFile: 'يرجى اختيار ملف PDF صالح',
        fileTooLarge: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
        pdfNotGenerated: 'لم يتم إنشاء PDF بعد',
        pdfGenerationWarning: 'تم إنشاء الطلب ولكن فشل إنشاء PDF',
        pdfUpdateWarning: 'تم تحديث الطلب ولكن فشل تحديث PDF',
        suppliersLoadFailed: 'فشل تحميل قائمة الموردين',
        emailRequired: 'يرجى اختيار بريد إلكتروني أو إدخال بريد مخصص',
        invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
        emailFailed: 'فشل إرسال البريد الإلكتروني'
      },
      messages: {
        deleteConfirmTitle: 'تأكيد الحذف',
        deleteConfirmMessage: 'هل أنت متأكد من حذف طلب التسعير',
        created: 'تم إنشاء الطلب بنجاح',
        updated: 'تم تحديث الطلب بنجاح',
        deleted: 'تم حذف الطلب بنجاح',
        pdfGenerated: 'تم إنشاء ملف PDF بنجاح',
        createdWithPdf: 'تم إنشاء الطلب وملف PDF بنجاح',
        updatedWithPdf: 'تم تحديث الطلب وملف PDF بنجاح',
        emailSent: 'تم إرسال البريد الإلكتروني بنجاح',
        emailSending: 'جاري إرسال البريد الإلكتروني...'
      }
    },
    en: {
      errors: {
        required: 'This field is required',
        dateRequired: 'Date is required',
        timeRequired: 'Time is required',
        requesterRequired: 'Requester is required',
        productionRequired: 'Department is required',
        supplierRequired: 'Supplier is required',
        supplierAddressRequired: 'Supplier Address is required',
        itemsRequired: 'At least one item must be added',
        itemDescriptionRequired: 'Description is required for item',
        itemUnitRequired: 'Unit is required for item',
        itemQuantityRequired: 'Quantity is required for item',
        loadFailed: 'Failed to load data',
        saveFailed: 'Failed to save data',
        deleteFailed: 'Failed to delete RFQ',
        pdfFailed: 'Failed to generate PDF',
        networkError: 'Server connection error',
        invalidPdfFile: 'Please select a valid PDF file',
        fileTooLarge: 'File size is too large. Maximum 10MB',
        pdfNotGenerated: 'PDF not generated yet',
        pdfGenerationWarning: 'RFQ created but PDF failed',
        pdfUpdateWarning: 'RFQ updated but PDF failed',
        suppliersLoadFailed: 'Failed to load suppliers list',
        emailRequired: 'Please select an email or enter a custom email',
        invalidEmail: 'Please enter a valid email address',
        emailFailed: 'Failed to send email'
      },
      messages: {
        deleteConfirmTitle: 'Confirm Delete',
        deleteConfirmMessage: 'Are you sure you want to delete RFQ',
        created: 'RFQ created successfully',
        updated: 'RFQ updated successfully',
        deleted: 'RFQ deleted successfully',
        pdfGenerated: 'PDF generated successfully',
        createdWithPdf: 'RFQ and PDF created successfully',
        updatedWithPdf: 'RFQ and PDF updated successfully',
        emailSent: 'Email sent successfully',
        emailSending: 'Sending email...'
      }
    }
  };
  
  constructor(
    private rfqService: RfqService,
    private supplierService: SupplierService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadRFQs();
    this.loadSuppliers();
    const user = this.authService.currentUserValue;
    this.userRole = user ? user.role : '';
    
    this.updateDirection();
    
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadRFQs();
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
  
  openDuplicateModal(rfq: RFQ): void {
    this.rfqToDuplicate = rfq;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.rfqToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.rfqToDuplicate) return;

    const rfq = this.rfqToDuplicate;

    // Reset form first
    this.resetForm();

    // Populate form with duplicated data
    this.rfqForm = {
      date: this.getTodayDate(),
      time: this.getCurrentTime(),
      requester: rfq.requester || '',
      production: rfq.production || '',
      supplier: rfq.supplier || '',
      supplierAddress: rfq.supplierAddress || '',
      urgent: rfq.urgent || false,
      items: JSON.parse(JSON.stringify(rfq.items || [])),
      notes: rfq.notes || '',
      includeTermsAndConditions: rfq.includeTermsAndConditions || false,
      termsAndConditionsText: rfq.termsAndConditionsText || ''
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
      ? `تم نسخ بيانات طلب التسعير ${rfq.rfqNumber}. يمكنك التعديل وحفظ طلب جديد.`
      : `RFQ ${rfq.rfqNumber} data copied. You can modify and save as a new RFQ.`;
    this.showToast('info', successMsg, 5000);
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
      }
    });
  }

  onSupplierChange(): void {
    const selectedSupplier = this.suppliers.find(s => s.name === this.rfqForm.supplier);
    if (selectedSupplier && selectedSupplier.address) {
      this.rfqForm.supplierAddress = selectedSupplier.address;
    }
  }

  getDepartmentLabel(dept: Department): string {
    return this.formLanguage === 'ar' ? dept.labelAr : dept.labelEn;
  }

  // ========================================
  // CALCULATION METHODS
  // ========================================
  
  calculateItemTotal(item: RFQItem): string {
    const quantity = parseFloat(item.quantity?.toString() || '0') || 0;
    const estimatedUnitPrice = parseFloat(item.estimatedUnitPrice?.toString() || '0') || 0;
    const total = quantity * estimatedUnitPrice;
    return total > 0 ? total.toFixed(2) : '0.00';
  }
  
  onItemFieldChange(item: RFQItem): void {
    item.totalPrice = this.calculateItemTotal(item);
  }

/**
 * Open share modal
 */
openShareModal(rfq: RFQ): void {
  if (!rfq.pdfFilename) {
    this.showToast('error', this.t('errors.pdfNotGenerated'));
    return;
  }
  this.shareRFQId = rfq.id;
  this.shareRFQNumber = rfq.rfqNumber;
  
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
  this.shareRFQId = '';
  this.shareRFQNumber = '';
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
 * Send email to selected recipients
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
          ? `تم إرسال طلب التسعير بنجاح إلى ${completedCount} بريد إلكتروني`
          : `RFQ sent successfully to ${completedCount} email${completedCount > 1 ? 's' : ''}`;
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
    
    this.rfqService.sendRFQByEmail(this.shareRFQId, email).subscribe({
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
  if (this.successRFQId) {
    this.closeSuccessModal();
    this.rfqService.getRFQById(this.successRFQId).subscribe({
      next: (response: any) => {
        this.openShareModal(response.data);
      },
      error: () => {
        this.showToast('error', this.t('errors.loadFailed'));
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
  
openSuccessModal(rfqId: string, rfqNumber: string): void {
  this.successRFQId = rfqId;
  this.successRFQNumber = rfqNumber;
  
  // ✅ Fetch the full RFQ to get the PDF filename
  this.rfqService.getRFQById(rfqId).subscribe({
    next: (response: any) => {
      this.selectedRFQ = response.data; // Store the full object
      this.showSuccessModal = true;
    },
    error: (error: any) => {
      console.error('Error fetching RFQ for success modal:', error);
      // Still show modal even if fetch fails
      this.showSuccessModal = true;
    }
  });
}

closeSuccessModal(): void {
  this.showSuccessModal = false;
  this.successRFQId = '';
  this.successRFQNumber = '';
  this.selectedRFQ = null; // ✅ Clear the selected RFQ
  this.backToList();
}

  viewPDFFromSuccess(): void {
    if (this.successRFQId) {
      this.rfqService.viewPDFInNewTab(this.successRFQId);
    }
  }

  printPDFFromSuccess(): void {
    if (this.successRFQId) {
      this.rfqService.openPrintDialog(this.successRFQId);
    }
  }

downloadPDFFromSuccess(): void {
  if (this.successRFQId && this.selectedRFQ && this.selectedRFQ.pdfFilename) {
    // ✅ Use the actual PDF filename from the database
    this.rfqService.downloadPDF(this.successRFQId, this.selectedRFQ.pdfFilename);
  } else if (this.successRFQId && this.successRFQNumber) {
    // ✅ Fallback: Use RFQ number if we don't have the full filename
    this.rfqService.downloadPDF(this.successRFQId, `${this.successRFQNumber}.pdf`);
  } else {
    this.showToast('error', this.t('errors.pdfNotGenerated'));
  }
}

  doneSuccess(): void {
    this.closeSuccessModal();
    this.loadRFQs();
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

  loadRFQs(): void {
    this.loading = true;
    this.clearErrors();
    
    const filterParams = {
      search: this.searchTerm || undefined,
      rfqNumber: this.filters.rfqNumber || undefined,
      startDate: this.filters.startDate || undefined,
      endDate: this.filters.endDate || undefined,
      supplier: this.filters.supplier || undefined,
      production: this.filters.production || undefined,
      status: this.filters.status || undefined,
      urgent: this.filters.urgent || undefined,
      page: this.currentPage,
      limit: this.limit
    };

    this.rfqService.getAllRFQs(filterParams).subscribe({
      next: (response: any) => {
        this.rfqs = response.data;
        this.currentPage = response.pagination.currentPage;
        this.totalPages = response.pagination.totalPages;
        this.totalRFQs = response.pagination.totalRFQs;
        this.userRole = response.userRole || this.userRole;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading RFQs:', error);
        this.loading = false;
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadRFQs();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadRFQs();
    }
  }

  createRFQ(): void {
    this.currentView = 'create';
    this.currentStep = 'basic';
    this.resetForm();
    this.clearErrors();
  }

  editRFQ(rfq: RFQ): void {
    this.clearErrors();
    this.rfqService.getRFQById(rfq.id).subscribe({
      next: (response: any) => {
        const freshRFQ = response.data;
        this.selectedRFQ = freshRFQ;
        this.currentView = 'edit';
        this.currentStep = 'basic';
        this.rfqForm = {
          date: freshRFQ.date || this.getTodayDate(),
          time: freshRFQ.time || this.getCurrentTime(),
          requester: freshRFQ.requester || '',
          production: freshRFQ.production || '',
          supplier: freshRFQ.supplier || '',
          supplierAddress: freshRFQ.supplierAddress || '',
          urgent: freshRFQ.urgent || false,
          items: JSON.parse(JSON.stringify(freshRFQ.items || [])),
          notes: freshRFQ.notes || '',
          includeTermsAndConditions: freshRFQ.includeTermsAndConditions || false,
          termsAndConditionsText: freshRFQ.termsAndConditionsText || ''
        };
      },
      error: (error: any) => {
        console.error('Error fetching RFQ:', error);
        this.formError = this.t('errors.loadFailed');
        this.showToast('error', this.t('errors.loadFailed'));
      }
    });
  }

  showDeleteConfirmation(rfq: RFQ): void {
    const title = this.t('messages.deleteConfirmTitle');
    const message = `${this.t('messages.deleteConfirmMessage')} ${rfq.rfqNumber}?`;
    this.showConfirmation(title, message, () => {
      this.performDelete(rfq);
    });
  }

  private performDelete(rfq: RFQ): void {
    this.rfqService.deleteRFQ(rfq.id).subscribe({
      next: () => {
        this.showToast('success', this.t('messages.deleted'));
        this.loadRFQs();
      },
      error: (error: any) => {
        console.error('Error deleting RFQ:', error);
        this.showToast('error', this.t('errors.deleteFailed'));
      }
    });
  }

  saveRFQ(): void {
    // ✅ NO VALIDATION - Save directly
    this.savingRFQ = true;
    this.clearErrors();
    
    this.rfqForm.items.forEach(item => {
      item.totalPrice = this.calculateItemTotal(item);
    });
    
    const rfqData = {
      date: this.rfqForm.date,
      time: this.rfqForm.time,
      requester: this.rfqForm.requester,
      production: this.rfqForm.production,
      supplier: this.rfqForm.supplier,
      supplierAddress: this.rfqForm.supplierAddress,
      urgent: this.rfqForm.urgent,
      items: this.rfqForm.items,
      notes: this.rfqForm.notes,
      includeTermsAndConditions: this.rfqForm.includeTermsAndConditions || false,
      termsAndConditionsText: this.rfqForm.termsAndConditionsText || ''
    };

    if (this.currentView === 'create') {
      this.rfqService.createRFQ(rfqData).subscribe({
        next: (response: any) => {
          const createdRFQ = response.data;
          this.rfqService.generatePDF(createdRFQ.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingRFQ = false;
              this.showToast('success', this.t('messages.createdWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(createdRFQ.id, createdRFQ.rfqNumber);
              }, 500);
            },
            error: () => {
              this.savingRFQ = false;
              this.showToast('warning', this.t('errors.pdfGenerationWarning'));
              this.backToList();
              this.loadRFQs();
            }
          });
        },
        error: (error: any) => {
          this.savingRFQ = false;
          this.handleBackendError(error);
        }
      });
    } else if (this.currentView === 'edit' && this.selectedRFQ) {
      this.rfqService.updateRFQ(this.selectedRFQ.id, rfqData).subscribe({
        next: (response: any) => {
          const updatedRFQ = response.data;
          this.rfqService.generatePDF(updatedRFQ.id, this.formPdfAttachment || undefined).subscribe({
            next: () => {
              this.savingRFQ = false;
              this.showToast('success', this.t('messages.updatedWithPdf'));
              setTimeout(() => {
                this.openSuccessModal(updatedRFQ.id, updatedRFQ.rfqNumber);
              }, 500);
            },
            error: () => {
              this.savingRFQ = false;
              this.showToast('warning', this.t('errors.pdfUpdateWarning'));
              this.backToList();
              this.loadRFQs();
            }
          });
        },
        error: (error: any) => {
          this.savingRFQ = false;
          this.handleBackendError(error);
        }
      });
    }
  }

  // ========================================
  // PDF OPERATIONS
  // ========================================

  viewPDF(rfq: RFQ): void {
    if (!rfq.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.rfqService.viewPDFInNewTab(rfq.id);
  }

  printRFQPDF(rfq: RFQ): void {
    if (!rfq.pdfFilename) {
      this.showToast('error', this.t('errors.pdfNotGenerated'));
      return;
    }
    this.rfqService.openPrintDialog(rfq.id);
  }

  downloadPDF(rfq: RFQ): void {
    if (rfq.pdfFilename) {
      this.rfqService.downloadPDF(rfq.id, rfq.pdfFilename);
    }
  }

  openPDFModal(rfq: RFQ): void {
    this.pdfRFQId = rfq.id;
    this.selectedRFQNumber = rfq.rfqNumber;
    this.showPDFModal = true;
    this.pdfAttachment = null;
  }

  closePDFModal(): void {
    this.showPDFModal = false;
    this.pdfAttachment = null;
    this.pdfRFQId = '';
    this.selectedRFQNumber = '';
  }

  getPDFFilename(): string {
    if (!this.selectedRFQNumber) return '';
    return `${this.selectedRFQNumber}.pdf`;
  }

  generatePDF(): void {
    this.generatingPDF = true;
    this.rfqService.generatePDF(this.pdfRFQId, this.pdfAttachment || undefined).subscribe({
      next: () => {
        this.generatingPDF = false;
        this.closePDFModal();
        this.showToast('success', this.t('messages.pdfGenerated'));
        this.loadRFQs();
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
    this.rfqForm.items.push({
      description: '',
      unit: '',
      quantity: '',
      taskNo: '',
      jobNo: '',
      estimatedUnitPrice: '',
      totalPrice: '0.00'
    });
  }

  removeItem(index: number): void {
    this.rfqForm.items.splice(index, 1);
    delete this.fieldErrors[`item_${index}_description`];
    delete this.fieldErrors[`item_${index}_unit`];
    delete this.fieldErrors[`item_${index}_quantity`];
  }

  backToList(): void {
    this.currentView = 'list';
    this.currentStep = 'basic';
    this.selectedRFQ = null;
    this.resetForm();
    this.clearErrors();
    this.formPdfAttachment = null;
  }

  resetForm(): void {
    this.rfqForm = {
      date: this.getTodayDate(),
      time: this.getCurrentTime(),
      requester: '',
      production: '',
      supplier: '',
      supplierAddress: '',
      urgent: false,
      items: [],
      notes: '',
      includeTermsAndConditions: false,
      termsAndConditionsText: ''
    };
    this.formPdfAttachment = null;
    this.clearErrors();
  }

  // ========================================
  // UTILITIES
  // ========================================

  getTodayDate(): string {
    return this.rfqService.getTodayDate();
  }

  getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  getItemsCount(): number {
    return this.rfqForm.items.length;
  }

  getCreatorName(rfq: RFQ): string {
    if (rfq.createdByName && rfq.createdByName.trim() !== '') {
      return rfq.createdByName;
    }
    return rfq.createdBy || '-';
  }

  getStatusClass(rfq: RFQ): string {
    if (rfq.status === 'approved') return 'status-approved';
    if (rfq.status === 'rejected') return 'status-rejected';
    return 'status-pending';
  }

  getStatusText(rfq: RFQ): string {
    if (this.formLanguage === 'ar') {
      if (rfq.status === 'approved') return 'موافق عليه';
      if (rfq.status === 'rejected') return 'مرفوض';
      return 'قيد الانتظار';
    }
    if (rfq.status === 'approved') return 'Approved';
    if (rfq.status === 'rejected') return 'Rejected';
    return 'Pending';
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

  hasPDF(rfq: RFQ): boolean {
    return !!rfq.pdfFilename;
  }
}