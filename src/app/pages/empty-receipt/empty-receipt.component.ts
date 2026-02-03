// empty-receipt.component.ts - UPDATED WITH USER NAME DISPLAY (SAME AS RECEIPTS)

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmptyReceiptService } from '../../core/services/empty-receipt.service';
import { AuthService } from '../../core/services/auth.service';

type FormLanguage = 'ar' | 'en';
type ToastType = 'success' | 'error' | 'info' | 'warning';
type TranslationKey = 'success' | 'error' | 'deleted' | 'deleteFailed' | 'deleteConfirmTitle' | 'deleteConfirmMessage' | 'loadFailed';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface EmptyReceipt {
  id: string;
  filename: string;
  language: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
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

  // CONFIRMATION STATE
  showConfirmationModal: boolean = false;
  confirmationTitle: string = '';
  confirmationMessage: string = '';
  private confirmationCallback: (() => void) | null = null;

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
      loadFailed: 'فشل تحميل البيانات'
    },
    en: {
      success: 'Empty receipt generated successfully',
      error: 'Failed to generate receipt',
      deleted: 'Receipt deleted successfully',
      deleteFailed: 'Failed to delete receipt',
      deleteConfirmTitle: 'Confirm Delete',
      deleteConfirmMessage: 'Are you sure you want to delete this empty receipt?',
      loadFailed: 'Failed to load data'
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
  // USER NAME DISPLAY (SAME AS RECEIPTS)
  // ========================================

  /**
   * Get creator name for display in table
   * Same logic as receipts.component.ts
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

  openSuccessModal(filename: string): void {
    this.successFilename = filename;
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successFilename = '';
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
        
        // Log first receipt for debugging
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
            this.openSuccessModal(response.data.filename);
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