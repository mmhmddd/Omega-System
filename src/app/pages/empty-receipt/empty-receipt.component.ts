// empty-receipt.component.ts - UPDATED WITH EMAIL SENDING (MATCHING RECEIPTS PATTERN)

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmptyReceiptService, EmptyReceipt } from '../../core/services/empty-receipt.service';
import { AuthService } from '../../core/services/auth.service';

type FormLanguage = 'ar' | 'en';
type ToastType = 'success' | 'error' | 'info' | 'warning';
type TranslationKey = 'success' | 'error' | 'deleted' | 'deleteFailed' | 'deleteConfirmTitle' | 'deleteConfirmMessage' | 'loadFailed' | 'emailSent' | 'emailFailed';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-empty-receipt-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empty-receipt.component.html',
  styleUrl: './empty-receipt.component.scss'
})
export class EmptyReceiptComponent implements OnInit, OnDestroy {
  formLanguage: FormLanguage = 'ar';
  generatingPDF: boolean = false;
  loading: boolean = false;

  // Data
  receipts: EmptyReceipt[] = [];

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalReceipts: number = 0;
  limit: number = 10;

  // Search
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // TOAST STATE
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // SUCCESS MODAL STATE
  showSuccessModal: boolean = false;
  successFilename: string = '';
  successReceiptId: string = ''; // ✅ For email sharing from success modal

  // CONFIRMATION STATE
  showConfirmationModal: boolean = false;
  confirmationTitle: string = '';
  confirmationMessage: string = '';
  private confirmationCallback: (() => void) | null = null;

  // ✅ SHARE MODAL STATE (MATCHING RECEIPTS PATTERN)
  showShareModal: boolean = false;
  shareReceiptId: string = '';
  shareReceiptNumber: string = '';
  sendingEmail: boolean = false;

  // ✅ Email selections (MATCHING RECEIPTS PATTERN)
  emailSelections = {
    email1: false,
    email2: false,
    custom: false
  };

  // ✅ Static emails - UPDATE THESE WITH YOUR ACTUAL EMAILS
  staticEmails = {
    email1: 'first.email@company.com',
    email2: 'second.email@company.com'
  };

  customEmail: string = '';
  currentReceiptForShare: EmptyReceipt | null = null;

  // User role
  userRole: string = '';

  // Translations
  private translations: Record<FormLanguage, Record<TranslationKey, string>> = {
    ar: {
      success: 'تم إنشاء الإشعار الفارغ بنجاح',
      error: 'فشل في إنشاء الإشعار',
      deleted: 'تم حذف الإشعار بنجاح',
      deleteFailed: 'فشل في حذف الإشعار',
      deleteConfirmTitle: 'تأكيد الحذف',
      deleteConfirmMessage: 'هل أنت متأكد من حذف هذا الإشعار الفارغ؟',
      loadFailed: 'فشل تحميل البيانات',
      emailSent: 'تم إرسال البريد الإلكتروني بنجاح',
      emailFailed: 'فشل إرسال البريد الإلكتروني'
    },
    en: {
      success: 'Empty receipt generated successfully',
      error: 'Failed to generate receipt',
      deleted: 'Receipt deleted successfully',
      deleteFailed: 'Failed to delete receipt',
      deleteConfirmTitle: 'Confirm Delete',
      deleteConfirmMessage: 'Are you sure you want to delete this empty receipt?',
      loadFailed: 'Failed to load data',
      emailSent: 'Email sent successfully',
      emailFailed: 'Failed to send email'
    }
  };

  constructor(
    private emptyReceiptService: EmptyReceiptService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.updateDirection();
    this.loadReceipts();

    const user = this.authService.currentUserValue;
    this.userRole = user ? user.role : '';

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
  // ✅ EMAIL SHARING METHODS (MATCHING RECEIPTS PATTERN)
  // ========================================

  /**
   * Open share modal for a receipt
   */
  openShareModal(receipt: EmptyReceipt): void {
    this.currentReceiptForShare = receipt;
    this.shareReceiptId = receipt.id;
    this.shareReceiptNumber = receipt.receiptNumber || receipt.filename;
    this.showShareModal = true;
    
    // Reset selections
    this.emailSelections = {
      email1: false,
      email2: false,
      custom: false
    };
    this.customEmail = '';
  }

  /**
   * Close share modal
   */
  closeShareModal(): void {
    this.showShareModal = false;
    this.shareReceiptId = '';
    this.shareReceiptNumber = '';
    this.currentReceiptForShare = null;
    this.sendingEmail = false;
    this.emailSelections = {
      email1: false,
      email2: false,
      custom: false
    };
    this.customEmail = '';
  }

  /**
   * Share from success modal
   */
  shareFromSuccessModal(): void {
    if (this.successReceiptId) {
      this.closeSuccessModal();
      this.emptyReceiptService.getEmptyReceiptById(this.successReceiptId).subscribe({
        next: (response: any) => {
          this.openShareModal(response.data);
        },
        error: () => {
          this.showToast('error', this.t('loadFailed'));
        }
      });
    }
  }

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
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
      if (this.isValidEmail(this.customEmail.trim())) {
        emails.push(this.customEmail.trim());
      }
    }
    
