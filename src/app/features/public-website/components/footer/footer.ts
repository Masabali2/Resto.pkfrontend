import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterColumn {
  title: string;
  links: { label: string; anchor?: string; route?: string }[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  readonly currentYear = new Date().getFullYear();

  readonly columns: FooterColumn[] = [
    {
      title: 'Product',
      links: [
        { label: 'Features', anchor: 'features' },
        { label: 'Templates', anchor: 'templates' },
        { label: 'Pricing', anchor: 'pricing' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'How it works', anchor: 'how-it-works' },
        { label: 'FAQ', anchor: 'faq' }
      ]
    },
    {
      title: 'Account',
      links: [
        { label: 'Log in', route: '/login' },
        { label: 'Create account', route: '/register' }
      ]
    }
  ];
}
