import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';

interface NavLink {
  label: string;
  anchor: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, Button],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  readonly navLinks: NavLink[] = [
    { label: 'Templates', anchor: 'templates' },
    { label: 'Features', anchor: 'features' },
    { label: 'How It Works', anchor: 'how-it-works' },
    { label: 'Pricing', anchor: 'pricing' }
  ];

  readonly mobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
