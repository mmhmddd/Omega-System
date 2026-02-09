// src/app/pages/dashboard/dashboard.component.ts - FIXED TYPESCRIPT VERSION
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsersService } from '../../core/services/users.service';
import { AuthService, User } from '../../core/services/auth.service';
import { FileService } from '../../core/services/file.service';

interface DashboardCard {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
  routeKey?: string;
  requiredRoles?: string[];
  requiresSystemAccess?: keyof User['systemAccess']; // ✅ FIXED: Properly typed
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  // Statistics counts
  totalUsers: number = 0;
  totalFiles: number = 0;

  // Loading states
  loadingUsers: boolean = true;
  loadingFiles: boolean = true;

  // Error states
  usersError: string = '';
  filesError: string = '';

  // Current user signal
  currentUser = signal<User | null>(null);

  // All dashboard cards with access control
  private allFileManagementCards: DashboardCard[] = [
    {
      title: 'إدارة الملفات',
      subtitle: 'الأرشيف المركزي للملفات والمخططات',
      icon: 'bi-folder2-open',
      route: '/files-control',
      color: '#f59e0b',
      routeKey: 'filesControl',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      title: 'التحليلات والإحصائيات',
      subtitle: 'تحليل شامل لبيانات النظام والتقارير',
      icon: 'bi-bar-chart-line',
      route: '/analysis',
      color: '#7c3aed',
      routeKey: 'analysis',
      requiredRoles: ['super_admin', 'admin']
    }
  ];

  private allProcurementCards: DashboardCard[] = [
    {
      title: 'إشعار استلام',
      subtitle: 'تسجيل استلام المواد والأعمال',
      icon: 'bi-clipboard-check',
      route: '/receipts',
      color: '#1E3A8A',
      routeKey: 'receipts'
    },
    {
      title: 'إشعار استلام فارغ',
      subtitle: 'إنشاء إشعار استلام فارغ بدون أي بيانات',
      icon: 'bi-file-earmark',
      route: '/empty-receipt',
      color: '#D97706',
      routeKey: 'emptyReceipt'
    },
    {
      title: 'طلب تسعير',
      subtitle: 'طلبات تسعير من الموردين',
      icon: 'bi-file-earmark-bar-graph',
      route: '/rfqs',
      color: '#059669',
      routeKey: 'rfqs'
    },
    {
      title: 'طلب شراء',
      subtitle: 'أوامر الشراء للموردين',
      icon: 'bi-cart',
      route: '/purchases',
      color: '#B91C1C',
      routeKey: 'purchases'
    },
    {
      title: 'طلب مواد',
      subtitle: 'طلبات المواد الخام للمشاريع',
      icon: 'bi-box',
      route: '/material-requests',
      color: '#F59E0B',
      routeKey: 'materialRequests'
    },
    {
      title: 'عرض سعر',
      subtitle: 'إنشاء وإدارة عروض الأسعار للعملاء',
      icon: 'bi-file-earmark-text',
      route: '/price-quotes',
      color: '#7C3AED',
      routeKey: 'priceQuotes'
    },
    {
      title: 'الفواتير الأولية',
      subtitle: 'إنشاء وإدارة الفواتير الأولية للعملاء',
      icon: 'bi-file-earmark-pdf',
      route: '/Proforma-invoice',
      color: '#EC4899',
      routeKey: 'proformaInvoice'
    },
    {
      title: 'كشف التكاليف',
      subtitle: 'حساب وإدارة تكاليف المشاريع والعمليات',
      icon: 'bi-calculator',
      route: '/costing-sheet',
      color: '#0EA5E9',
      routeKey: 'costingSheet'
    }
  ];

  private allCuttingCards: DashboardCard[] = [
    {
      title: 'نظام إدارة القص',
      subtitle: 'جدولة ومتابعة أوامر القص',
      icon: 'bi-scissors',
      route: '/cutting',
      color: '#ef4444',
      routeKey: 'cutting',
      requiresSystemAccess: 'laserCuttingManagement' // ✅ FIXED: Now properly typed
    }
  ];

