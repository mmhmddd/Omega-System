import { Component, inject, computed, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);

  // Signals for reactive state
  showLogoutModal = signal<boolean>(false);
  currentUser = signal<any>(null);

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

  ngOnInit() {
    // Subscribe to user changes from AuthService
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
    });

    // Initial load from stored user
    const storedUser = this.authService.getStoredUser();
    if (storedUser) {
      this.currentUser.set(storedUser);
    }
  }

  openLogoutModal() {
    this.showLogoutModal.set(true);
  }

  closeLogoutModal() {
    this.showLogoutModal.set(false);
  }

  confirmLogout() {
    this.showLogoutModal.set(false);
    this.authService.logout();
  }
}
