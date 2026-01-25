import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },


  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    data: { title: 'لوحة التحكم' }
  },


  {
    path: 'users',
    loadComponent: () => import('./pages/users-control/users-control.component').then(m => m.UsersControlComponent),
    data: { title: 'إدارة المستخدمين' }
  },


  {
    path: 'items-control',
    loadComponent: () => import('./pages/items-control/items-control.component').then(m => m.ItemsControlComponent),
    data: { title: 'إدارة الأصناف' }
  },


  {
    path: 'suppliers',
    loadComponent: () => import('./pages/suppliers-control/suppliers-control.component').then(m => m.SuppliersControlComponent),
    data: { title: 'إدارة الموردين' }
  },

  {
    path: 'price-quotes',
    loadComponent: () => import('./pages/price-quotes/price-quotes.component').then(m => m.PriceQuotesComponent),
    data: { title: 'عروض الأسعار' }
  },

  {
    path: 'material-requests',
    loadComponent: () => import('./pages/materials-request/materials-request.component').then(m => m.MaterialsRequestComponent),
    data: { title: 'طلبات المواد' }
  },


  {
    path: 'purchases',
    loadComponent: () => import('./pages/purchases/purchases.component').then(m => m.PurchasesComponent),
    data: { title: 'أوامر الشراء' }
  },


  {
    path: 'rfqs',
    loadComponent: () => import('./pages/rfqs/rfqs.component').then(m => m.RFQsComponent),
    data: { title: 'طلبات عروض الأسعار' }
  },


  {
    path: 'receipts',
    loadComponent: () => import('./pages/receipts/receipts.component').then(m => m.ReceiptsComponent),
    data: { title: 'إيصالات الاستلام' }
  },


  {
    path: 'secretariat-user',
    loadComponent: () => import('./pages/secretariat-user/secretariat-user.component').then(m => m.SecretariatUserComponent),
    data: { title: 'نماذج الموظف' }
  },


  {
    path: 'secretariat',
    loadComponent: () => import('./pages/secretariat-control/secretariat-control.component').then(m => m.SecretariatControlComponent),
    data: { title: 'إدارة السكرتارية' }
  },


  {
    path: 'cutting',
    loadComponent: () => import('./pages/cutting/cutting.component').then(m => m.CuttingComponent),
    data: { title: 'إدارة أعمال القص' }
  },


  {
    path: 'files-control',
    loadComponent: () => import('./pages/files-control/files-control.component').then(m => m.FilesControlComponent),
    data: { title: 'إدارة الملفات' }
  },

  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
