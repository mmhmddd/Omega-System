import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export interface MenuItem {
  title: string;
  route: string;
  icon: string;
  iconColor?: string;
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
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

  // Organized menu with sections
  menuSections: MenuSection[] = [
    {
      // Main section
      items: [
        { title: 'الرئيسية', route: '/dashboard', icon: 'bi-grid' },
        { title: 'التحليلات والإحصائيات', route: '/analysis', icon: 'bi-bar-chart-line' }
      ]
    },
    {
      title: 'الإدارة',
      items: [
        { title: 'إدارة الموردين', route: '/suppliers', icon: 'bi-truck' },
        { title: 'إدارة الأصناف', route: '/items-control', icon: 'bi-tag' },
        { title: 'إدارة الأعضاء', route: '/users', icon: 'bi-people-fill' },
        { title: 'إدارة الملفات', route: '/files-control', icon: 'bi-folder' },
      ]
    },
    {
      title: 'العمليات',
      items: [
        { title: 'إشعار استلام', route: '/receipts', icon: 'bi-clipboard-check' },
        { title: 'إشعار فارغ', route: '/empty-receipt', icon: 'bi-file-earmark' },
        { title: 'طلب تسعير ', route: '/rfqs', icon: 'bi-file-earmark-text' },
        { title: 'طلب شراء', route: '/purchases', icon: 'bi-cart' },
        { title: 'طلب مواد', route: '/material-requests', icon: 'bi-box' },
        { title: 'عرض سعر', route: '/price-quotes', icon: 'bi-receipt' },
        { title: 'الفواتير الأولية', route: '/Proforma-invoice', icon: 'bi-file-earmark-pdf' },
        { title: 'كشف التكاليف', route: '/costing-sheet', icon: 'bi-calculator' } // ✅ NEW
      ]
    },
    {
      title: 'الموارد البشرية',
      items: [
        { title: 'قسم السكرتاريا', route: '/secretariat', icon: 'bi-people' },
        { title: 'طلبات الموظفين', route: '/secretariat-user', icon: 'bi-person-badge' }
      ]
    },
    {
      title: 'الإنتاج',
      items: [
        { title: 'نظام إدارة القص', route: '/cutting', icon: 'bi-scissors' }
      ]
    }
  ];

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
