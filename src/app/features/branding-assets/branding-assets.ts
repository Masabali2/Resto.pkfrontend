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
import { BrandingHeader } from './components/branding-header/branding-header';
import { BrandingTabs } from './components/branding-tabs/branding-tabs';
import { AssetManagement } from './components/asset-management/asset-management';
import { BrandColors } from './components/brand-colors/brand-colors';
import { TypographySettings } from './components/typography-settings/typography-settings';
import { HeroLayoutSettings } from './components/hero-layout-settings/hero-layout-settings';
import { MediaLibrary } from './components/media-library/media-library';
import { WebsitePreviewModal } from './components/website-preview-modal/website-preview-modal';
import type { BrandingTab } from './components/branding-tabs/branding-tabs';
import type {
  BrandingAsset,
  BrandingAssetType,
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

type SavedConfig = {
  theme?: {
    colors?: {
      primary?: string;
      secondary?: string;
      tint?: string;
    };
  };
  settings?: {
    typography?: {
      headingFont?: string;
      bodyFont?: string;
      fontScale?: number;
    };
    heroLayout?: string;
  };
};

@Component({
  selector: 'app-branding-assets',
  standalone: true,
  imports: [
    BrandingHeader,
    BrandingTabs,
    AssetManagement,
    BrandColors,
    TypographySettings,
    HeroLayoutSettings,
    MediaLibrary,
    WebsitePreviewModal
  ],
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

  readonly storage = signal<{ usedBytes: number; quotaBytes: number | null } | null>(null);

  readonly activeTab = signal<BrandingTab>('assets');
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly previewOpen = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  /** Exposed so the existing unsaved-changes route guard can read dirty state. */
  get form() {
    return { dirty: this.dirty() };
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
          const config: SavedConfig = JSON.parse(response.data.configurationJson);
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

  private applySavedConfig(config: SavedConfig): void {
    if (config.theme?.colors) {
      this.theme.set({
        primary: typeof config.theme.colors.primary === 'string'
          ? config.theme.colors.primary
          : DEFAULT_THEME.primary,
        secondary: typeof config.theme.colors.secondary === 'string'
          ? config.theme.colors.secondary
          : DEFAULT_THEME.secondary,
        tint: typeof config.theme.colors.tint === 'string'
          ? config.theme.colors.tint
          : DEFAULT_THEME.tint
      });
    }
    if (config.settings?.typography) {
      this.typography.set({
        headingFont: typeof config.settings.typography.headingFont === 'string'
          ? config.settings.typography.headingFont
          : DEFAULT_TYPOGRAPHY.headingFont,
        bodyFont: typeof config.settings.typography.bodyFont === 'string'
          ? config.settings.typography.bodyFont
          : DEFAULT_TYPOGRAPHY.bodyFont,
        fontScale: typeof config.settings.typography.fontScale === 'number'
          ? config.settings.typography.fontScale
          : DEFAULT_TYPOGRAPHY.fontScale
      });
    }
    if (typeof config.settings?.heroLayout === 'string') {
      this.heroLayout.set(config.settings.heroLayout as HeroLayout);
    }
    // Asset references live in settings.assets of the draft but the live asset
    // objects are loaded independently from the assets endpoint, so no
    // rehydration of the asset list is required here.
  }

  switchTab(tab: BrandingTab): void {
    this.activeTab.set(tab);
  }

  onThemeChange(theme: BrandingTheme): void {
    this.theme.set(theme);
    this.dirty.set(true);
  }

  onTypographyChange(typography: BrandingTypography): void {
    this.typography.set(typography);
    this.dirty.set(true);
  }

  onHeroLayoutChange(layout: HeroLayout): void {
    this.heroLayout.set(layout);
    this.dirty.set(true);
  }

  onAssetsChange(assets: BrandingAsset[]): void {
    this.assets.set(assets);
    this.dirty.set(true);
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
          this.dirty.set(false);
          this.notification.success('Branding assets & swatches saved to API.');
        },
        error: err => {
          this.notification.error(err instanceof Error ? err.message : 'Failed to save branding.');
        }
      });
  }
}
