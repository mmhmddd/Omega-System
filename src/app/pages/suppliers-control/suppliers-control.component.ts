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
  exportingExcel: boolean = false;

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
  countries: string[] = ['Jordan','Egypt', 'UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'];

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


  /**
 * Export suppliers to Excel
 */
exportToExcel(): void {
  this.exportingExcel = true;

  // Build filters based on current selections
  const filters: any = {};
  if (this.selectedStatus) filters.status = this.selectedStatus;
  if (this.selectedCountry) filters.country = this.selectedCountry;
  if (this.selectedCity) filters.city = this.selectedCity;
  if (this.selectedMaterial) filters.materialType = this.selectedMaterial;
  if (this.minRating > 0) filters.minRating = this.minRating;

  this.supplierService.exportToExcel(filters).subscribe({
    next: (blob) => {
      // Generate filename with current date
      const filename = `suppliers-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Download the file
      this.supplierService.downloadExcelFile(blob, filename);
      
      this.showToast('success', 'تم تصدير الموردين بنجاح');
      this.exportingExcel = false;
    },
    error: (error) => {
      console.error('Error exporting to Excel:', error);
      this.showToast('error', 'حدث خطأ أثناء تصدير الموردين');
      this.exportingExcel = false;
    }
  });
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
    // Create form - Only name is required
    this.createSupplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      companyName: [''],
      contactPerson: [''],
      email: [''], // Optional
      phone: [''], // Optional
      address: [''],
      city: [''],
      country: [''],
      materialTypes: [[]],
      rating: [0],
      status: ['active']
    });

    // Edit form - Only name is required
    this.editSupplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      companyName: [''],
      contactPerson: [''], // Optional
      email: [''], // Optional
      phone: [''], // Optional
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

  formatPhone(phone: string): string {
  if (!phone || phone.length !== 10) return phone;
  // Format as: 079 1234 567
  return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
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

    const formData = this.createSupplierForm.value;
    
    // Check if supplier name already exists
    const nameExists = this.suppliers.some(
      s => s.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );
    
    if (nameExists) {
      this.showToast('error', 'اسم المورد موجود بالفعل! يرجى اختيار اسم آخر');
      return;
    }

    this.savingSupplier = true;

    // Generate unique temporary values for required fields if empty
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    const supplierData: any = {
      name: formData.name,
      status: formData.status || 'active',
      rating: formData.rating || 0
    };

    // Add email - use temporary unique email if empty
    if (formData.email && formData.email.trim() !== '') {
      supplierData.email = formData.email;
    } else {
      supplierData.email = `temp_${timestamp}_${randomId}@supplier.local`;
    }

    // Add phone - use temporary unique phone if empty
    if (formData.phone && formData.phone.trim() !== '') {
      supplierData.phone = formData.phone;
    } else {
      supplierData.phone = `TEMP${timestamp}`;
    }

    // Add optional fields only if they have values
    if (formData.companyName && formData.companyName.trim() !== '') {
      supplierData.companyName = formData.companyName;
    }
    if (formData.contactPerson && formData.contactPerson.trim() !== '') {
      supplierData.contactPerson = formData.contactPerson;
    }
    if (formData.address && formData.address.trim() !== '') {
      supplierData.address = formData.address;
    }
    if (formData.city && formData.city.trim() !== '') {
      supplierData.city = formData.city;
    }
    if (formData.country && formData.country.trim() !== '') {
      supplierData.country = formData.country;
    }
    if (formData.materialTypes && formData.materialTypes.length > 0) {
      supplierData.materialTypes = formData.materialTypes;
    }

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

    const formData = this.editSupplierForm.value;
    
    // Check if new name already exists (excluding current supplier)
    const nameExists = this.suppliers.some(
      s => s.id !== this.selectedSupplier!.id && 
           s.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );
    
    if (nameExists) {
      this.showToast('error', 'اسم المورد موجود بالفعل! يرجى اختيار اسم آخر');
      return;
    }

    this.savingSupplier = true;
    
    // Generate unique temporary values for required fields if empty
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    const updateData: any = {
      name: formData.name,
      status: formData.status || 'active',
      rating: formData.rating || 0
    };

    // Add email - keep existing or use temporary unique email if empty
    if (formData.email && formData.email.trim() !== '') {
      updateData.email = formData.email;
    } else {
      // Keep old email if exists and not temp, otherwise generate new temp
      if (this.selectedSupplier.email && !this.selectedSupplier.email.includes('temp_') && !this.selectedSupplier.email.includes('@supplier.local')) {
        updateData.email = this.selectedSupplier.email;
      } else {
        updateData.email = `temp_${timestamp}_${randomId}@supplier.local`;
      }
    }

    // Add phone - keep existing or use temporary unique phone if empty
    if (formData.phone && formData.phone.trim() !== '') {
      updateData.phone = formData.phone;
    } else {
      // Keep old phone if exists and not temp, otherwise generate new temp
      if (this.selectedSupplier.phone && !this.selectedSupplier.phone.includes('TEMP')) {
        updateData.phone = this.selectedSupplier.phone;
      } else {
        updateData.phone = `TEMP${timestamp}`;
      }
    }

    // Add optional fields only if they have values
    if (formData.companyName && formData.companyName.trim() !== '') {
      updateData.companyName = formData.companyName;
    }
    if (formData.contactPerson && formData.contactPerson.trim() !== '') {
      updateData.contactPerson = formData.contactPerson;
    }
    if (formData.address && formData.address.trim() !== '') {
      updateData.address = formData.address;
    }
    if (formData.city && formData.city.trim() !== '') {
      updateData.city = formData.city;
    }
    if (formData.country && formData.country.trim() !== '') {
      updateData.country = formData.country;
    }
    if (formData.materialTypes && formData.materialTypes.length > 0) {
      updateData.materialTypes = formData.materialTypes;
    }

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