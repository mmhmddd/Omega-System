import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
export class DashboardComponent {
  // Statistics counts
  totalUsers: number = 247;
  totalFiles: number = 1832;

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
      route: '/rfqs',
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
      route: '/price-quotes',
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
}
