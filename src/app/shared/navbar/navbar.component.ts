import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
[x: string]: any;
  userName: string = 'أحمد محمد';
  userRole: string = 'مدير النظام';

  logout() {
    console.log('Logging out...');
    // Add your logout logic here
  }
}
