
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';

const MOBILE_BREAKPOINT = '(max-width: 900px)';

@Component({
  selector: 'app-shared-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, Sidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shared-layout.html',
  styleUrl: './shared-layout.css'
})
export class SharedLayout {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly isMobile = signal(
    typeof window !== 'undefined' &&
      window.matchMedia(MOBILE_BREAKPOINT).matches
  );

  protected readonly contentShift = computed(() => {
    if (this.isMobile()) {
      return '0px';
    }

    return this.collapsed() ? '76px' : '264px';
  });

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const query = window.matchMedia(MOBILE_BREAKPOINT);

    const onChange = (): void => {
      this.isMobile.set(query.matches);
      this.mobileOpen.set(false);
    };

    query.addEventListener('change', onChange);

    this.destroyRef.onDestroy(() => {
      query.removeEventListener('change', onChange);
    });
  }

  protected onMenuClick(): void {
    if (this.isMobile()) {
      this.openMobile();
      return;
    }

    this.collapsed.update(collapsed => !collapsed);
  }

  protected onCollapseToggle(): void {
    if (!this.isMobile()) {
      this.collapsed.update(collapsed => !collapsed);
    }
  }

  protected openMobile(): void {
    this.mobileOpen.set(true);
  }

  protected closeMobile(): void {
    if (!this.mobileOpen()) {
      return;
    }

    this.mobileOpen.set(false);

    if (typeof document !== 'undefined') {
      window.setTimeout(() => {
        document.querySelector<HTMLElement>('.menu-toggle')?.focus();
      });
    }
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMobile();
    }
  }
}
