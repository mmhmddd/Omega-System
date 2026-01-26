import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsersService, User, CreateUserData, AvailableRoute } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';

interface UserTableData extends User {
  selected?: boolean;
}

@Component({
  selector: 'app-users-control',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './users-control.component.html',
  styleUrl: './users-control.component.scss'
})
export class UsersControlComponent implements OnInit {
  // Users data
  users: UserTableData[] = [];
  filteredUsers: UserTableData[] = [];
  selectedUser: User | null = null;

  // Available routes for employees
  availableRoutes: AvailableRoute[] = [];

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalUsers: number = 0;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  // Loading states
  loading: boolean = false;
  loadingRoutes: boolean = false;
  savingUser: boolean = false;
  deletingUser: boolean = false;

  // Filter & Search
  searchTerm: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';

  // Modals
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  showRouteAccessModal: boolean = false;
  showSystemAccessModal: boolean = false;

  // Forms
  createUserForm!: FormGroup;
  editUserForm!: FormGroup;
  routeAccessForm: string[] = [];
  systemAccessForm: { laserCuttingManagement: boolean } = {
    laserCuttingManagement: false
  };

  // Messages
  successMessage: string = '';
  errorMessage: string = '';

  // User roles
  userRoles = [
    { value: 'super_admin', label: 'مدير عام', color: '#dc2626' },
    { value: 'admin', label: 'مدير', color: '#ea580c' },
    { value: 'employee', label: 'موظف', color: '#0891b2' },
    { value: 'secretariat', label: 'سكرتارية', color: '#7c3aed' }
  ];

  // Status filters
  statusFilters = [
    { value: '', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' }
  ];

  // Actions menu
  activeActionsMenu: string | null = null;
  menuShouldOpenUp: { [userId: string]: boolean } = {};

  // Make Math available to template
  get Math() {
    return Math;
  }

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  // Close menu when clicking outside - IMPROVED VERSION
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Don't close if clicking inside the menu or the trigger button
    if (target.closest('.actions-menu') || target.closest('.actions-trigger')) {
      return;
    }

    // Close the menu
    this.closeActionsMenu();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadUsers();
    this.loadAvailableRoutes();
  }

  // ============================================
  // ACTIONS MENU - IMPROVED VERSION
  // ============================================

  toggleActionsMenu(userId: string, event?: MouseEvent): void {
    // Prevent event from propagating
    if (event) {
      event.stopPropagation();
    }

    console.log('Toggle menu for user:', userId);

    // If clicking the same menu, close it
    if (this.activeActionsMenu === userId) {
      this.activeActionsMenu = null;
      return;
    }

    // Reset previous
    this.menuShouldOpenUp = {};
    this.activeActionsMenu = userId;

    // Calculate if menu should open upward
    setTimeout(() => {
      const button = document.querySelector(`[data-user-id="${userId}"]`) as HTMLElement;
      if (!button) {
        console.log('Button not found for user:', userId);
        return;
      }

      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeightEstimate = 250; // Approximate height of menu

      this.menuShouldOpenUp[userId] = spaceBelow < menuHeightEstimate;
      console.log('Menu should open up:', this.menuShouldOpenUp[userId], 'Space below:', spaceBelow);
    }, 0);
  }

  closeActionsMenu(): void {
    this.activeActionsMenu = null;
  }

  // Helper method to handle menu item clicks
  handleMenuAction(action: () => void, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    // Execute the action
    action();

    // Close the menu
    this.closeActionsMenu();
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
    this.errorMessage = '';

    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      role: this.selectedRole || undefined
    };