  private allSecretariatCards: DashboardCard[] = [
    {
      title: 'قسم السكرتاريا',
      subtitle: 'نماذج الموظفين والإجازات',
      icon: 'bi-people',
      route: '/secretariat',
      color: '#6b7280',
      routeKey: 'secretariat'
    },
    {
      title: 'طلبات الموظفين',
      subtitle: 'نماذج المغادرة والسلفات والإجازات وكشف الحساب للموظفين',
      icon: 'bi-person-badge',
      route: '/secretariat-user',
      color: '#8b5cf6',
      routeKey: 'secretariatUserManagement'
    }
  ];

  private allManagementCards: DashboardCard[] = [
    {
      title: 'إدارة المستخدمين',
      subtitle: 'إضافة وتعديل مستخدمي النظام',
      icon: 'bi-person-gear',
      route: '/users',
      color: '#112e61',
      routeKey: 'users',
      requiredRoles: ['super_admin']
    },
    {
      title: 'إدارة الملفات',
      subtitle: 'تنظيم الملفات والمستندات',
      icon: 'bi-folder',
      route: '/files-control',
      color: '#112e61',
      routeKey: 'filesControl',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      title: 'إدارة الأصناف',
      subtitle: 'إدارة وتنظيم الأصناف والمواد',
      icon: 'bi-box-seam',
      route: '/items-control',
      color: '#112e61',
      routeKey: 'itemsControl',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      title: 'الموردين',
      subtitle: 'إدارة الموردين',
      icon: 'bi-truck',
      route: '/suppliers',
      color: '#112e61',
      routeKey: 'suppliers',
      requiredRoles: ['super_admin', 'admin']
    }
  ];

  // Computed filtered cards based on user permissions
  fileManagementCards = computed(() => this.filterCards(this.allFileManagementCards));
  procurementCards = computed(() => this.filterCards(this.allProcurementCards));
  cuttingCards = computed(() => this.filterCards(this.allCuttingCards));
  secretariatCards = computed(() => this.filterCards(this.allSecretariatCards));
  managementCards = computed(() => this.filterCards(this.allManagementCards));

  // Check if sections should be visible
  showFileManagementSection = computed(() => this.fileManagementCards().length > 0);
  showProcurementSection = computed(() => this.procurementCards().length > 0);
  showCuttingSection = computed(() => this.cuttingCards().length > 0);
  showSecretariatSection = computed(() => this.secretariatCards().length > 0);
  showManagementSection = computed(() => this.managementCards().length > 0);

