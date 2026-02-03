import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export interface MenuItem {
  title: string;
  route: string;
  icon: string;
  iconColor?: string;
  routeKey?: string; // Route access key for permission checking
  requiredRoles?: string[]; // Required roles for this menu item
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
  requiredRoles?: string[]; // Required roles to see this entire section
}

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.component.html',
  styleUrl: './side-bar.component.scss'
})
export class SideBarComponent implements OnInit {
  private authService = inject(AuthService);

  isSidebarOpen: boolean = true;

  // Signal for logout modal
  showLogoutModal = signal<boolean>(false);

  // Signal for current user
  currentUser = signal<any>(null);

  // Computed values for user info
  userName = computed(() => {
    const user = this.currentUser();
    return user?.name || 'المستخدم';
  });

  userRole = computed(() => {
    const user = this.currentUser();
    const role = user?.role;

    if (!role) return 'مستخدم';

    // Arabic role mapping
    const roleMap: Record<string, string> = {
      super_admin: 'مدير النظام العام',
      admin: 'مدير النظام',
      secretariat: 'الأمانة',
      employee: 'موظف',
      user: 'مستخدم'
    };

    return roleMap[role] || role;
  });

  // Get user initials for avatar
  userInitials = computed(() => {
    const user = this.currentUser();
    const name = user?.name || '';

    if (!name) return '';

    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) {
      return nameParts[0][0] + nameParts[1][0];
    }
    return nameParts[0][0] || '';
  });

  // All menu sections with access control
  private allMenuSections: MenuSection[] = [
    {
      // Main section - accessible to all authenticated users
      items: [
        { title: 'الرئيسية', route: '/dashboard', icon: 'bi-grid' },
        {
          title: 'التحليلات والإحصائيات',
          route: '/analysis',
          icon: 'bi-bar-chart-line',
          routeKey: 'analysis',
          requiredRoles: ['super_admin', 'admin']
        }
      ]
    },
    {
      title: 'الإدارة',
      requiredRoles: ['super_admin', 'admin'],
      items: [
        {
          title: 'إدارة الموردين',
          route: '/suppliers',
          icon: 'bi-truck',
          routeKey: 'suppliers',
          requiredRoles: ['super_admin', 'admin']
        },
        {
          title: 'إدارة الأصناف',
          route: '/items-control',
          icon: 'bi-tag',
          routeKey: 'itemsControl',
          requiredRoles: ['super_admin', 'admin']
        },
        {
          title: 'إدارة الأعضاء',
          route: '/users',
          icon: 'bi-people-fill',
          routeKey: 'users',
          requiredRoles: ['super_admin'] // Only super_admin
        },
        {
          title: 'إدارة الملفات',
          route: '/files-control',
          icon: 'bi-folder',
          routeKey: 'filesControl',
          requiredRoles: ['super_admin', 'admin']
        },
      ]
    },
    {
      title: 'العمليات',
      items: [
        {
          title: 'إشعار استلام',
          route: '/receipts',
          icon: 'bi-clipboard-check',
          routeKey: 'receipts'
        },
        {
          title: 'إشعار فارغ',
          route: '/empty-receipt',
          icon: 'bi-file-earmark',
          routeKey: 'emptyReceipt'
        },
        {
          title: 'طلب تسعير',
          route: '/rfqs',
          icon: 'bi-file-earmark-text',
          routeKey: 'rfqs'
        },
        {
          title: 'طلب شراء',
          route: '/purchases',
          icon: 'bi-cart',
          routeKey: 'purchases'
        },
        {
          title: 'طلب مواد',
          route: '/material-requests',
          icon: 'bi-box',
          routeKey: 'materialRequests'
        },
        {
          title: 'عرض سعر',
          route: '/price-quotes',
          icon: 'bi-receipt',
          routeKey: 'priceQuotes'
        },
        {
          title: 'الفواتير الأولية',
          route: '/Proforma-invoice',
          icon: 'bi-file-earmark-pdf',
          routeKey: 'proformaInvoice'
        },
        {
          title: 'كشف التكاليف',
          route: '/costing-sheet',
          icon: 'bi-calculator',
          routeKey: 'costingSheet'
        }
      ]
    },
    {
      title: 'الموارد البشرية',
      items: [
        {
          title: 'قسم السكرتاريا',
          route: '/secretariat',
          icon: 'bi-people',
          routeKey: 'secretariat'
        },
        {
          title: 'طلبات الموظفين',
          route: '/secretariat-user',
          icon: 'bi-person-badge',
          routeKey: 'secretariatUserManagement'
        }
      ]
    },
    {
      title: 'الإنتاج',
      items: [
        {
          title: 'نظام إدارة القص',
          route: '/cutting',
          icon: 'bi-scissors',
          routeKey: 'cutting'
        }
      ]
    }
  ];

  // Filtered menu sections based on user permissions
  menuSections = computed(() => {
    return this.filterMenuByPermissions(this.allMenuSections);
  });

  ngOnInit() {
    // Subscribe to user changes from AuthService
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
    });

    // Initial load from stored user
    const storedUser = this.authService.getStoredUser();
    if (storedUser) {
      this.currentUser.set(storedUser);
    }
  }

  /**
   * Filter menu sections and items based on user permissions
   */
  private filterMenuByPermissions(sections: MenuSection[]): MenuSection[] {
    const user = this.currentUser();
    if (!user) return [];

    return sections
      .map(section => {
        // Check if user has access to this section
        if (section.requiredRoles && !section.requiredRoles.includes(user.role)) {
          return null;
        }

        // Filter items in this section
        const filteredItems = section.items.filter(item => {
          return this.canAccessMenuItem(item);
        });

        // Return section only if it has visible items
        if (filteredItems.length === 0) {
          return null;
        }

        return {
          ...section,
          items: filteredItems
        };
      })
      .filter((section): section is MenuSection => section !== null);
  }

  /**
   * Check if user can access a menu item
   */
  private canAccessMenuItem(item: MenuItem): boolean {
    const user = this.currentUser();
    if (!user) return false;

    // Super admin has access to everything
    if (user.role === 'super_admin') {
      return true;
    }

    // Admin has access to everything except user management
    if (user.role === 'admin') {
      if (item.routeKey === 'users') {
        return false;
      }
      return true;
    }

    // Check required roles if specified
    if (item.requiredRoles && !item.requiredRoles.includes(user.role)) {
      return false;
    }

    // For secretariat role
    if (user.role === 'secretariat') {
      const secretariatRoutes = ['secretariat', 'secretariatUserManagement'];
      return item.routeKey ? secretariatRoutes.includes(item.routeKey) : false;
    }

    // For employee role - check routeAccess
    if (user.role === 'employee') {
      // Dashboard is always accessible
      if (item.route === '/dashboard') {
        return true;
      }

      // Check if route key is in user's routeAccess array
      if (item.routeKey) {
        return this.authService.hasRouteAccess(item.routeKey);
      }

      return false;
    }

    return false;
  }

  toggleSidebar() {
    if (window.innerWidth < 992) {
      this.isSidebarOpen = !this.isSidebarOpen;
    }
  }

  // ============================================
  // LOGOUT MANAGEMENT
  // ============================================

  openLogoutModal() {
    this.showLogoutModal.set(true);
  }

  closeLogoutModal() {
    this.showLogoutModal.set(false);
  }

  confirmLogout() {
    this.showLogoutModal.set(false);
    this.authService.logout();
  }
}
