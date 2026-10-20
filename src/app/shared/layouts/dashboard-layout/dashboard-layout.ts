import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardSidebar } from '../../components/dashboard-sidebar/dashboard-sidebar';
import { DashboardHeader } from '../../components/dashboard-header/dashboard-header';

const MOBILE_BREAKPOINT = '(max-width: 900px)';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, DashboardSidebar, DashboardHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css'
})
export class DashboardLayout {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly drawerOpen = signal(false);
  protected readonly isMobile = signal(
    typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches
  );

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const query = window.matchMedia(MOBILE_BREAKPOINT);
    const onChange = (): void => {
      this.isMobile.set(query.matches);
      if (!query.matches) {
        this.drawerOpen.set(false);
      }
    };

    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }

  protected toggleDrawer(): void {
    const opening = !this.drawerOpen();
    this.drawerOpen.set(opening);

    if (opening) {
      window.setTimeout(() => document.getElementById('dashboard-nav')?.focus());
    }
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) {
      return;
    }

    this.drawerOpen.set(false);
    window.setTimeout(() => document.querySelector<HTMLElement>('.menu-toggle')?.focus());
  }

  protected onDrawerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDrawer();
    }
  }
}

