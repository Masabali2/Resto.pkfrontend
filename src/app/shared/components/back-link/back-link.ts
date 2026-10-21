
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'app-back-link',
  standalone: true,
  imports: [RouterLink, LucideArrowLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './back-link.html',
  styleUrl: './back-link.css'
})
export class BackLink {
  readonly label = input('Go back');
  readonly route = input<string | any[]>('/dashboard');
  readonly queryParams = input<Record<string, string | number | boolean> | null>(null);
}
