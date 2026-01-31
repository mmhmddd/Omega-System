import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  CuttingService,
  CuttingJob,
  CreateCuttingJobData,
  UpdateCuttingJobData,
  CuttingStatistics
} from '../../core/services/cutting.service';
import { AuthService } from '../../core/services/auth.service';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface UserActivity {
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'status_changed';
  timestamp: string;
  details?: string;
}

@Component({
  selector: 'app-cutting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cutting.component.html',
  styleUrl: './cutting.component.scss'
})
export class CuttingComponent implements OnInit, OnDestroy {

  // ============================================
  // VIEW MANAGEMENT
  // ============================================
  currentView: 'list' | 'create' | 'track' = 'list';
  formLanguage: 'ar' | 'en' = 'ar';

  // ============================================
  // DATA
  // ============================================
  cuttingJobs: CuttingJob[] = [];
  selectedJob: CuttingJob | null = null;
  statistics: CuttingStatistics | null = null;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[] = [];
  private toastTimeouts: Map<string, any> = new Map();

  // ============================================
  // FORM DATA
  // ============================================
  formData: CreateCuttingJobData = {
    projectName: '',
    pieceName: '',
    quantity: 1,
    materialType: '',
    thickness: 0,
    notes: ''
  };

  selectedFile: File | null = null;
  selectedFileName: string = '';

  // ============================================
  // TRACKING DATA
  // ============================================
  trackingData = {
    jobId: '',
    currentlyCut: 0,
    newStatus: 'قيد التنفيذ' as 'معلق' | 'قيد التنفيذ' | 'مكتمل' | 'جزئي',
    notes: ''
  };

  // ============================================
  // FILTERS
  // ============================================
  selectedStatus: string = '';
  selectedMaterialType: string = '';
  searchTerm: string = '';
  dateFrom: string = '';
  dateTo: string = '';

  // ============================================
  // MATERIAL TYPES
  // ============================================
  materialTypes = [
    { value: 'steel', label: 'فولاذ', labelEn: 'Steel' },
    { value: 'aluminum', label: 'ألومنيوم', labelEn: 'Aluminum' },
    { value: 'stainless', label: 'ستانلس ستيل', labelEn: 'Stainless Steel' },
    { value: 'copper', label: 'نحاس', labelEn: 'Copper' },
    { value: 'brass', label: 'نحاس أصفر', labelEn: 'Brass' }
  ];

  // ============================================
  // PAGINATION
  // ============================================
  currentPage: number = 1;
  totalPages: number = 1;
  totalJobs: number = 0;
  pageSize: number = 10;

  // ============================================
  // LOADING STATES
  // ============================================
  loading: boolean = false;
  creatingJob: boolean = false;
  deletingJob: boolean = false;
  updatingJob: boolean = false;
  loadingStatistics: boolean = false;

  // ============================================
  // VALIDATION ERRORS
  // ============================================
  fieldErrors: { [key: string]: string } = {};
  formError: string = '';

  // ============================================
  // MODALS
  // ============================================
  showDeleteModal: boolean = false;
  showEditModal: boolean = false;
  showTrackModal: boolean = false;
  showViewModal: boolean = false;
  showUserHistoryModal: boolean = false;
  showDuplicateModal: boolean = false;
  jobToDuplicate: CuttingJob | null = null;

  // ============================================
  // USER HISTORY
  // ============================================
  userActivities: UserActivity[] = [];

  // ============================================
  // ACTIONS MENU
  // ============================================
  activeActionsMenu: string | null = null;
  menuShouldOpenUp: { [jobId: string]: boolean } = {};

  constructor(
    public cuttingService: CuttingService,
    private authService: AuthService
  ) {}

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================

  ngOnInit(): void {
    this.checkAccess();
    this.loadCuttingJobs();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
  }

