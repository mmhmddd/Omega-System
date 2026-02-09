// users-control.component.ts (UPDATED - Filtered Routes for Employee Access)
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsersService, User, CreateUserData, AvailableRoute } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';

interface UserTableData extends User {
  selected?: boolean;
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface UserRole {
  value: string;
  label: string;
  color: string;
  displayName?: string;
}

interface RouteCategory {
  key: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-users-control',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './users-control.component.html',
  styleUrl: './users-control.component.scss'
})
export class UsersControlComponent implements OnInit, OnDestroy {
  users: UserTableData[] = [];
  filteredUsers: UserTableData[] = [];
  selectedUser: User | null = null;

  availableRoutes: AvailableRoute[] = [];

  // ✅ Define allowed routes for employees
  private readonly ALLOWED_EMPLOYEE_ROUTES = [
    'suppliers',           // إدارة الموردين
    'itemsControl',        // إدارة الأصناف
    'receipts',            // إشعار استلام
    'rfqs',                // طلب تسعير
    'purchases',           // طلب شراء
    'materialRequests',    // طلب مواد
    'priceQuotes',         // عرض سعر
    'proformaInvoice',     // الفواتير الأولية
    'costingSheet',        // كشف التكاليف
    'secretariatUserManagement' // طلبات الموظفين
  ];

  routeCategories: RouteCategory[] = [
    { key: 'management', name: 'إدارة النظام', icon: 'bi-gear-fill' },
    { key: 'procurement', name: 'المشتريات والموردين', icon: 'bi-cart-fill' },
    { key: 'inventory', name: 'المخزون والمواد', icon: 'bi-box-seam' },
    { key: 'operations', name: 'العمليات التشغيلية', icon: 'bi-diagram-3-fill' },
    { key: 'reports', name: 'التقارير والتحليلات', icon: 'bi-graph-up' }
  ];

  currentPage: number = 1;
  totalPages: number = 1;
  totalUsers: number = 0;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  loading: boolean = false;
  loadingRoutes: boolean = false;
  savingUser: boolean = false;
  deletingUser: boolean = false;

  searchTerm: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';

  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  showRouteAccessModal: boolean = false;
  showSystemAccessModal: boolean = false;

  createUserForm!: FormGroup;
  editUserForm!: FormGroup;
  routeAccessForm: string[] = [];
  systemAccessForm: { laserCuttingManagement: boolean } = {
    laserCuttingManagement: false
  };

  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  userRoles: UserRole[] = [
    { value: 'super_admin', label: 'IT', color: '#dc2626', displayName: 'IT' },
    { value: 'admin', label: 'المدير', color: '#ea580c', displayName: 'المدير' },
    { value: 'admin', label: 'المدير العام', color: '#ea580c', displayName: 'المدير العام' },
    { value: 'admin', label: 'المهندس', color: '#ea580c', displayName: 'المهندس' },
    { value: 'secretariat', label: 'سكرتيرة', color: '#7c3aed', displayName: 'سكرتيرة' },
    { value: 'employee', label: 'المحاسبة', color: '#0891b2', displayName: 'المحاسبة' },
    { value: 'employee', label: 'HR', color: '#0891b2', displayName: 'HR' },
    { value: 'employee', label: 'مسؤول مستودع', color: '#0891b2', displayName: 'مسؤول مستودع' }
  ];

  statusFilters = [
    { value: '', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' }
  ];

  activeActionsMenu: string | null = null;
  menuShouldOpenUp: { [userId: string]: boolean } = {};

  get Math() {
    return Math;
  }

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.actions-menu') || target.closest('.actions-trigger')) {
      return;
    }
    this.closeActionsMenu();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadUsers();
    this.loadAvailableRoutes();
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
  // ACTIONS MENU
  // ============================================

  toggleActionsMenu(userId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.activeActionsMenu === userId) {
      this.activeActionsMenu = null;
      return;
    }

    this.menuShouldOpenUp = {};
    this.activeActionsMenu = userId;

