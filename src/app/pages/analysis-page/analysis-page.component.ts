import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Import all services
import { CuttingService, CuttingStatisticsResponse } from '../../core/services/cutting.service';
import { PriceQuoteService } from '../../core/services/price-quote.service';
import { PurchaseService, POResponse } from '../../core/services/purchase.service';
import { ReceiptService, ReceiptResponse } from '../../core/services/receipt.service';
import { RfqService, RFQStatsResponse } from '../../core/services/rfq.service';
import { SecretariatService, FormsResponse } from '../../core/services/secretariat.service';
import { SecretariatUserService } from '../../core/services/secretariat-user.service';
import { SupplierService, StatisticsResponse as SupplierStatsResponse } from '../../core/services/supplier.service';
import { UsersService } from '../../core/services/users.service';
import { CostingSheetService } from '../../core/services/costing-sheet.service';
import { ProformaInvoiceService } from '../../core/services/proforma-invoice.service';

// ============================================
// INTERFACES
// ============================================

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
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
  totalCostingSheets: number;
  totalProformaInvoices: number;
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
export class AnalysisPageComponent implements OnInit, OnDestroy {
  // Loading states
  isLoading = true;
  loadingMessage = 'جاري تحميل البيانات...';

  // Error handling
  hasError = false;
  errorMessage = '';

  // Date filters
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';

  // System Overview
  systemOverview: SystemOverview = {
    totalUsers: 0,
    totalCuttingJobs: 0,
    totalPriceQuotes: 0,
    totalPurchaseOrders: 0,
    totalReceipts: 0,
    totalRFQs: 0,
    totalSecretariatForms: 0,
    totalSuppliers: 0,
    totalCostingSheets: 0,
    totalProformaInvoices: 0
  };

  // Statistics Cards
  statCards: StatCard[] = [];

  // Category Analysis
  categories: CategoryAnalysis[] = [];

  // Cutting Analysis
  cuttingStats: any = null;
  cuttingByStatus: ChartData = { labels: [], data: [], colors: [] };
  cuttingByMaterial: ChartData = { labels: [], data: [], colors: [] };

  // RFQ Analysis - SIMPLIFIED (removed status breakdown)
  rfqStats: any = null;

  // Supplier Analysis
  supplierStats: any = null;
  suppliersByStatus: ChartData = { labels: [], data: [], colors: [] };
  suppliersByCountry: ChartData = { labels: [], data: [], colors: [] };

  // Secretariat Analysis - SIMPLIFIED (removed status, only type)
  secretariatStats: any = null;
  formsByType: ChartData = { labels: [], data: [], colors: [] };

  // Active tab
  activeTab: 'overview' | 'cutting' | 'procurement' | 'secretariat' | 'suppliers' = 'overview';

  // Chart instances
  private charts: { [key: string]: Chart } = {};

  constructor(
    private cuttingService: CuttingService,
    private priceQuoteService: PriceQuoteService,
    private purchaseService: PurchaseService,
    private receiptService: ReceiptService,
    private rfqService: RfqService,
    private secretariatService: SecretariatService,
    private secretariatUserService: SecretariatUserService,
    private supplierService: SupplierService,
    private usersService: UsersService,
    private costingSheetService: CostingSheetService,
    private proformaInvoiceService: ProformaInvoiceService
  ) {}

  ngOnInit(): void {
    this.loadAllAnalytics();
  }

