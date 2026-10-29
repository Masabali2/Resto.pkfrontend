import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { HERO_LAYOUTS } from '../../models/branding-assets.models';
import type { HeroLayout } from '../../models/branding-assets.models';

@Component({
  selector: 'app-hero-layout-settings',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-layout-settings.html',
  styleUrl: './hero-layout-settings.css'
})
export class HeroLayoutSettings {
  readonly heroLayout = input<HeroLayout>('split');

  readonly heroLayoutChange = output<HeroLayout>();

  readonly layouts = HERO_LAYOUTS;

  private readonly layoutSignal = signal<HeroLayout>('split');

  readonly layout = computed(() => this.layoutSignal());

  constructor() {
    effect(() => {
      this.layoutSignal.set(this.heroLayout());
    });
  }

  selectLayout(value: HeroLayout): void {
    this.layoutSignal.set(value);
    this.heroLayoutChange.emit(value);
  }

  isActive(value: HeroLayout): boolean {
    return this.layoutSignal() === value;
  }

  layoutClass(value: HeroLayout): string {
    const active = this.isActive(value);
    return [
      'hero-layout-card p-3 rounded-3xl border border-subtle bg-white cursor-pointer transition-all',
      active ? 'hero-layout-active border-orange bg-orange-soft shadow-sm' : 'hover:border-slate-300 hover:text-dark'
    ].join(' ');
  }

  protected iconFor(value: HeroLayout): string {
    switch (value) {
      case 'split': return 'bi-layout-sidebar';
      case 'overlay': return 'bi-image-fill';
      case 'compact': return 'bi-layout-text-window';
    }
    return 'bi-layout-sidebar';
  }
}
