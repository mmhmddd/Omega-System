// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
authGuard
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Login route (no guard needed)
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
    data: { title: 'تسجيل الدخول' }
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    data: { title: 'اعادة تعيين كلمة المرور' }
  },

  // Dashboard - accessible to all authenticated users
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    data: { title: 'لوحة التحكم' }
  },

  // User Management - ONLY super_admin
  {
    path: 'users',
    loadComponent: () => import('./pages/users-control/users-control.component').then(m => m.UsersControlComponent),
    canActivate: [roleGuard(['super_admin'])],
    data: {
      title: 'إدارة المستخدمين',
      routeKey: 'users'
    }
  },

  // Items Management - super_admin & admin
  {
    path: 'items-control',
    loadComponent: () => import('./pages/items-control/items-control.component').then(m => m.ItemsControlComponent),
    canActivate: [authGuard],
    data: {
      title: 'إدارة الأصناف',
      routeKey: 'itemsControl'
    }
  },

  // Proforma Invoice - with route key
  {
    path: 'Proforma-invoice',
    loadComponent: () => import('./pages/proforma-invoice/proforma-invoice.component').then(m => m.ProformaInvoiceComponent),
    canActivate: [authGuard],
    data: {
      title: 'فاتورة مُقدمة',
      routeKey: 'proformaInvoice'
    }
  },

  // Suppliers - super_admin & admin
  {
    path: 'suppliers',
    loadComponent: () => import('./pages/suppliers-control/suppliers-control.component').then(m => m.SuppliersControlComponent),
    canActivate: [authGuard],
    data: {
      title: 'إدارة الموردين',
      routeKey: 'suppliers'
    }
  },

  // Price Quotes - with route key
  {
    path: 'price-quotes',
    loadComponent: () => import('./pages/price-quotes/price-quotes.component').then(m => m.PriceQuotesComponent),
    canActivate: [authGuard],
    data: {
      title: 'عروض الأسعار',
      routeKey: 'priceQuotes'
    }
  },

  // Costing Sheet - with route key
  {
    path: 'costing-sheet',
    loadComponent: () => import('./pages/costing-sheet/costing-sheet.component').then(m => m.CostingSheetComponent),
    canActivate: [authGuard],
    data: {
      title: 'كشف التكاليف',
      routeKey: 'costingSheet'
    }
  },

  // Material Requests - with route key
  {
    path: 'material-requests',
    loadComponent: () => import('./pages/materials-request/materials-request.component').then(m => m.MaterialsRequestComponent),
    canActivate: [authGuard],
    data: {
      title: 'طلبات المواد',
      routeKey: 'materialRequests'
    }
  },

  // Purchases - with route key
  {
    path: 'purchases',
    loadComponent: () => import('./pages/purchases/purchases.component').then(m => m.PurchasesComponent),
    canActivate: [authGuard],
    data: {
      title: 'أوامر الشراء',
      routeKey: 'purchases'
    }
  },

  // RFQs - with route key
  {
    path: 'rfqs',
    loadComponent: () => import('./pages/rfqs/rfqs.component').then(m => m.RFQsComponent),
    canActivate: [authGuard],
    data: {
      title: 'طلبات عروض الأسعار',
      routeKey: 'rfqs'
    }
  },

  // Receipts - with route key
  {
    path: 'receipts',
    loadComponent: () => import('./pages/receipts/receipts.component').then(m => m.ReceiptsComponent),
    canActivate: [authGuard],
    data: {
      title: 'إيصالات الاستلام',
      routeKey: 'receipts'
    }
  },


  // Secretariat User - with route key (for employees and secretariat)
  {
    path: 'secretariat-user',
    loadComponent: () => import('./pages/secretariat-user/secretariat-user.component').then(m => m.SecretariatUserComponent),
    canActivate: [authGuard],
    data: {
      title: 'نماذج الموظف',
      routeKey: 'secretariatUserManagement'
    }
  },

  // Secretariat Management - with route key
  {
    path: 'secretariat',
    loadComponent: () => import('./pages/secretariat-control/secretariat-control.component').then(m => m.SecretariatControlComponent),
    canActivate: [authGuard],
    data: {
      title: 'إدارة السكرتارية',
      routeKey: 'secretariat'
    }
  },

  // Cutting - with route key
  {
    path: 'cutting',
    loadComponent: () => import('./pages/cutting/cutting.component').then(m => m.CuttingComponent),
    canActivate: [authGuard],
    data: {
      title: 'إدارة أعمال القص',
      routeKey: 'cutting'
    }
  },

  // Files Control - super_admin & admin
  {
    path: 'files-control',
    loadComponent: () => import('./pages/files-control/files-control.component').then(m => m.FilesControlComponent),
    canActivate: [roleGuard(['super_admin', 'admin'])],
    data: {
      title: 'إدارة الملفات',
      routeKey: 'filesControl'
    }
  },

  // Analysis - super_admin & admin
  {
    path: 'analysis',
    loadComponent: () => import('./pages/analysis-page/analysis-page.component').then(m => m.AnalysisPageComponent),
    canActivate: [roleGuard(['super_admin', 'admin'])],
    data: {
      title: 'التحليلات والإحصائيات',
      routeKey: 'analysis'
    }
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];