    return emails;
  }

  /**
   * Check if email form is valid
   */
  isEmailValid(): boolean {
    const selectedEmails = this.getSelectedEmailsList();
    
    // Must have at least one valid email
    if (selectedEmails.length === 0) {
      return false;
    }
    
    // If custom is selected, validate the custom email
    if (this.emailSelections.custom) {
      if (!this.customEmail || this.customEmail.trim() === '') {
        return false;
      }
      if (!this.isValidEmail(this.customEmail.trim())) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Send email with PDF (MATCHING RECEIPTS PATTERN - Sequential sending)
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

    if (!this.currentReceiptForShare) {
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
            ? `تم إرسال الإشعار بنجاح إلى ${completedCount} بريد إلكتروني`
            : `Receipt sent successfully to ${completedCount} email${completedCount > 1 ? 's' : ''}`;
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
      
      this.emptyReceiptService.sendReceiptByEmail(this.shareReceiptId, email).subscribe({
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

  // ========================================
  // USER NAME DISPLAY (SAME AS RECEIPTS)
  // ========================================

  /**
   * Get creator name for display in table
   */
  getCreatorName(receipt: EmptyReceipt): string {
    if (receipt.createdByName && receipt.createdByName.trim() !== '') {
      return receipt.createdByName;
    }
    return receipt.createdBy || '-';
  }

  // ========================================
  // LANGUAGE TOGGLE
  // ========================================

  toggleFormLanguage(lang: FormLanguage): void {
    this.formLanguage = lang;
    this.updateDirection();
  }

  private updateDirection(): void {
    const direction = this.formLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.body.setAttribute('dir', direction);
  }

  private t(key: TranslationKey): string {
    return this.translations[this.formLanguage][key];
  }

  // ========================================
  // TOAST METHODS
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

  openSuccessModal(filename: string, receiptId: string): void {
    this.successFilename = filename;
    this.successReceiptId = receiptId; // ✅ Store receipt ID for email sharing
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successFilename = '';
    this.successReceiptId = '';
    this.loadReceipts();
  }

  viewPDFFromSuccess(): void {
    if (this.successFilename) {
      this.emptyReceiptService.viewPDFInNewTab(this.successFilename);
    }
  }

  printPDFFromSuccess(): void {
    if (this.successFilename) {
      this.emptyReceiptService.openPrintDialog(this.successFilename);
    }
  }

  downloadPDFFromSuccess(): void {
    if (this.successFilename) {
      this.emptyReceiptService.downloadPDF(this.successFilename);
    }
  }

  doneSuccess(): void {
    this.closeSuccessModal();
  }

  // ========================================
  // CONFIRMATION METHODS
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
  // DATA OPERATIONS
  // ========================================

  loadReceipts(): void {
    this.loading = true;

    const params = {
      search: this.searchTerm || undefined,
      page: this.currentPage,
      limit: this.limit
    };

    console.log('📥 Loading receipts with params:', params);

    this.emptyReceiptService.getAllEmptyReceipts(params).subscribe({
      next: (response: any) => {
        console.log('✅ Receipts loaded:', response);
        
        this.receipts = response.data;
        this.currentPage = response.pagination.currentPage;
        this.totalPages = response.pagination.totalPages;
        this.totalReceipts = response.pagination.totalReceipts;
        this.loading = false;
        
        if (this.receipts.length > 0) {
          console.log('📄 First receipt:', this.receipts[0]);
          console.log('👤 Creator name will show as:', this.getCreatorName(this.receipts[0]));
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading empty receipts:', error);
        this.loading = false;
        this.showToast('error', this.t('loadFailed'));
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

  // ========================================
  // GENERATE PDF
  // ========================================

  generateEmptyReceipt(): void {
    this.generatingPDF = true;

    console.log('🔵 Generating empty receipt with language:', this.formLanguage);

    this.emptyReceiptService.generateEmptyReceipt(this.formLanguage).subscribe({
      next: (response: any) => {
        console.log('✅ Receipt generated:', response);
        
        this.generatingPDF = false;
        
        if (response.data && response.data.filename) {
          this.showToast('success', this.t('success'));
          
          setTimeout(() => {
            this.openSuccessModal(response.data.filename, response.data.id);
          }, 300);
        }
      },
      error: (error: any) => {
        console.error('❌ Error generating empty receipt:', error);
        this.generatingPDF = false;
        const errorMsg = error.error?.message || this.t('error');
        this.showToast('error', errorMsg);
      }
    });
  }

  // ========================================
  // PDF OPERATIONS
  // ========================================

  viewPDF(receipt: EmptyReceipt): void {
    this.emptyReceiptService.viewPDFInNewTab(receipt.filename);
  }

  printPDF(receipt: EmptyReceipt): void {
    this.emptyReceiptService.openPrintDialog(receipt.filename);
  }

  downloadPDF(receipt: EmptyReceipt): void {
    this.emptyReceiptService.downloadPDF(receipt.filename);
  }

  showDeleteConfirmation(receipt: EmptyReceipt): void {
    const title = this.t('deleteConfirmTitle');
    const message = this.t('deleteConfirmMessage');
    this.showConfirmation(title, message, () => {
      this.performDelete(receipt);
    });
  }

  private performDelete(receipt: EmptyReceipt): void {
    this.emptyReceiptService.deleteEmptyReceipt(receipt.id).subscribe({
      next: () => {
        this.showToast('success', this.t('deleted'));
        this.loadReceipts();
      },
      error: (error: any) => {
        console.error('❌ Error deleting receipt:', error);
        this.showToast('error', this.t('deleteFailed'));
      }
    });
  }

  // ========================================
  // UTILITIES
  // ========================================

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString(this.formLanguage === 'ar' ? 'ar-EG' : 'en-US');
  }
}