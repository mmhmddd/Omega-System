import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SideBarComponent } from "./shared/side-bar/side-bar.component";
import { NavbarComponent } from "./shared/navbar/navbar.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SideBarComponent,
    NavbarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Omega-System';
  showLayout = true;

  // Define routes where layout should be HIDDEN
  private readonly noLayoutRoutes: string[] = [
    '/login',
    '/reset-password',
    '/forgot-password',     // ← add if you have this one
    '/reset-password/:token' // ← if you use parameterized route
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects.split('?')[0].split('#')[0];

      // Option A: exact match (cleanest & most readable)
      this.showLayout = !this.noLayoutRoutes.includes(url);

      // Option B: if you prefer substring / prefix style (more flexible)
      // this.showLayout = !['/login', '/reset-password'].some(route => url.startsWith(route));
    });

    // Optional: run once on app start (in case of direct link / refresh)
    this.updateLayout(this.router.url);
  }

  // Helper method (useful for initial load)
  private updateLayout(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.showLayout = !this.noLayoutRoutes.includes(cleanUrl);
  }
}