    setTimeout(() => {
      const button = document.querySelector(`[data-user-id="${userId}"]`) as HTMLElement;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeightEstimate = 250;

      this.menuShouldOpenUp[userId] = spaceBelow < menuHeightEstimate;
    }, 0);
  }

  closeActionsMenu(): void {
    this.activeActionsMenu = null;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeForms(): void {
    this.createUserForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['employee', Validators.required],
      systemAccess: this.fb.group({
        laserCuttingManagement: [false]
      }),
      routeAccess: [[]]
    });

    this.editUserForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role: ['', Validators.required],
      active: [true]
    });
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadUsers(): void {
    this.loading = true;

    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      role: this.selectedRole || undefined
    };

    this.usersService.getAllUsers(filters).subscribe({
      next: (response) => {
        this.users = response.data.map(user => ({
          ...user,
          selected: false,
          routeAccess: user.routeAccess || []
        }));
        this.applyFilters();

        this.totalUsers = response.pagination.totalUsers;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showToast('error', 'حدث خطأ في تحميل المستخدمين');
        this.loading = false;
      }
    });
  }

  loadAvailableRoutes(): void {
    this.loadingRoutes = true;

    this.usersService.getAvailableRoutes().subscribe({
      next: (response) => {
        this.availableRoutes = response.data;

        console.log('✅ Loaded available routes:', this.availableRoutes.length);
        this.availableRoutes.forEach(route => {
          console.log(`  - ${route.key} (${route.category}): ${route.label}`);
        });

        this.loadingRoutes = false;
      },
      error: (error) => {
        console.error('❌ Error loading available routes:', error);
        this.showToast('error', 'حدث خطأ في تحميل المسارات المتاحة');
        this.loadingRoutes = false;
      }
    });
  }

  // ============================================
  // ✅ FILTERING METHODS - EMPLOYEE ROUTES ONLY
  // ============================================

  /**
   * ✅ Get only allowed routes for employees
   */
  getFilteredRoutesForEmployees(): AvailableRoute[] {
    return this.availableRoutes.filter(route =>
      this.ALLOWED_EMPLOYEE_ROUTES.includes(route.key)
    );
  }

  /**
   * ✅ Get routes by category (filtered for employees)
   */
  getRoutesByCategory(categoryKey: string): AvailableRoute[] {
    if (!this.availableRoutes || this.availableRoutes.length === 0) {
      return [];
    }

    // ✅ First filter by allowed routes, then by category
    const allowedRoutes = this.getFilteredRoutesForEmployees();

    const filtered = allowedRoutes.filter(route => {
      const routeCategory = (route as any).category || '';
      return routeCategory === categoryKey;
    });

    return filtered;
  }

  // ============================================
  // FILTERING & SEARCH
  // ============================================

  applyFilters(): void {
    let filtered = [...this.users];

    if (this.selectedStatus === 'active') {
      filtered = filtered.filter(u => u.active);
    } else if (this.selectedStatus === 'inactive') {
      filtered = filtered.filter(u => !u.active);
    }

    this.filteredUsers = filtered;
  }

  onSearchChange(): void {
    if (this.searchTerm.length >= 3 || this.searchTerm.length === 0) {
      this.currentPage = 1;
      this.loadUsers();
    }
  }

  onRoleFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  // ============================================
  // PAGINATION
  // ============================================

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  get paginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ============================================
  // CREATE USER
  // ============================================

  openCreateModal(): void {
    this.createUserForm.reset({
      role: 'employee',
      systemAccess: { laserCuttingManagement: false },
      routeAccess: []
    });
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createUserForm.reset();
  }

  toggleRouteInForm(event: any, routeKey: string): void {
    const currentRoutes = this.createUserForm.get('routeAccess')?.value || [];
    const index = currentRoutes.indexOf(routeKey);

    if (event.target.checked && index === -1) {
      currentRoutes.push(routeKey);
    } else if (!event.target.checked && index > -1) {
      currentRoutes.splice(index, 1);
    }

    this.createUserForm.patchValue({ routeAccess: currentRoutes });
  }

  onCreateSubmit(): void {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.savingUser = true;

    const userData: CreateUserData = this.createUserForm.value;

    this.usersService.createUser(userData).subscribe({
      next: (response) => {
        this.showToast('success', 'تم إنشاء المستخدم بنجاح');
        this.savingUser = false;
        this.closeCreateModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ أثناء إنشاء المستخدم');
        this.savingUser = false;
      }
    });
  }

  // ============================================
  // EDIT USER
  // ============================================

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editUserForm.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.editUserForm.reset();
  }

  onEditSubmit(): void {
    if (this.editUserForm.invalid || !this.selectedUser) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    this.savingUser = true;

    const updateData = { ...this.editUserForm.value };

    if (!updateData.password) {
      delete updateData.password;
    }

    this.usersService.updateUser(this.selectedUser.id, updateData).subscribe({
      next: (response) => {
        this.showToast('success', 'تم تحديث المستخدم بنجاح');
        this.savingUser = false;
        this.closeEditModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ أثناء تحديث المستخدم');
        this.savingUser = false;
      }
    });
  }

  // ============================================
  // DELETE USER
  // ============================================

  openDeleteModal(user: User): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  confirmDelete(): void {
    if (!this.selectedUser) return;

    this.deletingUser = true;

    this.usersService.deleteUser(this.selectedUser.id).subscribe({
      next: (response) => {
        this.showToast('success', 'تم حذف المستخدم بنجاح');
        this.deletingUser = false;
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ أثناء حذف المستخدم');
        this.deletingUser = false;
      }
    });
  }

  // ============================================
  // TOGGLE ACTIVE STATUS
  // ============================================

  toggleUserActive(user: User, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    this.closeActionsMenu();

    this.usersService.toggleUserActive(user.id).subscribe({
      next: (response) => {
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex > -1) {
          this.users[userIndex].active = response.data.active;
        }

        const filteredIndex = this.filteredUsers.findIndex(u => u.id === user.id);
        if (filteredIndex > -1) {
          this.filteredUsers[filteredIndex].active = response.data.active;
        }

        this.showToast('success', `تم ${response.data.active ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`);
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.showToast('error', error.error?.message || 'حدث خطأ أثناء تغيير حالة المستخدم');
      }
    });
  }

  // ============================================
  // ✅ ROUTE ACCESS MANAGEMENT (FILTERED)
  // ============================================

  openRouteAccessModal(user: User): void {
    if (user.role !== 'employee') {
      this.showToast('warning', 'صلاحيات المسارات متاحة للموظفين فقط');
      return;
    }

    this.selectedUser = user;

    // ✅ Filter user's routes to only include allowed ones
    const userRoutes = Array.isArray(user.routeAccess) ? user.routeAccess : [];
    this.routeAccessForm = userRoutes.filter(route =>
      this.ALLOWED_EMPLOYEE_ROUTES.includes(route)
    );

    console.log('==========================================');
    console.log('✅ Opening Route Access Modal (Filtered)');
    console.log('User:', user.name);
    console.log('Current routeAccess (filtered):', this.routeAccessForm);
    console.log('Available routes:', this.getFilteredRoutesForEmployees().length);
    console.log('==========================================');

    this.showRouteAccessModal = true;
  }

  closeRouteAccessModal(): void {
    this.showRouteAccessModal = false;
    this.selectedUser = null;
    this.routeAccessForm = [];
  }

  toggleRouteAccess(routeKey: string): void {
    // ✅ Only allow toggling of allowed routes
    if (!this.ALLOWED_EMPLOYEE_ROUTES.includes(routeKey)) {
      console.warn('⚠️ Route not allowed for employees:', routeKey);
      return;
    }

    const index = this.routeAccessForm.indexOf(routeKey);

    if (index > -1) {
      this.routeAccessForm.splice(index, 1);
      console.log(`❌ Removed: ${routeKey}`);
    } else {
      this.routeAccessForm.push(routeKey);
      console.log(`✅ Added: ${routeKey}`);
    }

    console.log('Current selection:', this.routeAccessForm);
  }

  isRouteSelected(routeKey: string): boolean {
    return this.routeAccessForm.includes(routeKey);
  }