  // ============================================
  // ACTIONS MENU
  // ============================================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.actions-menu') || target.closest('.actions-trigger')) {
      return;
    }
    this.closeActionsMenu();
  }

  toggleActionsMenu(jobId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.activeActionsMenu === jobId) {
      this.activeActionsMenu = null;
      return;
    }

    this.menuShouldOpenUp = {};
    this.activeActionsMenu = jobId;

    setTimeout(() => {
      const button = document.querySelector(`[data-job-id="${jobId}"]`) as HTMLElement;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeightEstimate = 300;

      this.menuShouldOpenUp[jobId] = spaceBelow < menuHeightEstimate;
    }, 0);
  }

  closeActionsMenu(): void {
    this.activeActionsMenu = null;
  }

  // ============================================
  // ACCESS CONTROL
  // ============================================

  checkAccess(): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'يجب تسجيل الدخول أولاً'
        : 'Please login first';
      this.showToast('error', errorMsg);
      return;
    }

    if (currentUser.role !== 'super_admin' && !currentUser.systemAccess?.laserCuttingManagement) {
      const errorMsg = this.formLanguage === 'ar'
        ? 'ليس لديك صلاحية للوصول إلى إدارة القص بالليزر'
        : 'You do not have access to Laser Cutting Management';
      this.showToast('error', errorMsg);
    }
  }

  // ============================================
  // TOAST METHODS
  // ============================================

  showToast(type: ToastType, message: string, duration: number = 3000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message };

    this.toasts.push(toast);

    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimeouts.set(id, timeout);
    }

    if (this.toasts.length > 5) {
      const oldestToast = this.toasts[0];
      this.removeToast(oldestToast.id);
    }
  }

  removeToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      const timeout = this.toastTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.toastTimeouts.delete(id);
      }
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadCuttingJobs(): void {
    this.loading = true;
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      fileStatus: this.selectedStatus || undefined,
      materialType: this.selectedMaterialType || undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      search: this.searchTerm || undefined
    };

    this.cuttingService.getAllCuttingJobs(filters).subscribe({
      next: (response) => {
        this.cuttingJobs = response.data.map(job => {
          const currentlyCut = Number(job.currentlyCut) || 0;
          return {
            ...job,
            currentlyCut: currentlyCut,
            remaining: this.cuttingService.calculateRemaining(job.quantity, currentlyCut)
          };
        });
        this.totalJobs = response.pagination.totalJobs;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cutting jobs:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ في تحميل مهام القص'
          : 'Error loading cutting jobs';
        this.showToast('error', errorMsg);
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.loadingStatistics = true;
    this.cuttingService.getStatistics().subscribe({
      next: (response) => {
        this.statistics = response.data;
        this.loadingStatistics = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.loadingStatistics = false;
      }
    });
  }

  // ============================================
  // VIEW MANAGEMENT
  // ============================================

  createNewJob(): void {
    this.resetForm();
    this.currentView = 'create';
    this.fieldErrors = {};
    this.formError = '';
  }

  openTrackingView(): void {
    this.currentView = 'track';
    this.trackingData = {
      jobId: '',
      currentlyCut: 0,
      newStatus: 'قيد التنفيذ',
      notes: ''
    };
    this.selectedJob = null;
  }

  openTrackingViewForJob(job: CuttingJob): void {
    this.currentView = 'track';
    this.trackingData = {
      jobId: job.id,
      currentlyCut: 0,  // Reset to 0 for new batch input
      newStatus: 'قيد التنفيذ',
      notes: ''
    };
    this.selectedJob = job;
  }

  backToList(): void {
    this.currentView = 'list';
    this.resetForm();
    this.loadCuttingJobs();
    this.loadStatistics();
  }

  // ============================================
  // DUPLICATE JOB FUNCTIONALITY
  // ============================================

  openDuplicateModal(job: CuttingJob): void {
    this.jobToDuplicate = job;
    this.showDuplicateModal = true;
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.jobToDuplicate = null;
  }

  confirmDuplicate(): void {
    if (!this.jobToDuplicate) return;

    const job = this.jobToDuplicate;

    // Reset form first
    this.resetForm();

    // Populate form with duplicated data
    this.formData = {
      projectName: job.projectName,
      pieceName: job.pieceName || '',
      quantity: job.quantity,
      materialType: job.materialType,
      thickness: job.thickness,
      notes: job.notes || ''
    };

    // Set view to CREATE (not edit)
    this.currentView = 'create';
    this.fieldErrors = {};
    this.formError = '';

    // Close modal
    this.closeDuplicateModal();

    // Show success message
    const successMsg = this.formLanguage === 'ar'
      ? `تم نسخ بيانات مهمة القص ${job.id}. يمكنك التعديل وحفظ مهمة جديدة.`
      : `Cutting job ${job.id} data copied. You can modify and save as a new job.`;
    this.showToast('info', successMsg, 5000);
  }

  // ============================================
  // VIEW DETAILS MODAL
  // ============================================

  openViewModal(job: CuttingJob): void {
    this.selectedJob = { ...job };
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    setTimeout(() => {
      this.selectedJob = null;
    }, 300);
  }

  openEditModalFromView(): void {
    if (this.selectedJob) {
      this.closeViewModal();
      setTimeout(() => {
        this.openEditModal(this.selectedJob!);
      }, 300);
    }
  }

  // ============================================
  // USER HISTORY MODAL
  // ============================================

  openUserHistoryModal(job: CuttingJob): void {
    this.selectedJob = job;
    this.buildUserActivityHistory(job);
    this.showUserHistoryModal = true;
  }

  closeUserHistoryModal(): void {
    this.showUserHistoryModal = false;
    setTimeout(() => {
      this.selectedJob = null;
      this.userActivities = [];
    }, 300);
  }

  buildUserActivityHistory(job: CuttingJob): void {
    this.userActivities = [];

    // ✅ NEW: Use updateHistory from backend if available
    if (job.updateHistory && job.updateHistory.length > 0) {
      job.updateHistory.forEach((historyEntry) => {
        const userName = historyEntry.updatedByInfo
          ? (historyEntry.updatedByInfo.name || historyEntry.updatedByInfo.username)
          : historyEntry.updatedBy;

        let actionType: 'created' | 'updated' | 'status_changed' = 'updated';
        let details = '';

        if (historyEntry.changes.action === 'created') {
          actionType = 'created';
          details = this.formLanguage === 'ar'
            ? 'قام بإنشاء مهمة القص'
            : 'Created cutting job';
        } else if (historyEntry.changes.modifications && historyEntry.changes.modifications.length > 0) {
          const mods = historyEntry.changes.modifications;

          // Check if status was changed
          const statusChange = mods.find(m => m.field === 'fileStatus');
          if (statusChange) {
            actionType = 'status_changed';
            details = this.formLanguage === 'ar'
              ? `قام بتغيير الحالة من "${statusChange.oldValue}" إلى "${statusChange.newValue}"`
              : `Changed status from "${statusChange.oldValue}" to "${statusChange.newValue}"`;
          } else {
            // General update
            const changedFields = mods.map(m => m.field).join(', ');
            details = this.formLanguage === 'ar'
              ? `قام بتحديث: ${changedFields}`
              : `Updated: ${changedFields}`;
          }
        } else {
          details = this.formLanguage === 'ar'
            ? 'قام بتحديث مهمة القص'
            : 'Updated cutting job';
        }

        this.userActivities.push({
          userId: historyEntry.updatedBy,
          userName: userName,
          action: actionType,
          timestamp: historyEntry.timestamp,
          details: details
        });
      });
    } else {
      // ✅ FALLBACK: Use old method if updateHistory is not available
      const creatorName = job.uploadedByInfo
        ? (job.uploadedByInfo.name || job.uploadedByInfo.username)
        : job.uploadedBy;

      this.userActivities.push({
        userId: job.uploadedBy,
        userName: creatorName,
        action: 'created',
        timestamp: job.createdAt,
        details: this.formLanguage === 'ar'
          ? 'قام بإنشاء مهمة القص'
          : 'Created cutting job'
      });

      if (job.cutBy && job.cutBy.length > 0 && job.cutByInfo && job.cutByInfo.length > 0) {
        job.cutBy.forEach((userId) => {
          const userInfo = job.cutByInfo!.find(u => u.id === userId);
          const userName = userInfo
            ? (userInfo.name || userInfo.username)
            : userId;

          this.userActivities.push({
            userId: userId,
            userName: userName,
            action: 'updated',
            timestamp: job.updatedAt,
            details: this.formLanguage === 'ar'
              ? 'قام بتحديث مهمة القص'
              : 'Updated cutting job'
          });
        });
      }
    }

    // Sort by timestamp (newest first)
    this.userActivities.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  getActionLabel(action: 'created' | 'updated' | 'status_changed'): string {
    const labels: { [key: string]: { ar: string; en: string } } = {
      'created': { ar: 'إنشاء', en: 'Created' },
      'updated': { ar: 'تحديث', en: 'Updated' },
      'status_changed': { ar: 'تغيير الحالة', en: 'Status Changed' }
    };
    return this.formLanguage === 'ar' ? labels[action].ar : labels[action].en;
  }

  getActionColor(action: 'created' | 'updated' | 'status_changed'): string {
    const colors: { [key: string]: string } = {
      'created': '#10b981',
      'updated': '#3b82f6',
      'status_changed': '#f59e0b'
    };
    return colors[action] || '#64748b';
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString(this.formLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return '-';

    const now = new Date().getTime();
    const past = new Date(dateString).getTime();
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
      return this.formLanguage === 'ar' ? 'منذ لحظات' : 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this.formLanguage === 'ar'
        ? `منذ ${diffInMinutes} دقيقة`
        : `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this.formLanguage === 'ar'
        ? `منذ ${diffInHours} ساعة`
        : `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return this.formLanguage === 'ar'
        ? `منذ ${diffInDays} يوم`
        : `${diffInDays} days ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    return this.formLanguage === 'ar'
      ? `منذ ${diffInMonths} شهر`
      : `${diffInMonths} months ago`;
  }

  // ============================================
  // FILE DOWNLOAD
  // ============================================

  downloadFile(jobId: string, fileName: string): void {
    if (!jobId || !fileName) {
      this.showToast('error', this.formLanguage === 'ar'
        ? 'الملف غير متوفر'
        : 'File not available');
      return;
    }

    const loadingToastId = `loading-${Date.now()}`;
    this.showToast('info', this.formLanguage === 'ar'
      ? 'جاري تحميل الملف...'
      : 'Downloading file...', 0);

    this.cuttingService.downloadFile(jobId).subscribe({
      next: (blob) => {
        this.removeToast(loadingToastId);

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        this.showToast('success', this.formLanguage === 'ar'
          ? 'تم تحميل الملف بنجاح'
          : 'File downloaded successfully');
      },
      error: (error) => {
        this.removeToast(loadingToastId);
        console.error('Error downloading file:', error);

        let errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء تحميل الملف'
          : 'Error downloading file';

        if (error.status === 404) {
          errorMsg = this.formLanguage === 'ar'
            ? 'الملف غير موجود'
            : 'File not found';
        } else if (error.status === 401 || error.status === 403) {
          errorMsg = this.formLanguage === 'ar'
            ? 'ليس لديك صلاحية لتحميل هذا الملف'
            : 'You do not have permission to download this file';
        }

        this.showToast('error', errorMsg);
      }
    });
  }

  // ============================================
  // FORM MANAGEMENT
  // ============================================

  resetForm(): void {
    this.formData = {
      projectName: '',
      pieceName: '',
      quantity: 1,
      materialType: '',
      thickness: 0,
      notes: ''
    };
    this.selectedFile = null;
    this.selectedFileName = '';
    this.fieldErrors = {};
    this.formError = '';
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      if (!this.cuttingService.isValidFileType(file)) {
        this.fieldErrors['file'] = this.formLanguage === 'ar'
          ? 'نوع الملف غير صالح. الأنواع المسموحة: DWG, DXF, DWT, NC, TXT'
          : 'Invalid file type. Allowed: DWG, DXF, DWT, NC, TXT';
        this.selectedFile = null;
        this.selectedFileName = '';
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        this.fieldErrors['file'] = this.formLanguage === 'ar'
          ? 'حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)'
          : 'File size too large (max 50MB)';
        this.selectedFile = null;
        this.selectedFileName = '';
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
      delete this.fieldErrors['file'];
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
  }

  // ============================================
  // VALIDATION
  // ============================================

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.formData.projectName || this.formData.projectName.trim().length === 0) {
      this.fieldErrors['projectName'] = this.formLanguage === 'ar'
        ? 'اسم المشروع مطلوب'
        : 'Project name is required';
      isValid = false;
    }

    if (!this.formData.quantity || this.formData.quantity <= 0) {
      this.fieldErrors['quantity'] = this.formLanguage === 'ar'
        ? 'الكمية يجب أن تكون أكبر من صفر'
        : 'Quantity must be greater than zero';
      isValid = false;
    }

    if (!this.formData.materialType) {
      this.fieldErrors['materialType'] = this.formLanguage === 'ar'
        ? 'نوع المادة مطلوب'
        : 'Material type is required';
      isValid = false;
    }

    if (!this.formData.thickness || this.formData.thickness <= 0) {
      this.fieldErrors['thickness'] = this.formLanguage === 'ar'
        ? 'السماكة يجب أن تكون أكبر من صفر'
        : 'Thickness must be greater than zero';
      isValid = false;
    }

    return isValid;
  }

  // ============================================
  // CREATE JOB
  // ============================================

  saveJob(): void {
    if (!this.validateForm()) {
      this.formError = this.formLanguage === 'ar'
        ? 'يرجى تصحيح الأخطاء في النموذج'
        : 'Please correct form errors';
      this.showToast('warning', this.formError);
      return;
    }

    this.creatingJob = true;
    this.formError = '';

    const jobData: CreateCuttingJobData = {
      ...this.formData,
      file: this.selectedFile || undefined
    };

    this.cuttingService.createCuttingJob(jobData).subscribe({
      next: (response) => {
        this.creatingJob = false;
        const successMsg = this.formLanguage === 'ar'
          ? 'تم إنشاء مهمة القص بنجاح'
          : 'Cutting job created successfully';
        this.showToast('success', successMsg);
        this.backToList();
      },
      error: (error) => {
        console.error('Error creating cutting job:', error);
        const errorMsg = error.error?.message || (this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء إنشاء مهمة القص'
          : 'Error creating cutting job');
        this.formError = errorMsg;
        this.showToast('error', errorMsg);
        this.creatingJob = false;
      }
    });
  }

  // ============================================
  // EDIT JOB
  // ============================================

  openEditModal(job: CuttingJob): void {
    this.selectedJob = job;
    this.formData = {
      projectName: job.projectName,
      pieceName: job.pieceName || '',
      quantity: job.quantity,
      materialType: job.materialType,
      thickness: job.thickness,
      notes: job.notes || ''
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedJob = null;
    this.resetForm();
  }

  updateJob(): void {
    if (!this.selectedJob) return;

    if (!this.validateForm()) {
      this.showToast('warning', this.formLanguage === 'ar'
        ? 'يرجى تصحيح الأخطاء'
        : 'Please correct errors');
      return;
    }

    this.updatingJob = true;

    const updateData: UpdateCuttingJobData = {
      ...this.formData,
      file: this.selectedFile || undefined
    };

    this.cuttingService.updateCuttingJob(this.selectedJob.id, updateData).subscribe({
      next: (response) => {
        const successMsg = this.formLanguage === 'ar'
          ? 'تم تحديث مهمة القص بنجاح'
          : 'Cutting job updated successfully';
        this.showToast('success', successMsg);
        this.updatingJob = false;
        this.closeEditModal();
        this.loadCuttingJobs();
      },
      error: (error) => {
        console.error('Error updating cutting job:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء تحديث مهمة القص'
          : 'Error updating cutting job';
        this.showToast('error', errorMsg);
        this.updatingJob = false;
      }
    });
  }

  // ============================================
  // DELETE JOB
  // ============================================

  openDeleteModal(job: CuttingJob): void {
    this.selectedJob = job;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedJob = null;
  }

  confirmDelete(): void {
    if (!this.selectedJob) return;

    this.deletingJob = true;

    this.cuttingService.deleteCuttingJob(this.selectedJob.id).subscribe({
      next: (response) => {
        const successMsg = this.formLanguage === 'ar'
          ? 'تم حذف مهمة القص بنجاح'
          : 'Cutting job deleted successfully';
        this.showToast('success', successMsg);
        this.deletingJob = false;
        this.closeDeleteModal();
        this.loadCuttingJobs();
        this.loadStatistics();
      },
      error: (error) => {
        console.error('Error deleting cutting job:', error);
        const errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء حذف مهمة القص'
          : 'Error deleting cutting job';
        this.showToast('error', errorMsg);
        this.deletingJob = false;
      }
    });
  }

  // ============================================
  // TRACKING - FIXED IMPLEMENTATION
  // ============================================

  onJobSelected(): void {
    const job = this.cuttingJobs.find(j => j.id === this.trackingData.jobId);
    if (job) {
      this.selectedJob = job;
      // Reset the input to 0 when selecting a job (user enters NEW batch amount)
      this.trackingData.currentlyCut = 0;
    }
  }

  updateTracking(): void {
    if (!this.trackingData.jobId) {
      this.showToast('warning', this.formLanguage === 'ar'
        ? 'يرجى اختيار مهمة قص'
        : 'Please select a cutting job');
      return;
    }

    const job = this.cuttingJobs.find(j => j.id === this.trackingData.jobId);
    if (!job) return;

    // ✅ CALCULATE THE NEW TOTAL: existing cut + this batch
    const newTotalCut = (job.currentlyCut || 0) + this.trackingData.currentlyCut;

    // Validate that we're not exceeding the total quantity
    if (newTotalCut > job.quantity) {
      this.showToast('error', this.formLanguage === 'ar'
        ? `لا يمكن أن يتجاوز العدد المقصوص الكمية الإجمالية. المتبقي: ${job.quantity - (job.currentlyCut || 0)}`
        : `Cut amount cannot exceed total quantity. Remaining: ${job.quantity - (job.currentlyCut || 0)}`);
      return;
    }

    // Validate that the increment is non-negative
    if (this.trackingData.currentlyCut < 0) {
      this.showToast('error', this.formLanguage === 'ar'
        ? 'العدد المقصود يجب أن يكون صفر أو أكبر'
        : 'Cut quantity must be zero or greater');
      return;
    }

    this.updatingJob = true;

    // ✅ SEND THE NEW TOTAL to the backend (not the increment)
    const updateData: UpdateCuttingJobData = {
      currentlyCut: newTotalCut,
      fileStatus: this.trackingData.newStatus,
      notes: this.trackingData.notes || undefined
    };

    this.cuttingService.updateCuttingJob(this.trackingData.jobId, updateData).subscribe({
      next: (response) => {
        const successMsg = this.formLanguage === 'ar'
          ? `تم تحديث حالة القص بنجاح. تم قص ${newTotalCut} من ${job.quantity}`
          : `Cutting status updated successfully. Cut ${newTotalCut} of ${job.quantity}`;
        this.showToast('success', successMsg);
        this.updatingJob = false;
        this.backToList();
      },
      error: (error) => {
        console.error('Error updating tracking:', error);
        let errorMsg = this.formLanguage === 'ar'
          ? 'حدث خطأ أثناء تحديث حالة القص'
          : 'Error updating cutting status';

        // Show specific error message from backend if available
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        }

        this.showToast('error', errorMsg);
        this.updatingJob = false;
      }
    });
  }

  // ============================================
  // FILTERS
  // ============================================

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadCuttingJobs();
  }

  onSearchChange(): void {
    if (this.searchTerm.length >= 3 || this.searchTerm.length === 0) {
      this.currentPage = 1;
      this.loadCuttingJobs();
    }
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedMaterialType = '';
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.loadCuttingJobs();
  }

  // ============================================
  // PAGINATION
  // ============================================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadCuttingJobs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadCuttingJobs();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCuttingJobs();
    }
  }

  get paginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatDate(dateString: string): string {
    return this.cuttingService.formatDate(dateString);
  }

  getStatusLabel(status: string): string {
    return this.formLanguage === 'ar'
      ? this.cuttingService.getStatusLabel(status)
      : this.cuttingService.getStatusLabelEn(status);
  }

  getStatusColor(status: string): string {
    return this.cuttingService.getStatusColor(status);
  }

  getMaterialTypeLabel(materialType: string): string {
    const material = this.materialTypes.find(m => m.value === materialType);
    return material
      ? (this.formLanguage === 'ar' ? material.label : material.labelEn)
      : materialType;
  }

  calculateProgress(job: CuttingJob): number {
    if (!job || !job.quantity || job.quantity === 0) return 0;
    const currentlyCut = Number(job.currentlyCut) || 0;
    const progress = Math.round((currentlyCut / job.quantity) * 100);
    return Math.min(progress, 100);
  }

  getProgressColor(progress: number): string {
    if (progress === 0) return '#94a3b8';
    if (progress < 50) return '#ef4444';
    if (progress < 100) return '#f59e0b';
    return '#10b981';
  }

  getTodayDate(): string {
    return this.cuttingService.getTodayDate();
  }

  getFileIcon(fileName: string | null): string {
    if (!fileName) return 'bi-file-earmark';
    const ext = this.cuttingService.getFileExtension(fileName);
    const icons: { [key: string]: string } = {
      '.dwg': 'bi-file-earmark-code',
      '.dxf': 'bi-file-earmark-code',
      '.dwt': 'bi-file-earmark-code',
      '.nc': 'bi-file-earmark-binary',
      '.txt': 'bi-file-earmark-text'
    };
    return icons[ext] || 'bi-file-earmark';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  countJobsByStatus(status: string): number {
    return this.cuttingJobs.filter(j => j.fileStatus === status).length;
  }

  get Math() {
    return Math;
  }

  getUploadedByName(job: CuttingJob): string {
    if (job.uploadedByInfo) {
      return job.uploadedByInfo.name || job.uploadedByInfo.username;
    }
    return job.uploadedBy;
  }

  getLastUpdatedByName(job: CuttingJob): string {
    if (job.lastUpdatedByInfo) {
      return job.lastUpdatedByInfo.name || job.lastUpdatedByInfo.username;
    }
    return job.lastUpdatedBy || '-';
  }

  getCutByNames(job: CuttingJob): string {
    if (!job.cutByInfo || job.cutByInfo.length === 0) {
      return this.formLanguage === 'ar' ? 'لا أحد' : 'None';
    }
    return job.cutByInfo.map(user => user.name || user.username).join(', ');
  }

  getCutByCount(job: CuttingJob): number {
    return job.cutByInfo ? job.cutByInfo.length : 0;
  }

  getUserDisplayName(userId: string, job?: CuttingJob): string {
    if (!job) return userId;

    // Check uploadedByInfo
    if (job.uploadedByInfo && job.uploadedByInfo.id === userId) {
      return job.uploadedByInfo.name || job.uploadedByInfo.username;
    }

    // Check lastUpdatedByInfo
    if (job.lastUpdatedByInfo && job.lastUpdatedByInfo.id === userId) {
      return job.lastUpdatedByInfo.name || job.lastUpdatedByInfo.username;
    }

    // Check cutByInfo
    if (job.cutByInfo && Array.isArray(job.cutByInfo)) {
      const user = job.cutByInfo.find(u => u.id === userId);
      if (user) {
        return user.name || user.username;
      }
    }

    return userId;
  }
}
