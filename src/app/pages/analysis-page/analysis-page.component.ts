import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Import all services
import { CuttingService, CuttingStatisticsResponse } from '../../core/services/cutting.service';
import { PriceQuoteService } from '../../core/services/price-quote.service';
import { PurchaseService, PurchaseOrderResponse } from '../../core/services/purchase.service';
import { ReceiptService, ReceiptResponse } from '../../core/services/receipt.service';
import { RfqService, RFQStatsResponse } from '../../core/services/rfq.service';
import { SecretariatService, FormsResponse } from '../../core/services/secretariat.service';
import { SecretariatUserService } from '../../core/services/secretariat-user.service';
import { SupplierService, StatisticsResponse as SupplierStatsResponse } from '../../core/services/supplier.service';
import { UsersService } from '../../core/services/users.service';

// ============================================
// INTERFACES
// ============================================

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: number;
  subtitle?: string;
}

interface ChartData {
  labels: string[];
  data: number[];
  colors: string[];
}

interface SystemOverview {
  totalUsers: number;
  totalCuttingJobs: number;
  totalPriceQuotes: number;
  totalPurchaseOrders: number;
  totalReceipts: number;
  totalRFQs: number;
  totalSecretariatForms: number;
  totalSuppliers: number;
}

interface CategoryAnalysis {
  name: string;
  icon: string;
  color: string;
  stats: Array<{ label: string; value: string | number }>;
  chartData?: ChartData;
}

@Component({
  selector: 'app-analysis-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analysis-page.component.html',
  styleUrl: './analysis-page.component.scss'
})
export class AnalysisPageComponent implements OnInit {
  // Loading states
  isLoading = true;
  loadingMessage = 'جاري تحميل البيانات...';

  // Error handling
  hasError = false;
  errorMessage = '';

  // Service status tracking
  serviceStatus = {
    users: true,
    cutting: true,
    priceQuotes: true,
    purchases: true,
    receipts: true,
    rfqs: true,
    secretariat: true,
    suppliers: true
  };

  // Date filters
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';
  customStartDate: string = '';
  customEndDate: string = '';

  // System Overview
  systemOverview: SystemOverview = {
    totalUsers: 0,
    totalCuttingJobs: 0,
    totalPriceQuotes: 0,
    totalPurchaseOrders: 0,
    totalReceipts: 0,
    totalRFQs: 0,
    totalSecretariatForms: 0,
    totalSuppliers: 0
  };

  // Statistics Cards
  statCards: StatCard[] = [];

  // Category Analysis
  categories: CategoryAnalysis[] = [];

  // Cutting Analysis
  cuttingStats: any = null;
  cuttingByStatus: ChartData = { labels: [], data: [], colors: [] };
  cuttingByMaterial: ChartData = { labels: [], data: [], colors: [] };

  // RFQ Analysis
  rfqStats: any = null;
  rfqByStatus: ChartData = { labels: [], data: [], colors: [] };

  // Supplier Analysis
  supplierStats: any = null;
  suppliersByStatus: ChartData = { labels: [], data: [], colors: [] };
  suppliersByCountry: ChartData = { labels: [], data: [], colors: [] };

  // Secretariat Analysis
  secretariatStats: any = null;
  formsByType: ChartData = { labels: [], data: [], colors: [] };
  formsByStatus: ChartData = { labels: [], data: [], colors: [] };

  // Active tab
  activeTab: 'overview' | 'cutting' | 'procurement' | 'secretariat' | 'suppliers' = 'overview';

