import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';

interface DashboardCard {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
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

  quickAccessCards: DashboardCard[] = [
    {
      title: 'نظام إدارة القص',
      subtitle: 'جدولة ومتابعة أوامر القص',
      icon: 'bi-scissors',
      route: '/cutting',
      color: '#ef4444'
    },
    {
      title: 'عرض سعر',
      subtitle: 'إنشاء وإدارة عروض الأسعار للعملاء',
      icon: 'bi-file-earmark-text',
      route: '/price-quotes',
      color: '#10b981'
    },
    {
      title: 'إشعار استلام',
      subtitle: 'تسجيل استلام المواد والأعمال',
      icon: 'bi-clipboard-check',
      route: '/receipts',
      color: '#3b82f6'
    },
    {
      title: 'إدارة الملفات',
      subtitle: 'الأرشيف المركزي للملفات والمخططات',
      icon: 'bi-folder2-open',
      route: '/files-control',
      color: '#8b5cf6'
    },
    {
      title: 'قسم السكرتاريا',
      subtitle: 'نماذج الموظفين والإجازات',
      icon: 'bi-people',
      route: '/secretariat',
      color: '#6b7280'
    },
    {
      title: 'تسعير خارجي',
      subtitle: 'طلبات تسعير من الموردين',
      icon: 'bi-file-earmark-bar-graph',
      route: '/rfqs',
      color: '#8b5cf6'
    },
    {
      title: 'طلب شراء',
      subtitle: 'أوامر الشراء للموردين',
      icon: 'bi-cart',
      route: '/purchases',
      color: '#06b6d4'
    },
    {
      title: 'طلب مواد',
      subtitle: 'طلبات المواد الخام للمشاريع',
      icon: 'bi-box',
      route: '/material-requests',
      color: '#f59e0b'
    }
  ];

  managementCards: DashboardCard[] = [
    {
      title: 'إدارة المستخدمين',
      subtitle: 'إضافة وتعديل مستخدمي النظام',
      icon: 'bi-person-gear',
      route: '/users',
      color: '#112e61'
    },
    {
      title: 'إدارة الملفات',
      subtitle: 'تنظيم الملفات والمستندات',
      icon: 'bi-folder',
      route: '/files-control',
      color: '#112e61'
    },
    {
      title: 'الموردين والأصناف',
      subtitle: 'إدارة الموردين وأصناف المواد',
      icon: 'bi-truck',
      route: '/suppliers',
      color: '#112e61'
    }
  ];

  constructor(
    private usersService: UsersService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStatistics();
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

    // التحقق من وجود token قبل الاستدعاء
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
          // يمكنك إعادة التوجيه لصفحة تسجيل الدخول
          // this.authService.logout();
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

    // مؤقتاً، نضع قيمة ثابتة حتى يتم إنشاء Files Service
    setTimeout(() => {
      this.totalFiles = 0;
      this.loadingFiles = false;
    }, 500);
  }

  /**
   * Refresh dashboard statistics
   */
  refreshStatistics(): void {
    this.loadDashboardStatistics();
  }
}