  ngOnDestroy(): void {
    // Destroy all charts
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
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
          return of({ pagination: { totalUsers: 0 } });
        })
      ),
      cutting: this.cuttingService.getStatistics().pipe(
        catchError(error => {
          console.warn('Cutting service error:', error);
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
          return of({ pagination: { totalQuotes: 0 } });
        })
      ),
      purchases: this.purchaseService.getAllPOs({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Purchases service error:', error);
          return of({ pagination: { totalPOs: 0 } });
        })
      ),
      receipts: this.receiptService.getAllReceipts({ limit: 1 }).pipe(
        catchError(error => {
          console.warn('Receipts service error:', error);
          return of({ pagination: { totalReceipts: 0 } });
        })
      ),
      rfqs: this.rfqService.getRFQStats().pipe(
        catchError(error => {
          console.warn('RFQ service error:', error);
          return of({
            data: {
              totalRFQs: 0,
              thisMonth: 0,
              thisWeek: 0,
              today: 0
            }
          });
        })
      ),
      secretariat: this.secretariatService.getAllForms({ limit: 1000 }).pipe(
        catchError(error => {
          console.warn('Secretariat service error:', error);
          return of({ pagination: { totalForms: 0 }, data: [] });
        })
      ),
      suppliers: this.supplierService.getStatistics().pipe(
        catchError(error => {
          console.warn('Suppliers service error:', error);
          return of({
            data: {
              total: 0, active: 0, inactive: 0, pending: 0,
              byMaterial: {}, byCountry: {}, byCity: {},
              averageRating: 0, topRated: [], recentlyAdded: []
            }
          });
        })
      ),
      costingSheets: this.costingSheetService.getAllCostingSheets({ limit: 1 }).pipe(
        catchError(error => {
          console.error('❌ Costing Sheets Error:', error);
          console.log('   - Status:', error.status);
          console.log('   - URL:', error.url);
          console.log('   - Message:', error.message);
          // Return structure matching expected successful response
          return of({ 
            success: false,
            data: [], 
            pagination: { 
              total: 0, 
              currentPage: 1, 
              totalPages: 0, 
              limit: 1 
            } 
          });
        })
      ),
      proformaInvoices: this.proformaInvoiceService.getAllProformaInvoices({ limit: 1 }).pipe(
        catchError(error => {
          console.error('❌ Proforma Invoices Error:', error);
          console.log('   - Status:', error.status);
          console.log('   - URL:', error.url);
          console.log('   - Message:', error.message);
          return of({ 
            success: false, 
            data: [], 
            pagination: { 
              totalInvoices: 0, 
              currentPage: 1, 
              totalPages: 0, 
              limit: 1 
            } 
          });
        })
      )
    }).subscribe({
      next: (results) => {
        console.log('✅ All Analytics Loaded Successfully');
        console.log('📊 Costing Sheets Full Response:', results.costingSheets);
        console.log('📊 Proforma Invoices Full Response:', results.proformaInvoices);
        
        this.processAnalyticsData(results);
        this.isLoading = false;
        // Create charts after data is loaded
        setTimeout(() => this.createAllCharts(), 100);
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
    // Debug logging for new services
    console.log('📊 Full Analytics Results:', results);
    console.log('📊 Costing Sheets Response:', results.costingSheets);
    console.log('📊 Costing Sheets Pagination:', results.costingSheets?.pagination);
    console.log('📊 Costing Sheets Data:', results.costingSheets?.data);
    console.log('📊 Proforma Invoices Response:', results.proformaInvoices);

    // Helper function to safely extract count from different response structures
    const extractCount = (result: any, paths: string[], serviceName: string = ''): number => {
      console.log(`🔍 Extracting count for ${serviceName}:`, result);
      
      for (const path of paths) {
        const keys = path.split('.');
        let value = result;
        let found = true;
        
        for (const key of keys) {
          if (value && value[key] !== undefined) {
            value = value[key];
          } else {
            found = false;
            break;
          }
        }
        
        if (found && typeof value === 'number') {
          console.log(`✅ Found count at path "${path}":`, value);
          return value;
        }
      }
      
      // Fallback: If no number found, try to get length of data array
      if (result?.data && Array.isArray(result.data)) {
        const arrayLength = result.data.length;
        console.log(`⚠️ Using data array length as fallback for ${serviceName}:`, arrayLength);
        // If we got an array with limit=1, this is not the total count
        // We need to check if there's any count in the response
        if (arrayLength > 0) {
          console.log(`⚠️ Warning: Using array length (${arrayLength}) but this may not be the total count!`);
        }
      }
      
      console.log(`❌ No valid count found for ${serviceName} in paths:`, paths);
      return 0;
    };

    // System Overview
    this.systemOverview = {
      totalUsers: results.users.pagination?.totalUsers || 0,
      totalCuttingJobs: results.cutting.data?.total || 0,
      totalPriceQuotes: results.priceQuotes.pagination?.totalQuotes || 0,
      totalPurchaseOrders: results.purchases.pagination?.totalPOs || 0,
      totalReceipts: results.receipts.pagination?.totalReceipts || 0,
      totalRFQs: results.rfqs.data?.totalRFQs || 0,
      totalSecretariatForms: results.secretariat.pagination?.totalForms || 0,
      totalSuppliers: results.suppliers.data?.total || 0,
      // Try ALL possible paths for Costing Sheets
      totalCostingSheets: extractCount(results.costingSheets, [
        'pagination.total',
        'pagination.totalSheets',
        'pagination.totalCostingSheets',
        'data.total',
        'total',
        'count',
        'totalCount'
      ], 'Costing Sheets'),
      // Try multiple possible paths for Empty Receipts
      
      // Try multiple possible paths for Proforma Invoices
      totalProformaInvoices: extractCount(results.proformaInvoices, [
        'pagination.totalInvoices',
        'pagination.total',
        'data.total',
        'total',
        'count'
      ], 'Proforma Invoices')
    };

    console.log('📊 Final System Overview:', this.systemOverview);
    console.log('📊 Costing Sheets Count:', this.systemOverview.totalCostingSheets);

    // Build stat cards
    this.buildStatCards();

    // Process Cutting Statistics
    this.processCuttingStats(results.cutting);

    // Process RFQ Statistics (simplified)
    this.processRFQStats(results.rfqs);

    // Process Supplier Statistics
    this.processSupplierStats(results.suppliers);

    // Process Secretariat Statistics (only by type)
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
        title: 'طلبات الشراء',
        value: this.systemOverview.totalPurchaseOrders,
        icon: 'bi-cart',
        color: '#06b6d4',
        subtitle: 'طلب شراء'
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
      },
      {
        title: 'كشف التكاليف',
        value: this.systemOverview.totalCostingSheets,
        icon: 'bi-calculator',
        color: '#14b8a6',
        subtitle: 'كشف التكلفة'
      },
      {
        title: 'فواتير أولية',
        value: this.systemOverview.totalProformaInvoices,
        icon: 'bi-file-earmark-invoice',
        color: '#a855f7',
        subtitle: 'فاتورة أولية'
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
      colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    };
  }

  processRFQStats(rfqData: RFQStatsResponse): void {
    // Only store time-based stats, no status breakdown
    this.rfqStats = {
      totalRFQs: rfqData.data.totalRFQs || 0,
      today: rfqData.data.today || 0,
      thisWeek: rfqData.data.thisWeek || 0,
      thisMonth: rfqData.data.thisMonth || 0
    };
  }

  processSupplierStats(supplierData: SupplierStatsResponse): void {
    this.supplierStats = supplierData.data;

    // By Status
    this.suppliersByStatus = {
      labels: ['نشط', 'غير نشط', 'قيد الانتظار'],
      data: [
        supplierData.data.active || 0,
        supplierData.data.inactive || 0,
        supplierData.data.pending || 0
      ],
      colors: ['#10b981', '#ef4444', '#f59e0b']
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
    const forms = secretariatData.data || [];

    // Count ONLY by type (no status)
    const typeCount = {
      departure: 0,
      vacation: 0,
      advance: 0,
      account_statement: 0
    };

    forms.forEach(form => {
      if (form.formType in typeCount) {
        typeCount[form.formType as keyof typeof typeCount]++;
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
          { label: 'طلبات الشراء', value: this.systemOverview.totalPurchaseOrders },
          { label: 'إشعارات الاستلام', value: this.systemOverview.totalReceipts },
          { label: 'طلبات التسعير', value: this.systemOverview.totalRFQs }
        ]
      },
      {
        name: 'السكرتاريا',
        icon: 'bi-people',
        color: '#6b7280',
        stats: [
          { label: 'إجمالي النماذج', value: this.systemOverview.totalSecretariatForms },
          { label: 'نماذج المغادرة', value: this.formsByType.data[0] || 0 },
          { label: 'نماذج الإجازة', value: this.formsByType.data[1] || 0 },
          { label: 'نماذج السلفة', value: this.formsByType.data[2] || 0 }
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
      },
      {
        name: 'المستندات المالية',
        icon: 'bi-file-earmark-spreadsheet',
        color: '#14b8a6',
        stats: [
          { label: 'كشف التكاليف', value: this.systemOverview.totalCostingSheets },
          { label: 'الفواتير الأولية', value: this.systemOverview.totalProformaInvoices },
          { label: 'الإجمالي', value: this.systemOverview.totalCostingSheets + this.systemOverview.totalProformaInvoices }
        ]
      }
    ];
  }

  // ============================================
  // CHART CREATION
  // ============================================

  createAllCharts(): void {
    this.createCuttingStatusChart();
    this.createCuttingMaterialChart();
    this.createSecretariatTypeChart();
    this.createSupplierStatusChart();
  }

  createCuttingStatusChart(): void {
    const canvas = document.getElementById('cuttingStatusChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.charts['cuttingStatus']) {
      this.charts['cuttingStatus'].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.charts['cuttingStatus'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.cuttingByStatus.labels,
        datasets: [{
          data: this.cuttingByStatus.data,
          backgroundColor: this.cuttingByStatus.colors,
          borderWidth: 0,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Cairo, sans-serif', size: 13 },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 15,
            titleFont: { family: 'Cairo, sans-serif', size: 15 },
            bodyFont: { family: 'Cairo, sans-serif', size: 14 },
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  createCuttingMaterialChart(): void {
    const canvas = document.getElementById('cuttingMaterialChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.charts['cuttingMaterial']) {
      this.charts['cuttingMaterial'].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.charts['cuttingMaterial'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.cuttingByMaterial.labels,
        datasets: [{
          label: 'عدد المهام',
          data: this.cuttingByMaterial.data,
          backgroundColor: this.cuttingByMaterial.colors,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 15,
            titleFont: { family: 'Cairo, sans-serif', size: 15 },
            bodyFont: { family: 'Cairo, sans-serif', size: 14 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { font: { family: 'Cairo, sans-serif', size: 12 } },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            ticks: { font: { family: 'Cairo, sans-serif', size: 12 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  createSecretariatTypeChart(): void {
    const canvas = document.getElementById('secretariatTypeChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.charts['secretariatType']) {
      this.charts['secretariatType'].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.charts['secretariatType'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.formsByType.labels,
        datasets: [{
          data: this.formsByType.data,
          backgroundColor: this.formsByType.colors,
          borderWidth: 0,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Cairo, sans-serif', size: 13 },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 15,
            titleFont: { family: 'Cairo, sans-serif', size: 15 },
            bodyFont: { family: 'Cairo, sans-serif', size: 14 }
          }
        }
      }
    });
  }

  createSupplierStatusChart(): void {
    const canvas = document.getElementById('supplierStatusChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.charts['supplierStatus']) {
      this.charts['supplierStatus'].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.charts['supplierStatus'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.suppliersByStatus.labels,
        datasets: [{
          data: this.suppliersByStatus.data,
          backgroundColor: this.suppliersByStatus.colors,
          borderWidth: 0,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Cairo, sans-serif', size: 13 },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 15,
            titleFont: { family: 'Cairo, sans-serif', size: 15 },
            bodyFont: { family: 'Cairo, sans-serif', size: 14 }
          }
        }
      }
    });
  }

  // ============================================
  // UI METHODS
  // ============================================

  switchTab(tab: 'overview' | 'cutting' | 'procurement' | 'secretariat' | 'suppliers'): void {
    this.activeTab = tab;
    // Recreate charts when switching tabs
    setTimeout(() => this.createAllCharts(), 100);
  }

  selectPeriod(period: 'week' | 'month' | 'quarter' | 'year'): void {
    this.selectedPeriod = period;
    this.loadAllAnalytics();
  }

  refreshData(): void {
    this.loadAllAnalytics();
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