  constructor(
    private cuttingService: CuttingService,
    private priceQuoteService: PriceQuoteService,
    private purchaseService: PurchaseService,
    private receiptService: ReceiptService,
    private rfqService: RfqService,
    private secretariatService: SecretariatService,
    private secretariatUserService: SecretariatUserService,
    private supplierService: SupplierService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.loadAllAnalytics();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadAllAnalytics(): void {
    this.isLoading = true;
    this.hasError = false;

    forkJoin({
      users: this.usersService.getAllUsers({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Users service error:', error);
          this.serviceStatus.users = false;
          return of({ pagination: { totalUsers: 0 } });
        })
      ),
      cutting: this.cuttingService.getStatistics().pipe(
        catchError(error => {
          console.warn('Cutting service error:', error);
          this.serviceStatus.cutting = false;
          return of({
            data: {
              total: 0,
              byStatus: { معلق: 0, 'قيد التنفيذ': 0, مكتمل: 0, جزئي: 0 },
              byMaterial: {},
              totalProgress: { totalQuantity: 0, totalCut: 0, percentageComplete: 0 }
            }
          });
        })
      ),
      priceQuotes: this.priceQuoteService.getAllPriceQuotes({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Price quotes service error:', error);
          this.serviceStatus.priceQuotes = false;
          return of({ pagination: { totalQuotes: 0 } });
        })
      ),
      purchases: this.purchaseService.getAllPOs({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Purchases service error:', error);
          this.serviceStatus.purchases = false;
          return of({ pagination: { totalPOs: 0 } });
        })
      ),
      receipts: this.receiptService.getAllReceipts({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Receipts service error:', error);
          this.serviceStatus.receipts = false;
          return of({ pagination: { totalReceipts: 0 } });
        })
      ),
      rfqs: this.rfqService.getRFQStats().pipe(
        catchError(error => {
          console.warn('RFQ service error:', error);
          this.serviceStatus.rfqs = false;
          return of({
            data: {
              totalRFQs: 0, pending: 0, approved: 0, rejected: 0,
              urgent: 0, thisMonth: 0, thisWeek: 0, today: 0
            }
          });
        })
      ),
      secretariat: this.secretariatService.getAllForms({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Secretariat service error:', error);
          this.serviceStatus.secretariat = false;
          return of({ pagination: { totalForms: 0 }, data: [] });
        })
      ),
      suppliers: this.supplierService.getStatistics().pipe(
        catchError(error => {
          console.warn('Suppliers service error:', error);
          this.serviceStatus.suppliers = false;
          return of({
            data: {
              total: 0, active: 0, inactive: 0, pending: 0,
              byMaterial: {}, byCountry: {}, byCity: {},
              averageRating: 0, topRated: [], recentlyAdded: []
            }
          });
        })
      )
    }).subscribe({
      next: (results) => {
        this.processAnalyticsData(results);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.hasError = true;
        this.errorMessage = 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.';
        this.isLoading = false;
      }
    });
  }

  processAnalyticsData(results: any): void {
    // System Overview
    this.systemOverview = {
      totalUsers: results.users.pagination?.totalUsers || 0,
      totalCuttingJobs: results.cutting.data?.total || 0,
      totalPriceQuotes: results.priceQuotes.pagination?.totalQuotes || 0,
      totalPurchaseOrders: results.purchases.pagination?.totalPOs || 0,
      totalReceipts: results.receipts.pagination?.totalReceipts || 0,
      totalRFQs: results.rfqs.data?.totalRFQs || 0,
      totalSecretariatForms: results.secretariat.pagination?.totalForms || 0,
      totalSuppliers: results.suppliers.data?.total || 0
    };

    // Build stat cards
    this.buildStatCards();

    // Process Cutting Statistics
    this.processCuttingStats(results.cutting);

    // Process RFQ Statistics
    this.processRFQStats(results.rfqs);

    // Process Supplier Statistics
    this.processSupplierStats(results.suppliers);

    // Process Secretariat Statistics
    this.processSecretariatStats(results.secretariat);

    // Build category analysis
    this.buildCategoryAnalysis();
  }

  buildStatCards(): void {
    this.statCards = [
      {
        title: 'إجمالي المستخدمين',
        value: this.systemOverview.totalUsers,
        icon: 'bi-people-fill',
        color: '#3b82f6',
        subtitle: 'مستخدم نشط'
      },
      {
        title: 'أوامر القص',
        value: this.systemOverview.totalCuttingJobs,
        icon: 'bi-scissors',
        color: '#ef4444',
        subtitle: 'أمر قص'
      },
      {
        title: 'عروض الأسعار',
        value: this.systemOverview.totalPriceQuotes,
        icon: 'bi-file-earmark-text',
        color: '#10b981',
        subtitle: 'عرض سعر'
      },
      {
        title: 'أوامر الشراء',
        value: this.systemOverview.totalPurchaseOrders,
        icon: 'bi-cart',
        color: '#06b6d4',
        subtitle: 'أمر شراء'
      },
      {
        title: 'إشعارات الاستلام',
        value: this.systemOverview.totalReceipts,
        icon: 'bi-clipboard-check',
        color: '#8b5cf6',
        subtitle: 'إشعار'
      },
      {
        title: 'طلبات التسعير',
        value: this.systemOverview.totalRFQs,
        icon: 'bi-file-earmark-bar-graph',
        color: '#f59e0b',
        subtitle: 'طلب تسعير'
      },
      {
        title: 'نماذج السكرتاريا',
        value: this.systemOverview.totalSecretariatForms,
        icon: 'bi-file-person',
        color: '#6b7280',
        subtitle: 'نموذج'
      },
      {
        title: 'الموردين',
        value: this.systemOverview.totalSuppliers,
        icon: 'bi-truck',
        color: '#ec4899',
        subtitle: 'مورد'
      }
    ];
  }

  processCuttingStats(cuttingData: CuttingStatisticsResponse): void {
    this.cuttingStats = cuttingData.data;

    // By Status
    const statusData = cuttingData.data.byStatus;
    this.cuttingByStatus = {
      labels: ['معلق', 'قيد التنفيذ', 'مكتمل', 'جزئي'],
      data: [
        statusData.معلق || 0,
        statusData['قيد التنفيذ'] || 0,
        statusData.مكتمل || 0,
        statusData.جزئي || 0
      ],
      colors: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']
    };

    // By Material
    const materialData = cuttingData.data.byMaterial;
    this.cuttingByMaterial = {
      labels: Object.keys(materialData),
      data: Object.values(materialData),
      colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    };
  }

  processRFQStats(rfqData: RFQStatsResponse): void {
    this.rfqStats = rfqData.data;

    this.rfqByStatus = {
      labels: ['قيد الانتظار', 'معتمد', 'مرفوض'],
      data: [
        rfqData.data.pending || 0,
        rfqData.data.approved || 0,
        rfqData.data.rejected || 0
      ],
      colors: ['#f59e0b', '#10b981', '#ef4444']
    };
  }

  processSupplierStats(supplierData: SupplierStatsResponse): void {
    this.supplierStats = supplierData.data;

    // By Status
    this.suppliersByStatus = {
      labels: ['نشط', 'غير نشط', 'قيد الانتظار', 'معلق'],
      data: [
        supplierData.data.active || 0,
        supplierData.data.inactive || 0,
        supplierData.data.pending || 0,
        0 // suspended not in response
      ],
      colors: ['#10b981', '#ef4444', '#f59e0b', '#6b7280']
    };

    // By Country
    const countryData = supplierData.data.byCountry || {};
    this.suppliersByCountry = {
      labels: Object.keys(countryData).slice(0, 5),
      data: Object.values(countryData).slice(0, 5) as number[],
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    };
  }

  processSecretariatStats(secretariatData: FormsResponse): void {
    // This is a simplified version - you might need to fetch more detailed stats
    const forms = secretariatData.data || [];

    // Count by type
    const typeCount = {
      departure: 0,
      vacation: 0,
      advance: 0,
      account_statement: 0
    };

    const statusCount = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    forms.forEach(form => {
      if (form.formType in typeCount) {
        typeCount[form.formType as keyof typeof typeCount]++;
      }
      if (form.status in statusCount) {
        statusCount[form.status as keyof typeof statusCount]++;
      }
    });

    this.formsByType = {
      labels: ['مغادرة', 'إجازة', 'سلفة', 'كشف حساب'],
      data: [
        typeCount.departure,
        typeCount.vacation,
        typeCount.advance,
        typeCount.account_statement
      ],
      colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']
    };

    this.formsByStatus = {
      labels: ['قيد الانتظار', 'معتمد', 'مرفوض'],
      data: [statusCount.pending, statusCount.approved, statusCount.rejected],
      colors: ['#f59e0b', '#10b981', '#ef4444']
    };
  }

  buildCategoryAnalysis(): void {
    this.categories = [
      {
        name: 'نظام القص بالليزر',
        icon: 'bi-scissors',
        color: '#ef4444',
        stats: [
          { label: 'إجمالي أوامر القص', value: this.cuttingStats?.total || 0 },
          { label: 'معلق', value: this.cuttingStats?.byStatus.معلق || 0 },
          { label: 'قيد التنفيذ', value: this.cuttingStats?.byStatus['قيد التنفيذ'] || 0 },
          { label: 'مكتمل', value: this.cuttingStats?.byStatus.مكتمل || 0 },
          { label: 'نسبة الإنجاز', value: `${this.cuttingStats?.totalProgress?.percentageComplete || 0}%` }
        ],
        chartData: this.cuttingByStatus
      },
      {
        name: 'المشتريات والعمليات',
        icon: 'bi-cart',
        color: '#3b82f6',
        stats: [
          { label: 'عروض الأسعار', value: this.systemOverview.totalPriceQuotes },
          { label: 'أوامر الشراء', value: this.systemOverview.totalPurchaseOrders },
          { label: 'إشعارات الاستلام', value: this.systemOverview.totalReceipts },
          { label: 'طلبات التسعير', value: this.systemOverview.totalRFQs },
          { label: 'طلبات عاجلة', value: this.rfqStats?.urgent || 0 }
        ]
      },
      {
        name: 'السكرتاريا',
        icon: 'bi-people',
        color: '#6b7280',
        stats: [
          { label: 'إجمالي النماذج', value: this.systemOverview.totalSecretariatForms },
          { label: 'قيد الانتظار', value: this.formsByStatus.data[0] || 0 },
          { label: 'معتمد', value: this.formsByStatus.data[1] || 0 },
          { label: 'مرفوض', value: this.formsByStatus.data[2] || 0 }
        ],
        chartData: this.formsByType
      },
      {
        name: 'الموردين',
        icon: 'bi-truck',
        color: '#ec4899',
        stats: [
          { label: 'إجمالي الموردين', value: this.supplierStats?.total || 0 },
          { label: 'نشط', value: this.supplierStats?.active || 0 },
          { label: 'غير نشط', value: this.supplierStats?.inactive || 0 },
          { label: 'متوسط التقييم', value: `${this.supplierStats?.averageRating?.toFixed(1) || 0} ⭐` }
        ],
        chartData: this.suppliersByStatus
      }
    ];
  }

  // ============================================
  // UI METHODS
  // ============================================

  switchTab(tab: 'overview' | 'cutting' | 'procurement' | 'secretariat' | 'suppliers'): void {
    this.activeTab = tab;
  }

  selectPeriod(period: 'week' | 'month' | 'quarter' | 'year'): void {
    this.selectedPeriod = period;
    // Reload data based on period
    this.loadAllAnalytics();
  }

  applyCustomDateRange(): void {
    if (this.customStartDate && this.customEndDate) {
      // Reload data with custom date range
      this.loadAllAnalytics();
    }
  }

  refreshData(): void {
    this.loadAllAnalytics();
  }

  exportToExcel(): void {
    // TODO: Implement Excel export
    console.log('Exporting to Excel...');
  }

  exportToPDF(): void {
    // TODO: Implement PDF export
    console.log('Exporting to PDF...');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  formatNumber(num: number): string {
    return num.toLocaleString('ar-EG');
  }

  getChartPercentage(data: number[], index: number): number {
    const total = data.reduce((sum, val) => sum + val, 0);
    return this.getPercentage(data[index], total);
  }
}
