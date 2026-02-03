import { Component, inject, computed, signal, OnInit, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SecretariatUserService, Notification } from '../../core/services/secretariat-user.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private secretariatUserService = inject(SecretariatUserService);
  private router = inject(Router);

  // Signals for reactive state
  showLogoutModal = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Notifications
  notifications = signal<Notification[]>([]);
  showNotificationsPanel = signal<boolean>(false);
  unreadCount = signal<number>(0);

  private notificationSubscription?: Subscription;
  private pollingSubscription?: Subscription;

  // Computed values from the signal
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

  // Check if user can see notifications
  canSeeNotifications = computed(() => {
    const user = this.currentUser();
    return user?.role === 'super_admin' || user?.role === 'secretariat';
  });

  ngOnInit() {
    // Subscribe to user changes from AuthService
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);

      // Load notifications if user has permission
      if (user && (user.role === 'super_admin' || user.role === 'secretariat')) {
        this.loadNotifications();
        this.startNotificationPolling();
      } else {
        this.stopNotificationPolling();
      }
    });

    // Initial load from stored user
    const storedUser = this.authService.getStoredUser();
    if (storedUser) {
      this.currentUser.set(storedUser);

      if (storedUser.role === 'super_admin' || storedUser.role === 'secretariat') {
        this.loadNotifications();
        this.startNotificationPolling();
      }
    }
  }

  ngOnDestroy() {
    this.stopNotificationPolling();
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  // ============================================
  // NOTIFICATION MANAGEMENT
  // ============================================

  loadNotifications() {
    this.notificationSubscription = this.secretariatUserService.getNotifications().subscribe({
      next: (response) => {
        this.notifications.set(response.data);
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  startNotificationPolling() {
    // Poll for new notifications every 30 seconds
    this.pollingSubscription = interval(30000)
      .pipe(
        switchMap(() => this.secretariatUserService.getNotifications())
      )
      .subscribe({
        next: (response) => {
          this.notifications.set(response.data);
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error polling notifications:', error);
        }
      });
  }

  stopNotificationPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  updateUnreadCount() {
    const unread = this.notifications().filter(n => !n.isRead).length;
    this.unreadCount.set(unread);
  }

  toggleNotificationsPanel() {
    this.showNotificationsPanel.update(val => !val);
  }

  closeNotificationsPanel() {
    this.showNotificationsPanel.set(false);
  }

  markAsRead(notification: Notification) {
    // Close the notifications panel first
    this.closeNotificationsPanel();

    // Mark as read
    if (!notification.isRead) {
      this.secretariatUserService.markNotificationAsRead(notification.id).subscribe({
        next: () => {
          // Update local state
          const updatedNotifications = this.notifications().map(n =>
            n.id === notification.id ? { ...n, isRead: true } : n
          );
          this.notifications.set(updatedNotifications);
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
    }

    // Open the PDF directly
    this.openFormPDF(notification);
  }

  openFormPDF(notification: Notification) {
    const formId = notification.formId;

    if (!formId) {
      console.error('No form ID found in notification');
      return;
    }

    // Download and open the PDF
    this.secretariatUserService.downloadPDF(formId).subscribe({
      next: (blob) => {
        // Create a blob URL
        const url = window.URL.createObjectURL(blob);

        // Open PDF in a new tab
        window.open(url, '_blank');

        // Clean up the blob URL after a short delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      },
      error: (error) => {
        console.error('Error opening PDF:', error);
        alert('حدث خطأ في فتح الملف. يرجى المحاولة مرة أخرى.');
      }
    });
  }

  markAllAsRead() {
    this.secretariatUserService.markAllNotificationsAsRead().subscribe({
      next: () => {
        // Update local state
        const updatedNotifications = this.notifications().map(n => ({ ...n, isRead: true }));
        this.notifications.set(updatedNotifications);
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  getNotificationTime(dateString: string): string {
    return this.secretariatUserService.formatNotificationTime(dateString);
  }

  getNotificationIcon(formType: string): string {
    return this.secretariatUserService.getFormTypeIcon(formType);
  }

  getNotificationColor(formType: string): string {
    return this.secretariatUserService.getFormTypeColor(formType);
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
    this.stopNotificationPolling();
    this.authService.logout();
  }
}
