// src/app/pages/files-control/files-control.component.ts - FINAL VERSION WITH DATABASE IDs
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  FileService,
  FileRecord,
  FileType,
  FileCategory,
  SortOption,
  FileStatistics,
  FileFilters
} from '../../core/services/file.service';
import { AuthService } from '../../core/services/auth.service';

interface FileTableData extends FileRecord {
  selected?: boolean;
  databaseId?: string; // ✅ Added for proper deletion
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-files-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './files-control.component.html',
  styleUrl: './files-control.component.scss'
})
export class FilesControlComponent implements OnInit, OnDestroy {
  // Files data
  files: FileTableData[] = [];
  filteredFiles: FileTableData[] = [];
  selectedFile: FileTableData | null = null;

  // File types and categories
  fileTypes: FileType[] = [];
  fileCategories: FileCategory[] = [];
  sortOptions: SortOption[] = [];

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalFiles: number = 0;
  itemsPerPage: number = 20;

  // Loading states
  loading: boolean = false;
  deletingFile: boolean = false;

  // Filter & Search
  searchTerm: string = '';
  selectedType: string = '';
  selectedCategory: string = '';
  startDate: string = '';
  endDate: string = '';
  sortBy: string = 'createdAt';
  sortOrder: string = 'desc';

  // Modals
  showDeleteModal: boolean = false;
  showStatsModal: boolean = false;
  showFileDetailsModal: boolean = false;

  // Statistics
  statistics: FileStatistics | null = null;

  // Actions menu
  activeActionsMenu: string | null = null;
  menuShouldOpenUp: { [fileId: string]: boolean } = {};

