import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

export type BrandingTab = 'assets' | 'colors' | 'typography' | 'hero' | 'library';

const BRANDING_TABS: readonly { id: BrandingTab; label: string; icon: string }[] = [
  { id: 'assets', label: 'Logos & Asset Types', icon: 'bi-images' },
  { id: 'colors', label: 'Brand Colors & Themes', icon: 'bi-palette-fill' },
  { id: 'typography', label: 'Typography & Fonts', icon: 'bi-fonts' },
  { id: 'hero', label: 'Hero Section Layout', icon: 'bi-sliders' },
  { id: 'library', label: 'Media Library & Storage', icon: 'bi-folder2-open' }
];

@Component({
  selector: 'app-branding-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branding-tabs.html',
  styleUrl: './branding-tabs.css'
})
export class BrandingTabs {
  readonly activeTab = input<BrandingTab>('assets');

  readonly tabSelected = output<BrandingTab>();

  protected readonly tabs = BRANDING_TABS;

  protected isActive(tab: BrandingTab): boolean {
    return this.activeTab() === tab;
  }

  protected selectTab(tab: BrandingTab): void {
    this.tabSelected.emit(tab);
  }

  protected tabClass(tab: BrandingTab): string {
    const active = this.isActive(tab);
    return [
      'branding-tab py-3 px-4 text-xs font-bold flex items-center gap-2 flex-shrink-0 border-bottom',
      active
        ? 'branding-tab-active text-orange border-orange'
        : 'text-muted hover:text-dark transition-colors border-transparent'
    ].join(' ');
  }
}