  // Check if statistics should be shown
  canViewStatistics = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin';
  });

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      console.log('👤 Dashboard: User updated', {
        name: user?.name,
        role: user?.role,
        systemAccess: user?.systemAccess,
        routeAccess: user?.routeAccess
      });
    });

    // Load initial user
    const storedUser = this.authService.getStoredUser();
    if (storedUser) {
      this.currentUser.set(storedUser);
    }

    // Load statistics only if user can view them
    if (this.canViewStatistics()) {
      this.loadDashboardStatistics();
    }
  }

  /**
   * Filter cards based on user permissions
   */
  private filterCards(cards: DashboardCard[]): DashboardCard[] {
    const user = this.currentUser();
    if (!user) return [];

    return cards.filter(card => this.canAccessCard(card));
  }

  /**
   * ✅ FIXED: Check if user can access a card
   */
  private canAccessCard(card: DashboardCard): boolean {
    const user = this.currentUser();
    if (!user) return false;

    console.log(`🔍 Checking card access: ${card.title}`, {
      routeKey: card.routeKey,
      requiresSystemAccess: card.requiresSystemAccess,
      userRole: user.role,
      systemAccess: user.systemAccess,
      routeAccess: user.routeAccess
    });

    // Super admin has access to everything
    if (user.role === 'super_admin') {
      console.log('✅ Super admin - access granted');
      return true;
    }

    // Admin has access to everything except user management
    if (user.role === 'admin') {
      if (card.routeKey === 'users') {
        console.log('❌ Admin cannot access user management');
        return false;
      }
      console.log('✅ Admin - access granted');
      return true;
    }

    // Check required roles if specified
    if (card.requiredRoles && !card.requiredRoles.includes(user.role)) {
      console.log('❌ Role not in required roles');
      return false;
    }

    // ✅ FIXED: Check system access if required (e.g., for cutting)
    if (card.requiresSystemAccess) {
      const hasSystemAccess = this.authService.hasSystemAccess(card.requiresSystemAccess);
      
      if (!hasSystemAccess) {
        console.log(`❌ No system access: ${String(card.requiresSystemAccess)}`);
        return false;
      }
      
      console.log(`✅ Has system access: ${String(card.requiresSystemAccess)}`);
      
      // For cards with system access requirement, we don't check routeAccess
      // System access is the primary permission
      return true;
    }

    // For secretariat role
    if (user.role === 'secretariat') {
      const secretariatRoutes = ['secretariat', 'secretariatUserManagement'];
      const hasAccess = card.routeKey ? secretariatRoutes.includes(card.routeKey) : false;
      console.log(hasAccess ? '✅ Secretariat access granted' : '❌ Secretariat access denied');
      return hasAccess;
    }

    // For employee role - check routeAccess
    if (user.role === 'employee') {
      if (card.routeKey) {
        const hasAccess = this.authService.hasRouteAccess(card.routeKey);
        console.log(hasAccess ? `✅ Employee has routeAccess to ${card.routeKey}` : `❌ Employee missing routeAccess to ${card.routeKey}`);
        return hasAccess;
      }
      console.log('❌ No routeKey defined');
      return false;
    }

    console.log('❌ Default deny');
    return false;
  }

  /**
   * Load all dashboard statistics
   */
  private loadDashboardStatistics(): void {
    this.loadUsersCount();
    this.loadFilesCount();
  }

  /**
   * Load total users count from API
   */
  private loadUsersCount(): void {
    this.loadingUsers = true;
    this.usersError = '';

    const token = this.authService.getToken();
    if (!token) {
      console.error('No authentication token found');
      this.loadingUsers = false;
      this.usersError = 'يرجى تسجيل الدخول أولاً';
      return;
    }

    this.usersService.getAllUsers({ limit: 1 }).subscribe({
      next: (response) => {
        console.log('Users count response:', response);
        this.totalUsers = response.pagination.totalUsers;
        this.loadingUsers = false;
      },
      error: (error) => {
        console.error('Error loading users count:', error);
        this.loadingUsers = false;

        if (error.status === 401) {
          this.usersError = 'انتهت صلاحية الجلسة';
        } else if (error.status === 403) {
          this.usersError = 'ليس لديك صلاحية للوصول';
        } else {
          this.usersError = 'حدث خطأ في تحميل البيانات';
        }

        this.totalUsers = 0;
      }
    });
  }

  /**
   * Load total files count from API
   */
  private loadFilesCount(): void {
    this.loadingFiles = true;
    this.filesError = '';

    const token = this.authService.getToken();
    if (!token) {
      console.error('No authentication token found');
      this.loadingFiles = false;
      this.filesError = 'يرجى تسجيل الدخول أولاً';
      return;
    }

    this.fileService.getAllFiles({ limit: 1 }).subscribe({
      next: (response) => {
        console.log('Files count response:', response);
        this.totalFiles = response.pagination.totalFiles;
        this.loadingFiles = false;
      },
      error: (error) => {
        console.error('Error loading files count:', error);
        this.loadingFiles = false;

        if (error.status === 401) {
          this.filesError = 'انتهت صلاحية الجلسة';
        } else if (error.status === 403) {
          this.filesError = 'ليس لديك صلاحية للوصول';
        } else {
          this.filesError = 'حدث خطأ في تحميل البيانات';
        }

        this.totalFiles = 0;
      }
    });
  }

  /**
   * Refresh dashboard statistics
   */
  refreshStatistics(): void {
    if (this.canViewStatistics()) {
      this.loadDashboardStatistics();
    }
  }
}