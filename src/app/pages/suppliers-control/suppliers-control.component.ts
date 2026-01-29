import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupplierService, Supplier, CreateSupplierData } from '../../core/services/supplier.service';
import { AuthService } from '../../core/services/auth.service';

interface SupplierTableData extends Supplier {
  selected?: boolean;
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-suppliers-control',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './suppliers-control.component.html',
  styleUrl: './suppliers-control.component.scss'
})
export class SuppliersControlComponent implements OnInit {
  // Suppliers data
  suppliers: SupplierTableData[] = [];
  filteredSuppliers: SupplierTableData[] = [];
  selectedSupplier: Supplier | null = null;

  // Available material types
  availableMaterials: string[] = [
    'Steel',
    'Aluminum',
    'Plastic',
    'Wood',
    'Glass',
    'Copper',
    'Brass',
    'Stainless Steel',
    'Carbon Fiber',
    'Rubber',
    'Fabric',
    'Leather'
  ];

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalSuppliers: number = 0;
  pageSize: number = 10;
  itemsPerPage: number = 10;

  // Loading states
  loading: boolean = false;
  savingSupplier: boolean = false;
  deletingSupplier: boolean = false;
  changingStatus: boolean = false;

  // Filter & Search
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedCountry: string = '';
  selectedCity: string = '';
  selectedMaterial: string = '';
  minRating: number = 0;

  // Modals
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  showStatusModal: boolean = false;
  showStatsModal: boolean = false;

  // Forms
  createSupplierForm!: FormGroup;
  editSupplierForm!: FormGroup;

  // Statistics
  statistics: any = null;