saveRouteAccess(): void {
  if (!this.selectedUser) {
    this.showToast('error', 'لم يتم تحديد مستخدم');
    return;
  }

  if (!Array.isArray(this.routeAccessForm)) {
    this.showToast('error', 'خطأ في البيانات');
    return;
  }

  const validRoutes = this.routeAccessForm.filter(route =>
    this.ALLOWED_EMPLOYEE_ROUTES.includes(route)
  );

  console.log('💾 SAVING ROUTE ACCESS (Filtered)');
  console.log('User ID:', this.selectedUser.id);
  console.log('Routes to save:', validRoutes);

  this.savingUser = true;

  this.usersService.updateRouteAccess(this.selectedUser.id, validRoutes).subscribe({
    next: (response) => {
      console.log('✅ SUCCESS! Saved routes:', response.data.routeAccess);
      this.showToast('success', 'تم تحديث صلاحيات المسارات بنجاح');
      
      // ✅ NEW: If updating current user, force refresh their session
      const currentUser = this.authService.currentUserValue;
      if (currentUser && currentUser.id === this.selectedUser!.id) {
        console.log('🔄 Updating current user permissions - forcing refresh...');
        
        this.authService.forceRefresh().subscribe({
          next: (updatedUser) => {
            console.log('✅ Current user session updated:', updatedUser.routeAccess);
            this.showToast('info', 'تم تحديث الصلاحيات في حسابك الحالي');
          },
          error: (error) => {
            console.error('❌ Error refreshing current user:', error);
          }
        });
      }
      
      this.savingUser = false;
      this.closeRouteAccessModal();
      this.loadUsers();
    },
    error: (error) => {
      console.error('❌ ERROR saving routes:', error);
      this.showToast('error', error.error?.message || 'حدث خطأ أثناء تحديث الصلاحيات');
      this.savingUser = false;
    }
  });
}

  // ============================================
  // SYSTEM ACCESS MANAGEMENT
  // ============================================

  openSystemAccessModal(user: User): void {
    this.selectedUser = user;
    this.systemAccessForm = {
      laserCuttingManagement: user.systemAccess?.laserCuttingManagement || false
    };
    this.showSystemAccessModal = true;
  }

  closeSystemAccessModal(): void {
    this.showSystemAccessModal = false;
    this.selectedUser = null;
  }

