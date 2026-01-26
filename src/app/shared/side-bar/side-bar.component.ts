import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  title: string;
  route: string;
  icon: string;
  iconColor?: string;
}

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.component.html',
  styleUrl: './side-bar.component.scss'
})
export class SideBarComponent {
  isSidebarOpen: boolean = true;

  menuItems: MenuItem[] = [
    { title: 'الرئيسية', route: '/dashboard', icon: 'bi-grid' },
    { title: 'إدارة الملفات', route: '/files-control', icon: 'bi-folder' },
    { title: 'إشعار استلام', route: '/receipts', icon: 'bi-clipboard-check' },
    { title: 'طلب تسعير خارجي', route: '/rfqs', icon: 'bi-file-earmark-text' },
    { title: 'طلب شراء', route: '/purchases', icon: 'bi-cart' },
    { title: 'طلب مواد', route: '/material-requests', icon: 'bi-box' },
    { title: 'عرض سعر', route: '/price-quotes', icon: 'bi-receipt' },
    { title: 'قسم السكرتاريا', route: '/secretariat', icon: 'bi-people' },
    { title: 'نظام إدارة القص', route: '/cutting', icon: 'bi-scissors' }
  ];

  toggleSidebar() {
    // On mobile, auto-close after clicking menu item
    if (window.innerWidth < 992) {
      this.isSidebarOpen = !this.isSidebarOpen;
    }
  }

  logout() {
    console.log('Logging out...');
    // Add your logout logic here
  }
}