  // Status options
  statusOptions = [
    { value: '', label: 'جميع الحالات' },
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'suspended', label: 'معلق' }
  ];

  // Countries
  countries: string[] = ['Egypt', 'UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'];

  // Actions menu
  activeActionsMenu: string | null = null;
  menuShouldOpenUp: { [supplierId: string]: boolean } = {};

  // Toast notifications
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // Status change
  newStatus: string = 'active';

  constructor(
    private supplierService: SupplierService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if click is outside both trigger and menu
    if (!target.closest('.actions-dropdown')) {
      this.closeActionsMenu();
    }
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadSuppliers();
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
  // INITIALIZATION
  // ============================================

  private initializeForms(): void {
    this.createSupplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      companyName: [''],
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s-]+$/)]],
      address: [''],
      city: [''],
      country: [''],
      materialTypes: [[]],
      rating: [0, [Validators.min(0), Validators.max(5)]],
      status: ['active']
    });

    this.editSupplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      companyName: [''],
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s-]+$/)]],
      address: [''],
      city: [''],
      country: [''],
      materialTypes: [[]],
      rating: [0, [Validators.min(0), Validators.max(5)]],
      status: ['active']
    });
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadSuppliers(): void {
    this.loading = true;

    const filters: any = {};
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.selectedCountry) filters.country = this.selectedCountry;
    if (this.selectedCity) filters.city = this.selectedCity;
    if (this.selectedMaterial) filters.materialType = this.selectedMaterial;
    if (this.minRating > 0) filters.minRating = this.minRating;

    this.supplierService.getAllSuppliers(filters).subscribe({
      next: (response) => {
        this.suppliers = response.data.map(s => ({ ...s, selected: false }));
        this.applySearchFilter();
        this.totalSuppliers = this.filteredSuppliers.length;
        this.calculatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.showToast('error', 'حدث خطأ في تحميل الموردين');
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.supplierService.getStatistics().subscribe({
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

  applySearchFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredSuppliers = [...this.suppliers];
      return;
    }

    const query = this.searchTerm.toLowerCase();
    this.filteredSuppliers = this.suppliers.filter(s =>
      s.name?.toLowerCase().includes(query) ||
      s.companyName?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.contactPerson?.toLowerCase().includes(query) ||
      s.city?.toLowerCase().includes(query) ||
      s.country?.toLowerCase().includes(query)
    );
  }

  onSearchChange(): void {
    this.applySearchFilter();
    this.totalSuppliers = this.filteredSuppliers.length;
    this.calculatePagination();
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadSuppliers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedCountry = '';
    this.selectedCity = '';
    this.selectedMaterial = '';
    this.minRating = 0;
    this.currentPage = 1;
    this.loadSuppliers();
  }

  // ============================================
  // PAGINATION
  // ============================================

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredSuppliers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get paginatedSuppliers(): SupplierTableData[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredSuppliers.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // ============================================
  // ACTIONS MENU - COMPLETELY FIXED
  // ============================================

  /**
   * Toggle actions menu with improved event handling
   */
  toggleActionsMenu(supplierId: string, event: MouseEvent): void {
    // CRITICAL: Stop event propagation
    event.stopPropagation();
    event.preventDefault();

    console.log('Toggle menu for supplier:', supplierId);
    console.log('Current active menu:', this.activeActionsMenu);

    // If clicking the same menu, close it
    if (this.activeActionsMenu === supplierId) {
      console.log('Closing menu');
      this.activeActionsMenu = null;
      return;
    }

    // Open the new menu
    console.log('Opening menu');
    this.activeActionsMenu = supplierId;

    // Calculate menu direction after a small delay
    setTimeout(() => {
      const button = event.currentTarget as HTMLElement;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeightEstimate = 200;

      this.menuShouldOpenUp[supplierId] = spaceBelow < menuHeightEstimate;
      console.log('Menu should open up:', this.menuShouldOpenUp[supplierId]);
    }, 0);
  }

  closeActionsMenu(): void {
    console.log('Closing all menus');
    this.activeActionsMenu = null;
  }

  /**
   * Check if menu is open for a specific supplier
   */
  isMenuOpen(supplierId: string): boolean {
    return this.activeActionsMenu === supplierId;
  }

  // ============================================
  // ACTION HANDLERS
  // ============================================

  handleStatusChange(supplier: Supplier, event: MouseEvent): void {
    console.log('Status change clicked for:', supplier.name);
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();
    setTimeout(() => {
      this.openStatusModal(supplier);
    }, 100);
  }

  handleEdit(supplier: Supplier, event: MouseEvent): void {
    console.log('Edit clicked for:', supplier.name);
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();
    setTimeout(() => {
      this.openEditModal(supplier);
    }, 100);
  }

  handleDelete(supplier: Supplier, event: MouseEvent): void {
    console.log('Delete clicked for:', supplier.name);
    event.stopPropagation();
    event.preventDefault();
    this.closeActionsMenu();
    setTimeout(() => {
      this.openDeleteModal(supplier);
    }, 100);
  }

  // ============================================
  // CREATE SUPPLIER
  // ============================================

  openCreateModal(): void {
    this.createSupplierForm.reset({
      status: 'active',
      rating: 0,
      materialTypes: []
    });
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createSupplierForm.reset();
  }

  toggleMaterialInForm(form: FormGroup, material: string): void {
    const currentMaterials = form.get('materialTypes')?.value || [];
    const index = currentMaterials.indexOf(material);

    if (index > -1) {
      currentMaterials.splice(index, 1);
    } else {
      currentMaterials.push(material);
    }

    form.patchValue({ materialTypes: currentMaterials });
  }

  isMaterialSelected(form: FormGroup, material: string): boolean {
    const materials = form.get('materialTypes')?.value || [];
    return materials.includes(material);
  }

  onCreateSubmit(): void {
    if (this.createSupplierForm.invalid) {
      this.createSupplierForm.markAllAsTouched();
      return;
    }

    this.savingSupplier = true;

    const supplierData: CreateSupplierData = this.createSupplierForm.value;

    this.supplierService.createSupplier(supplierData).subscribe({
      next: (response) => {
        this.showToast('success', 'تم إنشاء المورد بنجاح');
        this.savingSupplier = false;
        this.closeCreateModal();
        this.loadSuppliers();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error creating supplier:', error);
        this.showToast('error', error.error?.error || 'حدث خطأ أثناء إنشاء المورد');
        this.savingSupplier = false;
      }
    });
  }

  // ============================================
  // EDIT SUPPLIER
  // ============================================

  openEditModal(supplier: Supplier): void {
    console.log('Opening edit modal for:', supplier);
    this.selectedSupplier = supplier;
    this.editSupplierForm.patchValue({
      name: supplier.name,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      materialTypes: supplier.materialTypes || [],
      rating: supplier.rating,
      status: supplier.status
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedSupplier = null;
    this.editSupplierForm.reset();
  }

  onEditSubmit(): void {
    if (this.editSupplierForm.invalid || !this.selectedSupplier) {
      this.editSupplierForm.markAllAsTouched();
      return;
    }

    this.savingSupplier = true;

    const updateData = this.editSupplierForm.value;

    this.supplierService.updateSupplier(this.selectedSupplier.id, updateData).subscribe({
      next: (response) => {
        this.showToast('success', 'تم تحديث المورد بنجاح');
        this.savingSupplier = false;
        this.closeEditModal();
        this.loadSuppliers();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error updating supplier:', error);
        this.showToast('error', error.error?.error || 'حدث خطأ أثناء تحديث المورد');
        this.savingSupplier = false;
      }
    });
  }

  // ============================================
  // DELETE SUPPLIER
  // ============================================

  openDeleteModal(supplier: Supplier): void {
    this.selectedSupplier = supplier;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedSupplier = null;
  }

  confirmDelete(): void {
    if (!this.selectedSupplier) return;

    this.deletingSupplier = true;

    this.supplierService.deleteSupplier(this.selectedSupplier.id).subscribe({
      next: (response) => {
        this.showToast('success', 'تم حذف المورد بنجاح');
        this.deletingSupplier = false;
        this.closeDeleteModal();
        this.loadSuppliers();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error deleting supplier:', error);
        this.showToast('error', error.error?.error || 'حدث خطأ أثناء حذف المورد');
        this.deletingSupplier = false;
      }
    });
  }

  // ============================================
  // CHANGE STATUS
  // ============================================

  openStatusModal(supplier: Supplier): void {
    console.log('Opening status modal for:', supplier);
    this.selectedSupplier = { ...supplier };
    this.newStatus = supplier.status;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedSupplier = null;
    this.newStatus = 'active';
  }

  confirmStatusChange(): void {
    if (!this.selectedSupplier) {
      console.error('No supplier selected');
      return;
    }

    console.log('Changing status from', this.selectedSupplier.status, 'to', this.newStatus);

    this.changingStatus = true;

    this.supplierService.updateSupplierStatus(
      this.selectedSupplier.id, 
      this.newStatus as 'active' | 'inactive' | 'pending' | 'suspended'
    ).subscribe({
      next: (response) => {
        console.log('Status changed successfully:', response);
        this.showToast('success', 'تم تغيير حالة المورد بنجاح');
        this.changingStatus = false;
        this.closeStatusModal();
        this.loadSuppliers();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error changing status:', error);
        this.showToast('error', error.error?.error || 'حدث خطأ أثناء تغيير الحالة');
        this.changingStatus = false;
      }
    });
  }

  // ============================================
  // STATISTICS
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

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'نشط',
      'inactive': 'غير نشط',
      'pending': 'قيد الانتظار',
      'suspended': 'معلق'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': '#22c55e',
      'inactive': '#ef4444',
      'pending': '#f59e0b',
      'suspended': '#6b7280'
    };
    return colorMap[status] || '#64748b';
  }

  getFormError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field?.touched || !field?.errors) return '';

    if (field.errors['required']) return 'هذا الحقل مطلوب';
    if (field.errors['email']) return 'البريد الإلكتروني غير صالح';
    if (field.errors['pattern']) return 'الصيغة غير صحيحة';
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `يجب أن يكون ${minLength} أحرف على الأقل`;
    }
    if (field.errors['min']) return `القيمة يجب أن تكون ${field.errors['min'].min} على الأقل`;
    if (field.errors['max']) return `القيمة يجب أن تكون ${field.errors['max'].max} على الأكثر`;

    return '';
  }

  get canManageSuppliers(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  getRatingStars(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('full');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }

    return stars;
  }

  countSuppliersByStatus(status: string): number {
    return this.suppliers.filter(s => s.status === status).length;
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}