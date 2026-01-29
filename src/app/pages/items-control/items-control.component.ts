import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ItemsService, Item, CreateItemData, UpdateItemData } from '../../core/services/items.service';
import { AuthService } from '../../core/services/auth.service';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-items-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './items-control.component.html',
  styleUrl: './items-control.component.scss'
})
export class ItemsControlComponent implements OnInit, OnDestroy {

  // ============================================
  // VIEW MANAGEMENT
  // ============================================
  currentView: 'list' | 'create' | 'edit' = 'list';

  // ============================================
  // DATA
  // ============================================
  items: Item[] = [];
  selectedItem: Item | null = null;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // ============================================
  // FORM DATA
  // ============================================
  itemForm: CreateItemData = {
    name: '',
    description: ''
  };

  // ============================================
  // PAGINATION
  // ============================================
  currentPage: number = 1;
  totalPages: number = 1;
  totalItems: number = 0;
  pageSize: number = 10;

  // ============================================
  // FILTERS & SEARCH
  // ============================================
  searchTerm: string = '';

  // ============================================
  // LOADING STATES
  // ============================================
  loading: boolean = false;
  savingItem: boolean = false;
  deletingItem: boolean = false;

  // ============================================
  // VALIDATION ERRORS
  // ============================================
  fieldErrors: { [key: string]: string } = {};
  formError: string = '';

  // ============================================
  // MODALS
  // ============================================
  showDeleteModal: boolean = false;

  constructor(
    private itemsService: ItemsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAccess();
    this.loadItems();
  }

  ngOnDestroy(): void {
    // Clear all toast timeouts
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
  }

  // ============================================
  // ACCESS CONTROL
  // ============================================

  checkAccess(): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      this.showToast('error', 'يجب تسجيل الدخول أولاً');
      return;
    }

    if (!this.hasAccess()) {
      this.showToast('error', 'ليس لديك صلاحية للوصول إلى هذه الصفحة');
    }
  }

  hasAccess(): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;
    return currentUser.role === 'super_admin' || currentUser.role === 'admin';
  }

  // ============================================
  // TOAST METHODS
  // ============================================

  showToast(type: ToastType, message: string, duration: number = 3000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message };

    this.toasts.push(toast);

    // Auto-remove
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimeouts.set(id, timeout);
    }

    // Limit to 5 toasts
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

  loadItems(): void {
    if (!this.hasAccess()) return;

    this.loading = true;

    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined
    };

    this.itemsService.getAllItems(filters).subscribe({
      next: (response) => {
        this.items = response.data;
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ في تحميل الأصناف');
        this.loading = false;
      }
    });
  }

  // ============================================
  // VIEW MANAGEMENT
  // ============================================

  createItem(): void {
    if (!this.hasAccess()) {
      this.showToast('error', 'ليس لديك صلاحية لإنشاء صنف');
      return;
    }

    this.resetForm();
    this.currentView = 'create';
    this.formError = '';
    this.fieldErrors = {};
  }

  editItem(item: Item): void {
    if (!this.hasAccess()) {
      this.showToast('error', 'ليس لديك صلاحية لتعديل الأصناف');
      return;
    }

    this.selectedItem = item;
    this.populateFormWithItem(item);
    this.currentView = 'edit';
    this.formError = '';
    this.fieldErrors = {};
  }

  backToList(): void {
    this.currentView = 'list';
    this.resetForm();
    this.loadItems();
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    this.itemForm = {
      name: '',
      description: ''
    };
    this.selectedItem = null;
    this.fieldErrors = {};
    this.formError = '';
  }

  populateFormWithItem(item: Item): void {
    this.itemForm = {
      name: item.name,
      description: item.description || ''
    };
  }

  // ============================================
  // VALIDATION
  // ============================================

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    // Validate name
    const nameValidation = this.itemsService.validateItemName(this.itemForm.name);
    if (!nameValidation.valid) {
      this.fieldErrors['name'] = nameValidation.error || 'اسم الصنف غير صالح';
      isValid = false;
    }

    // Validate description
    const descValidation = this.itemsService.validateDescription(this.itemForm.description || null);
    if (!descValidation.valid) {
      this.fieldErrors['description'] = descValidation.error || 'الوصف غير صالح';
      isValid = false;
    }

    return isValid;
  }

  // ============================================
  // SAVE ITEM
  // ============================================

  saveItem(): void {
    if (!this.validateForm()) {
      this.formError = 'يرجى تصحيح الأخطاء في النموذج';
      this.showToast('warning', this.formError);
      return;
    }

    this.savingItem = true;
    this.formError = '';

    const itemData: CreateItemData | UpdateItemData = {
      name: this.itemForm.name.trim(),
      description: this.itemForm.description?.trim() || undefined
    };

    if (this.currentView === 'create') {
      this.createNewItem(itemData as CreateItemData);
    } else {
      this.updateExistingItem(itemData as UpdateItemData);
    }
  }

  createNewItem(itemData: CreateItemData): void {
    this.itemsService.createItem(itemData).subscribe({
      next: (response) => {
        this.savingItem = false;
        this.showToast('success', response.message || 'تم إنشاء الصنف بنجاح');
        this.backToList();
      },
      error: (error) => {
        console.error('Error creating item:', error);
        const errorMsg = error.error?.message || 'حدث خطأ أثناء إنشاء الصنف';
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.savingItem = false;
      }
    });
  }

  updateExistingItem(itemData: UpdateItemData): void {
    if (!this.selectedItem) return;

    this.itemsService.updateItem(this.selectedItem.id, itemData).subscribe({
      next: (response) => {
        this.savingItem = false;
        this.showToast('success', response.message || 'تم تحديث الصنف بنجاح');
        this.backToList();
      },
      error: (error) => {
        console.error('Error updating item:', error);
        const errorMsg = error.error?.message || 'حدث خطأ أثناء تحديث الصنف';
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.savingItem = false;
      }
    });
  }

  // ============================================
  // DELETE ITEM
  // ============================================

  openDeleteModal(item: Item): void {
    if (!this.hasAccess()) {
      this.showToast('error', 'ليس لديك صلاحية لحذف الأصناف');
      return;
    }

    this.selectedItem = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedItem = null;
  }

  confirmDelete(): void {
    if (!this.selectedItem) return;

    this.deletingItem = true;

    this.itemsService.deleteItem(this.selectedItem.id).subscribe({
      next: (response) => {
        this.showToast('success', response.message || 'تم حذف الصنف بنجاح');
        this.deletingItem = false;
        this.closeDeleteModal();
        this.loadItems();
      },
      error: (error) => {
        console.error('Error deleting item:', error);
        const errorMsg = error.error?.message || 'حدث خطأ أثناء حذف الصنف';
        this.showToast('error', errorMsg);
        this.deletingItem = false;
      }
    });
  }

  // ============================================
  // SEARCH & PAGINATION
  // ============================================

  onSearchChange(): void {
    if (this.searchTerm.length >= 2 || this.searchTerm.length === 0) {
      this.currentPage = 1;
      this.loadItems();
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadItems();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatDate(dateString: string): string {
    return this.itemsService.formatDate(dateString);
  }

  formatDateTime(dateString: string): string {
    return this.itemsService.formatDateTime(dateString);
  }
}
