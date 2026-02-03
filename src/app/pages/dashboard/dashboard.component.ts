import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { FileService } from '../../core/services/file.service';

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

  // File Management Cards
  fileManagementCards: DashboardCard[] = [
    {
      title: 'إدارة الملفات',
      subtitle: 'الأرشيف المركزي للملفات والمخططات',
      icon: 'bi-folder2-open',
      route: '/files-control',
      color: '#f59e0b' // أصفر برتقالي، مختلف تمامًا
    },
    {
      title: 'التحليلات والإحصائيات',
      subtitle: 'تحليل شامل لبيانات النظام والتقارير',
      icon: 'bi-bar-chart-line',
      route: '/analysis',
      color: '#7c3aed' // بنفسجي داكن
    }
  ];


  // Procurement & Operations Cards
  procurementCards: DashboardCard[] = [
    {
      title: 'إشعار استلام',
      subtitle: 'تسجيل استلام المواد والأعمال',
      icon: 'bi-clipboard-check',
      route: '/receipts',
      color: '#1E3A8A' // أزرق داكن
    },
    {
      title: 'إشعار استلام فارغ',
      subtitle: 'إنشاء إشعار استلام فارغ بدون أي بيانات',
      icon: 'bi-file-earmark',
      route: '/empty-receipt',
      color: '#D97706' // برتقالي قوي
    },
    {
      title: 'طلب تسعير',
      subtitle: 'طلبات تسعير من الموردين',
      icon: 'bi-file-earmark-bar-graph',
      route: '/rfqs',
      color: '#059669' // أخضر داكن
    },
    {
      title: 'طلب شراء',
      subtitle: 'أوامر الشراء للموردين',
      icon: 'bi-cart',
      route: '/purchases',
      color: '#B91C1C' // أحمر داكن
    },
    {
      title: 'طلب مواد',
      subtitle: 'طلبات المواد الخام للمشاريع',
      icon: 'bi-box',
      route: '/material-requests',
      color: '#F59E0B' // أصفر برتقالي
    },
    {
      title: 'عرض سعر',
      subtitle: 'إنشاء وإدارة عروض الأسعار للعملاء',
      icon: 'bi-file-earmark-text',
      route: '/price-quotes',
      color: '#7C3AED' // بنفسجي
    },
    {
      title: 'الفواتير الأولية',
      subtitle: 'إنشاء وإدارة الفواتير الأولية للعملاء',
      icon: 'bi-file-earmark-pdf',
      route: '/Proforma-invoice',
      color: '#EC4899' // وردي فاقع
    },
    {
      title: 'كشف التكاليف',
      subtitle: 'حساب وإدارة تكاليف المشاريع والعمليات',
      icon: 'bi-calculator',
      route: '/costing-sheet',
      color: '#0EA5E9' // سماوي صافي
    }
  ];


  // Laser Cutting Cards
  cuttingCards: DashboardCard[] = [
    {
      title: 'نظام إدارة القص',
      subtitle: 'جدولة ومتابعة أوامر القص',
      icon: 'bi-scissors',
      route: '/cutting',
      color: '#ef4444'
    }
  ];

  // Secretariat Cards
  secretariatCards: DashboardCard[] = [
    {
      title: 'قسم السكرتاريا',
      subtitle: 'نماذج الموظفين والإجازات',
      icon: 'bi-people',
      route: '/secretariat',
      color: '#6b7280'
    },
    {
      title: 'طلبات الموظفين',
      subtitle: 'نماذج المغادرة والسلفات والإجازات وكشف الحساب للموظفين',
      icon: 'bi-person-badge',
      route: '/secretariat-user',
      color: '#8b5cf6'
    }
  ];

  // Management Cards
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
      title: 'إدارة الأصناف',
      subtitle: 'إدارة وتنظيم الأصناف والمواد',
      icon: 'bi-box-seam',
      route: '/items-control',
      color: '#112e61'
    },
    {
      title: 'الموردين',
      subtitle: 'إدارة الموردين',
      icon: 'bi-truck',
      route: '/suppliers',
      color: '#112e61'
    }
  ];

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private fileService: FileService
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
    this.loadDashboardStatistics();
  }
}