saveSystemAccess(): void {
  if (!this.selectedUser) return;

  this.savingUser = true;

  this.usersService.updateSystemAccess(this.selectedUser.id, this.systemAccessForm).subscribe({
    next: (response) => {
      this.showToast('success', 'تم تحديث صلاحيات النظام بنجاح');
      
      // ✅ NEW: If updating current user, force refresh their session
      const currentUser = this.authService.currentUserValue;
      if (currentUser && currentUser.id === this.selectedUser!.id) {
        console.log('🔄 Updating current user permissions - forcing refresh...');
        
        this.authService.forceRefresh().subscribe({
          next: (updatedUser) => {
            console.log('✅ Current user session updated:', updatedUser.systemAccess);
            this.showToast('info', 'تم تحديث الصلاحيات في حسابك الحالي');
          },
          error: (error) => {
            console.error('❌ Error refreshing current user:', error);
          }
        });
      }
      
      this.savingUser = false;
      this.closeSystemAccessModal();
      this.loadUsers();
    },
    error: (error) => {
      console.error('Error updating system access:', error);
      this.showToast('error', error.error?.message || 'حدث خطأ أثناء تحديث الصلاحيات');
      this.savingUser = false;
    }
  });
}

  // ============================================
  // HELPER METHODS
  // ============================================

  getRoleLabel(role: string): string {
    const foundRole = this.userRoles.find(r => r.value === role);

    if (foundRole) {
      return foundRole.label;
    }

    const roleMap: { [key: string]: string } = {
      'super_admin': 'IT',
      'admin': 'المدير',
      'employee': 'موظف',
      'secretariat': 'سكرتيرة'
    };

    return roleMap[role] || role;
  }

  getRoleColor(role: string): string {
    return this.usersService.getRoleColor(role);
  }

  getUniqueRolesForFilter(): Array<{value: string, label: string}> {
    const uniqueRoles = new Map<string, string>();

    this.userRoles.forEach(role => {
      if (!uniqueRoles.has(role.value)) {
        uniqueRoles.set(role.value, role.label);
      }
    });

    return Array.from(uniqueRoles.entries()).map(([value, label]) => ({
      value,
      label
    }));
  }

  getFormError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field?.touched || !field?.errors) return '';

    if (field.errors['required']) return 'هذا الحقل مطلوب';
    if (field.errors['email']) return 'البريد الإلكتروني غير صالح';
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `يجب أن يكون ${minLength} أحرف على الأقل`;
    }

    return '';
  }

  get canCreateUsers(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role === 'super_admin';
  }

  countUsersByStatus(active: boolean): number {
    return this.users.filter(u => u.active === active).length;
  }
}