  // Toast notifications
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  constructor(
    public fileService: FileService,
    private authService: AuthService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.actions-dropdown')) {
      this.closeActionsMenu();
    }
  }

  ngOnInit(): void {
    this.loadFileTypes();
    this.loadFiles();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
  }

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================

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

  // ============================================
  // DATA LOADING
  // ============================================

  loadFileTypes(): void {
    this.fileService.getFileTypes().subscribe({
      next: (response) => {
        this.fileTypes = response.data.types;
        this.fileCategories = response.data.categories;
        this.sortOptions = response.data.sortOptions;
      },
      error: (error) => {
        console.error('Error loading file types:', error);
      }
    });
  }

  loadFiles(): void {
    this.loading = true;

    const filters: FileFilters = {
      type: this.selectedType || undefined,
      category: this.selectedCategory || undefined,
      search: this.searchTerm || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    this.fileService.getAllFiles(filters).subscribe({
      next: (response) => {
        this.files = response.data.map(f => ({ ...f, selected: false }));
        this.filteredFiles = [...this.files];
        this.totalFiles = response.pagination.totalFiles;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading files:', error);
        this.showToast('error', 'حدث خطأ في تحميل الملفات');
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.fileService.getStatistics().subscribe({
      next: (response) => {
        this.statistics = response.data;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  // ============================================
  // FILTERING & SEARCH
  // ============================================

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadFiles();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadFiles();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedCategory = '';
    this.startDate = '';
    this.endDate = '';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadFiles();
  }

  // ============================================
  // PAGINATION
  // ============================================

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadFiles();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadFiles();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadFiles();
    }
  }

  // ============================================
  // ACTIONS MENU
  // ============================================

  toggleActionsMenu(fileId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.activeActionsMenu === fileId) {
      this.activeActionsMenu = null;
      return;
    }

    this.activeActionsMenu = fileId;

    setTimeout(() => {
      const button = event.currentTarget as HTMLElement;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeightEstimate = 200;

      this.menuShouldOpenUp[fileId] = spaceBelow < menuHeightEstimate;
    }, 0);
  }

  closeActionsMenu(): void {
    this.activeActionsMenu = null;
  }

  isMenuOpen(fileId: string): boolean {
    return this.activeActionsMenu === fileId;
  }

  // ============================================
  // ACTION HANDLERS
  // ============================================

  handleViewDetails(file: FileTableData, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();
    setTimeout(() => {
      this.openFileDetailsModal(file);
    }, 100);
  }

  // ✅ UPDATED: Smart download handling using database ID or specialized endpoints
  handleDownload(file: FileTableData, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();
    
    // Use type-specific download methods
    switch (file.type) {
      case 'emptyReceipts':
        if (file.databaseId) {
          this.fileService.downloadEmptyReceiptById(file.databaseId);
        } else {
          this.fileService.downloadEmptyReceipt(file.name);
        }
        break;
      
      case 'proformaInvoices':
        if (file.databaseId) {
          this.fileService.downloadProformaInvoice(file.databaseId);
        } else {
          this.fileService.downloadFile(file.id);
        }
        break;
      
      case 'costingSheets':
        if (file.databaseId) {
          this.fileService.downloadCostingSheet(file.databaseId);
        } else {
          this.fileService.downloadFile(file.id);
        }
        break;
      
      default:
        // Use file management download for other types
        this.fileService.downloadFile(file.id);
        break;
    }
    
    this.showToast('success', 'جاري تحميل الملف...');
  }

  handlePreview(file: FileTableData, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();

    if (file.category === 'pdf' || file.category === 'image') {
      this.fileService.previewFile(file.id);
    } else {
      this.showToast('info', 'المعاينة متاحة فقط لملفات PDF والصور');
    }
  }

  handleDelete(file: FileTableData, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();
    setTimeout(() => {
      this.openDeleteModal(file);
    }, 100);
  }

  // ============================================
  // FILE DETAILS MODAL
  // ============================================

  openFileDetailsModal(file: FileTableData): void {
    this.selectedFile = file;
    this.showFileDetailsModal = true;
  }

  closeFileDetailsModal(): void {
    this.showFileDetailsModal = false;
    this.selectedFile = null;
  }

  // ============================================
  // DELETE FILE
  // ============================================

  openDeleteModal(file: FileTableData): void {
    this.selectedFile = file;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedFile = null;
  }

  // ✅ CRITICAL FIX: Smart deletion using database ID or type-specific endpoint
confirmDelete(): void {
    if (!this.selectedFile) return;

    this.deletingFile = true;

    // Simply delete via file management - the backend will handle the synchronization
    this.fileService.deleteFile(this.selectedFile.id).subscribe({
      next: (response) => {
        this.showToast('success', response.message || 'تم حذف الملف بنجاح');
        this.deletingFile = false;
        this.closeDeleteModal();
        this.loadFiles();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error deleting file:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ أثناء حذف الملف');
        this.deletingFile = false;
      }
    });
  }

  /**
   * ✅ NEW: Get deletion strategies based on file type
   */
  private getDeleteStrategy(file: FileTableData): (() => void)[] {
    const strategies: (() => void)[] = [];

    // Strategy 1: Use database ID with type-specific endpoint
    if (file.databaseId) {
      switch (file.type) {
        case 'emptyReceipts':
          strategies.push(() => this.deleteViaTypeEndpoint('emptyReceipts', file.databaseId!));
          break;
        case 'proformaInvoices':
          strategies.push(() => this.deleteViaTypeEndpoint('proformaInvoices', file.databaseId!));
          break;
        case 'costingSheets':
          strategies.push(() => this.deleteViaTypeEndpoint('costingSheets', file.databaseId!));
          break;
        case 'receipts':
          strategies.push(() => this.deleteViaTypeEndpoint('receipts', file.databaseId!));
          break;
        case 'quotations':
          strategies.push(() => this.deleteViaTypeEndpoint('quotations', file.databaseId!));
          break;
        case 'secretariatForms':
          strategies.push(() => this.deleteViaTypeEndpoint('secretariatForms', file.databaseId!));
          break;
        case 'rfqs':
          strategies.push(() => this.deleteViaTypeEndpoint('rfqs', file.databaseId!));
          break;
        case 'purchases':
          strategies.push(() => this.deleteViaTypeEndpoint('purchases', file.databaseId!));
          break;
        case 'materials':
          strategies.push(() => this.deleteViaTypeEndpoint('materials', file.databaseId!));
          break;
      }
    }

    // Strategy 2: Use file management deletion (always available as fallback)
    strategies.push(() => this.deleteViaFileManagement(file.id));

    return strategies;
  }

  /**
   * ✅ NEW: Execute delete strategies with fallback
   */
  private executeDeleteStrategy(strategies: (() => void)[], index: number): void {
    if (index >= strategies.length) {
      this.showToast('error', 'فشل حذف الملف. الرجاء المحاولة مرة أخرى.');
      this.deletingFile = false;
      return;
    }

    try {
      strategies[index]();
    } catch (error) {
      console.error(`Strategy ${index} failed:`, error);
      this.executeDeleteStrategy(strategies, index + 1);
    }
  }

  /**
   * ✅ NEW: Delete via type-specific endpoint
   */
  private deleteViaTypeEndpoint(type: string, databaseId: string): void {
    const deleteMethod = this.getTypeDeleteMethod(type);
    
    if (!deleteMethod) {
      throw new Error(`No delete method for type: ${type}`);
    }

    deleteMethod(databaseId).subscribe({
      next: (response: any) => {
        this.showToast('success', response.message || 'تم حذف الملف بنجاح');
        this.deletingFile = false;
        this.closeDeleteModal();
        this.loadFiles();
        this.loadStatistics();
      },
      error: (error: any) => {
        console.error(`Error deleting via ${type} endpoint:`, error);
        // Try file management deletion as fallback
        this.deleteViaFileManagement(this.selectedFile!.id);
      }
    });
  }

  /**
   * ✅ NEW: Delete via file management
   */
  private deleteViaFileManagement(fileId: string): void {
    this.fileService.deleteFile(fileId).subscribe({
      next: (response) => {
        this.showToast('success', response.message || 'تم حذف الملف بنجاح');
        this.deletingFile = false;
        this.closeDeleteModal();
        this.loadFiles();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error deleting via file management:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ أثناء حذف الملف');
        this.deletingFile = false;
      }
    });
  }

  /**
   * ✅ NEW: Get type-specific delete method
   */
  private getTypeDeleteMethod(type: string): ((id: string) => any) | null {
    const methods: { [key: string]: (id: string) => any } = {
      emptyReceipts: (id) => this.fileService.deleteEmptyReceipt(id),
      // Add other types as needed when their services are available
    };

    return methods[type] || null;
  }

  // ============================================
  // STATISTICS MODAL
  // ============================================

  openStatsModal(): void {
    this.showStatsModal = true;
    this.loadStatistics();
  }

  closeStatsModal(): void {
    this.showStatsModal = false;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  get canDeleteFiles(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  getTypeLabel(type: string): string {
    return this.fileService.getTypeLabel(type);
  }

  getCategoryLabel(category: string): string {
    return this.fileService.getCategoryLabel(category);
  }

  getFileIcon(extension: string): string {
    return this.fileService.getFileIcon(extension);
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'pdf': '#ef4444',
      'cad': '#3b82f6',
      'cnc': '#8b5cf6',
      'image': '#10b981',
      'document': '#f59e0b',
      'other': '#6b7280'
    };
    return colors[category] || '#64748b';
  }

  formatDate(date: string): string {
    if (!date) return 'غير متوفر';
    
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  canPreviewFile(file: FileTableData): boolean {
    return file.category === 'pdf' || file.category === 'image';
  }

  getUserDisplayName(file: FileTableData): string {
    return file.createdByName || file.createdBy || 'غير معروف';
  }

  getUserIdentifier(file: FileTableData): string {
    return file.createdByRole || '';
  }

  getTypeIcon(type: string): string {
    return this.fileService.getTypeIcon(type);
  }
}