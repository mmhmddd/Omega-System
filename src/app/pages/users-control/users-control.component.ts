// users-control.component.ts (FIXED VERSION)
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
  routeAccessForm: string[] = []; // ✅ Initialized as empty array
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
      routeAccess: [[]] // ✅ Initialize as empty array
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
          routeAccess: user.routeAccess || [] // ✅ Ensure routeAccess is always an array
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

      console.log('==========================================');
      console.log('✅ LOADED AVAILABLE ROUTES');
      console.log('✅ Total routes:', this.availableRoutes.length);
      console.log('✅ Routes:', this.availableRoutes.map(r => ({
        key: r.key,
        label: r.label,
        category: (r as any).category
      })));
      console.log('==========================================');

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
  // ✅ ROUTE ACCESS MANAGEMENT (FIXED)
  // ============================================

openRouteAccessModal(user: User): void {
  if (user.role !== 'employee') {
    this.showToast('warning', 'صلاحيات المسارات متاحة للموظفين فقط');
    return;
  }

  this.selectedUser = user;

  // ✅ CRITICAL FIX: Ensure we always have a valid array
  this.routeAccessForm = [];

  if (user.routeAccess && Array.isArray(user.routeAccess)) {
    // ✅ IMPORTANT: Create a new copy of the array
    this.routeAccessForm = [...user.routeAccess];
  }

  console.log('==========================================');
  console.log('✅ Opening route access modal');
  console.log('✅ User:', user.name, '(', user.id, ')');
  console.log('✅ User routeAccess from backend:', user.routeAccess);
  console.log('✅ Initialized routeAccessForm:', this.routeAccessForm);
  console.log('✅ Available routes count:', this.availableRoutes.length);
  console.log('==========================================');

  this.showRouteAccessModal = true;
}

/**
 * Close the route access modal
 */
closeRouteAccessModal(): void {
  console.log('✅ Closing route access modal');
  this.showRouteAccessModal = false;
  this.selectedUser = null;
  this.routeAccessForm = [];
}


toggleRouteAccess(routeKey: string): void {
  console.log('==========================================');
  console.log('✅ Toggle route called with key:', routeKey);
  console.log('✅ Current form state BEFORE toggle:', [...this.routeAccessForm]);

  const index = this.routeAccessForm.indexOf(routeKey);

  if (index > -1) {
    // Remove from array
    this.routeAccessForm.splice(index, 1);
    console.log('✅ REMOVED route:', routeKey);
  } else {
    // Add to array
    this.routeAccessForm.push(routeKey);
    console.log('✅ ADDED route:', routeKey);
  }

  console.log('✅ Current form state AFTER toggle:', [...this.routeAccessForm]);
  console.log('==========================================');
}

isRouteSelected(routeKey: string): boolean {
  const isSelected = this.routeAccessForm.includes(routeKey);
  return isSelected;
}

/**
 * Save the route access changes
 */
saveRouteAccess(): void {
  if (!this.selectedUser) {
    console.error('❌ No user selected!');
    this.showToast('error', 'لم يتم تحديد مستخدم');
    return;
  }

  // ✅ Validate that we have an array
  if (!Array.isArray(this.routeAccessForm)) {
    console.error('❌ routeAccessForm is not an array!', this.routeAccessForm);
    this.showToast('error', 'خطأ في البيانات - الرجاء المحاولة مرة أخرى');
    return;
  }

  console.log('==========================================');
  console.log('✅ SAVING ROUTE ACCESS');
  console.log('✅ User ID:', this.selectedUser.id);
  console.log('✅ User Name:', this.selectedUser.name);
  console.log('✅ Route access form (SENDING TO BACKEND):', this.routeAccessForm);
  console.log('✅ Route access count:', this.routeAccessForm.length);
  console.log('==========================================');

  // ✅ Create a clean copy to send
  const cleanRouteAccess = [...this.routeAccessForm];

  // ✅ Log what we're actually sending
  console.log('✅ Final payload being sent:', {
    userId: this.selectedUser.id,
    routeAccess: cleanRouteAccess
  });

  this.savingUser = true;

  this.usersService.updateRouteAccess(this.selectedUser.id, cleanRouteAccess).subscribe({
    next: (response) => {
      console.log('==========================================');
      console.log('✅ SUCCESS! Route access saved');
      console.log('✅ Response from backend:', response.data);
      console.log('✅ Updated routeAccess:', response.data.routeAccess);
      console.log('==========================================');

      this.showToast('success', 'تم تحديث صلاحيات المسارات بنجاح');
      this.savingUser = false;
      this.closeRouteAccessModal();
      this.loadUsers();
    },
    error: (error) => {
      console.log('==========================================');
      console.error('❌ ERROR updating route access!');
      console.error('❌ Error object:', error);
      console.error('❌ Error status:', error.status);
      console.error('❌ Error message:', error.error?.message);
      console.error('❌ Full error response:', error.error);
      console.log('==========================================');

      const errorMessage = error.error?.message || 'حدث خطأ أثناء تحديث الصلاحيات';
      this.showToast('error', errorMessage);
      this.savingUser = false;
    }
  });
}

getRoutesByCategory(categoryKey: string): AvailableRoute[] {
  if (!this.availableRoutes || this.availableRoutes.length === 0) {
    console.warn('⚠️ No available routes loaded yet');
    return [];
  }

  // ✅ Filter routes based on category property
  const filteredRoutes = this.availableRoutes.filter(route => {
    // Cast to any to access category property
    const routeWithCategory = route as any;
    const routeCategory = routeWithCategory.category || 'other';
    return routeCategory === categoryKey;
  });

  console.log(`✅ Category: ${categoryKey} has ${filteredRoutes.length} routes:`,
    filteredRoutes.map(r => r.key)
  );

  return filteredRoutes;
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