    this.usersService.getAllUsers(filters).subscribe({
      next: (response) => {
        this.users = response.data.map(user => ({ ...user, selected: false }));
        this.applyFilters();

        this.totalUsers = response.pagination.totalUsers;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'حدث خطأ في تحميل المستخدمين';
        this.loading = false;
      }
    });
  }

  loadAvailableRoutes(): void {
    this.loadingRoutes = true;

    this.usersService.getAvailableRoutes().subscribe({
      next: (response) => {
        this.availableRoutes = response.data;
        this.loadingRoutes = false;
      },
      error: (error) => {
        console.error('Error loading routes:', error);
        this.loadingRoutes = false;
      }
    });
  }

  // ============================================
  // FILTERING & SEARCH
  // ============================================

  applyFilters(): void {
    let filtered = [...this.users];

    // Filter by status
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
    this.successMessage = '';
    this.errorMessage = '';
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
    this.errorMessage = '';

    const userData: CreateUserData = this.createUserForm.value;

    this.usersService.createUser(userData).subscribe({
      next: (response) => {
        this.successMessage = 'تم إنشاء المستخدم بنجاح';
        this.savingUser = false;
        this.closeCreateModal();
        this.loadUsers();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء إنشاء المستخدم';
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
    this.successMessage = '';
    this.errorMessage = '';
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
    this.errorMessage = '';

    const updateData = { ...this.editUserForm.value };

    // Remove password if empty
    if (!updateData.password) {
      delete updateData.password;
    }

    this.usersService.updateUser(this.selectedUser.id, updateData).subscribe({
      next: (response) => {
        this.successMessage = 'تم تحديث المستخدم بنجاح';
        this.savingUser = false;
        this.closeEditModal();
        this.loadUsers();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء تحديث المستخدم';
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
    this.errorMessage = '';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  confirmDelete(): void {
    if (!this.selectedUser) return;

    this.deletingUser = true;
    this.errorMessage = '';

    this.usersService.deleteUser(this.selectedUser.id).subscribe({
      next: (response) => {
        this.successMessage = 'تم حذف المستخدم بنجاح';
        this.deletingUser = false;
        this.closeDeleteModal();
        this.loadUsers();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء حذف المستخدم';
        this.deletingUser = false;
      }
    });
  }

  // ============================================
  // TOGGLE ACTIVE STATUS
  // ============================================

  toggleUserActive(user: User): void {
    this.usersService.toggleUserActive(user.id).subscribe({
      next: (response) => {
        this.successMessage = `تم ${response.data.active ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`;
        this.loadUsers();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء تغيير حالة المستخدم';
      }
    });
  }

  // ============================================
  // ROUTE ACCESS MANAGEMENT
  // ============================================

  openRouteAccessModal(user: User): void {
    if (user.role !== 'employee') {
      this.errorMessage = 'صلاحيات المسارات متاحة للموظفين فقط';
      return;
    }

    this.selectedUser = user;
    this.routeAccessForm = [...(user.routeAccess || [])];
    this.showRouteAccessModal = true;
    this.errorMessage = '';
  }

  closeRouteAccessModal(): void {
    this.showRouteAccessModal = false;
    this.selectedUser = null;
    this.routeAccessForm = [];
  }

  toggleRouteAccess(routeKey: string): void {
    const index = this.routeAccessForm.indexOf(routeKey);
    if (index > -1) {
      this.routeAccessForm.splice(index, 1);
    } else {
      this.routeAccessForm.push(routeKey);
    }
  }

  isRouteSelected(routeKey: string): boolean {
    return this.routeAccessForm.includes(routeKey);
  }

  saveRouteAccess(): void {
    if (!this.selectedUser) return;

    this.savingUser = true;
    this.errorMessage = '';

    this.usersService.updateRouteAccess(this.selectedUser.id, this.routeAccessForm).subscribe({
      next: (response) => {
        this.successMessage = 'تم تحديث صلاحيات المسارات بنجاح';
        this.savingUser = false;
        this.closeRouteAccessModal();
        this.loadUsers();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating route access:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء تحديث الصلاحيات';
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
    this.errorMessage = '';
  }

  closeSystemAccessModal(): void {
    this.showSystemAccessModal = false;
    this.selectedUser = null;
  }

  saveSystemAccess(): void {
    if (!this.selectedUser) return;

    this.savingUser = true;
    this.errorMessage = '';

    this.usersService.updateSystemAccess(this.selectedUser.id, this.systemAccessForm).subscribe({
      next: (response) => {
        this.successMessage = 'تم تحديث صلاحيات النظام بنجاح';
        this.savingUser = false;
        this.closeSystemAccessModal();
        this.loadUsers();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating system access:', error);
        this.errorMessage = error.error?.message || 'حدث خطأ أثناء تحديث الصلاحيات';
        this.savingUser = false;
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getRoleLabel(role: string): string {
    return this.usersService.getRoleLabel(role);
  }

  getRoleColor(role: string): string {
    return this.usersService.getRoleColor(role);
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

  // Helper method to count active/inactive users
  countUsersByStatus(active: boolean): number {
    return this.users.filter(u => u.active === active).length;
  }
}
