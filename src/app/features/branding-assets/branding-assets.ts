import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ActiveRestaurantStateService } from '../../core/services/active-restaurant-state.service';
import { BrandingAssetsService } from './services/branding-assets.service';
import { WebsiteService } from '../websites/services/website.service';
import { NotificationService } from '../../core/services/notification.service';
import type { BrandingTab } from './components/branding-tabs/branding-tabs';
import type {
  BrandingAsset,
  BrandingAssetType,
  BrandingConfiguration,
  BrandingTheme,
  BrandingTypography,
  HeroLayout,
  WebsiteBrandingSettings
} from './models/branding-assets.models';
import type { RestaurantDto } from '../../core/models/restaurant.model';

const DEFAULT_THEME: BrandingTheme = {
  primary: '#F97316',
  secondary: '#0F172A',
  tint: '#FFF7ED'
};

const DEFAULT_TYPOGRAPHY: BrandingTypography = {
  headingFont: 'plus-jakarta-sans',
  bodyFont: 'plus-jakarta-sans',
  fontScale: 100
};

const DEFAULT_HERO_LAYOUT: HeroLayout = 'split';

@Component({
  selector: 'app-branding-assets',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branding-assets.html',
  styleUrl: './branding-assets.css',
  host: {
    class: 'flex flex-col w-full'
  }
})
export class BrandingAssets {
  private readonly activeRestaurant = inject(ActiveRestaurantStateService);
  private readonly brandingService = inject(BrandingAssetsService);
  private readonly websiteService = inject(WebsiteService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly restaurant = this.activeRestaurant.restaurant;
  readonly websiteId = signal<string | null>(null);

  readonly assets = signal<BrandingAsset[]>([]);
  readonly theme = signal<BrandingTheme>({ ...DEFAULT_THEME });
  readonly typography = signal<BrandingTypography>({ ...DEFAULT_TYPOGRAPHY });
  readonly heroLayout = signal<HeroLayout>(DEFAULT_HERO_LAYOUT);

  readonly storage = signal<{ usedBytes: number; quotaBytes: number } | null>(null);

  readonly activeTab = signal<BrandingTab>('assets');
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly previewOpen = signal<boolean>(false);
  private readonly dirtySignal = signal<boolean>(false);

  /** Exposed so the existing unsaved-changes route guard can read dirty state. */
  get form() {
    return { dirty: this.dirtySignal() };
  }

  readonly logoAsset = computed(() =>
    this.assets().find(a => a.assetType === 'Logo')
  );
  readonly heroBannerAsset = computed(() =>
    this.assets().find(a => a.assetType === 'HeroBanner')
  );

  constructor() {
    effect(() => {
      const restaurant = this.restaurant();
      if (!restaurant) {
        this.reset();
        return;
      }
      this.loadBranding(restaurant.id);
    });
  }

  private reset(): void {
    this.websiteId.set(null);
    this.assets.set([]);
    this.theme.set({ ...DEFAULT_THEME });
    this.typography.set({ ...DEFAULT_TYPOGRAPHY });
    this.heroLayout.set(DEFAULT_HERO_LAYOUT);
    this.storage.set(null);
    this.loading.set(false);
  }

  private loadBranding(restaurantId: string): void {
    this.loading.set(true);

    this.brandingService
      .loadAssets(restaurantId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: loadedAssets => {
          this.assets.set(loadedAssets);
        },
        error: err => {
          this.notification.error(err instanceof Error ? err.message : 'Failed to load branding assets.');
          this.assets.set([]);
        }
      });

    this.brandingService.getStorageInfo(restaurantId).subscribe(info => {
      this.storage.set(info ?? null);
    });

    this.resolveWebsiteId(restaurantId);
  }

  private resolveWebsiteId(restaurantId: string): void {
    this.websiteService.getWebsites(1, 20).subscribe({
      next: response => {
        const website = response.success && response.data
          ? (response.data.items as { id: string; restaurantId: string }[]).find(
              w => w.restaurantId === restaurantId
            )
          : null;
        this.websiteId.set(website?.id ?? null);
        if (website) {
          this.loadSavedConfiguration(website.id);
        }
      },
      error: () => {
        this.websiteId.set(null);
      }
    });
  }

  private loadSavedConfiguration(websiteId: string): void {
    this.websiteService.getDraft(websiteId).subscribe({
      next: response => {
        if (!response.success || !response.data?.configurationJson) {
          return;
        }
        try {
          const config: BrandingConfiguration = JSON.parse(response.data.configurationJson);
          this.applySavedConfig(config);
        } catch {
          // Ignore malformed draft; defaults remain.
        }
      },
      error: () => {
        // Draft may not exist yet; defaults remain.
      }
    });
  }

  private applySavedConfig(config: BrandingConfiguration): void {
    if (config.theme) {
      this.theme.set({
        primary: typeof config.theme.primary === 'string' ? config.theme.primary : DEFAULT_THEME.primary,
        secondary: typeof config.theme.secondary === 'string' ? config.theme.secondary : DEFAULT_THEME.secondary,
        tint: typeof config.theme.tint === 'string' ? config.theme.tint : DEFAULT_THEME.tint
      });
    }
    if (config.typography) {
      this.typography.set({
        headingFont: config.typography.headingFont ?? DEFAULT_TYPOGRAPHY.headingFont,
        bodyFont: config.typography.bodyFont ?? DEFAULT_TYPOGRAPHY.bodyFont,
        fontScale: typeof config.typography.fontScale === 'number' ? config.typography.fontScale : DEFAULT_TYPOGRAPHY.fontScale
      });
    }
    if (typeof config.heroLayout === 'string') {
      this.heroLayout.set(config.heroLayout);
    }
    // Asset references are stored as assetType -> assetId in the draft. The
    // live asset objects are loaded independently from the assets endpoint,
    // so no rehydration of the asset list is required here.
  }

  switchTab(tab: BrandingTab): void {
    this.activeTab.set(tab);
  }

  onThemeChange(theme: BrandingTheme): void {
    this.theme.set(theme);
    this.dirtySignal.set(true);
  }

  onTypographyChange(typography: BrandingTypography): void {
    this.typography.set(typography);
    this.dirtySignal.set(true);
  }

  onHeroLayoutChange(layout: HeroLayout): void {
    this.heroLayout.set(layout);
    this.dirtySignal.set(true);
  }

  onAssetsChange(assets: BrandingAsset[]): void {
    this.assets.set(assets);
    this.dirtySignal.set(true);
  }

  openPreview(): void {
    this.previewOpen.set(true);
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  saveAll(): void {
    const website = this.websiteId();
    if (!website) {
      this.notification.info('No website exists for this restaurant yet. Create one in the Website Editor to publish branding settings.');
      return;
    }

    this.saving.set(true);
    const settings: WebsiteBrandingSettings = {
      theme: this.theme(),
      typography: this.typography(),
      heroLayout: this.heroLayout(),
      assets: Object.fromEntries(
        this.assets().map(a => [a.assetType, a.id])
      ) as Partial<Record<BrandingAssetType, string>>
    };

    this.brandingService
      .saveConfiguration(website, settings)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.dirtySignal.set(false);
          this.notification.success('Branding assets & swatches saved to API.');
        },
        error: err => {
          this.notification.error(err instanceof Error ? err.message : 'Failed to save branding.');
        }
      });
  }
}
