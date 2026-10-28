import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { MenuItemDto } from '../../../menu/models/menu-item.model';
import type { RestaurantDto } from '../../../../core/models/restaurant.model';
import type { WebsiteConfig, WebsiteSectionConfig } from '../../models/website-config.model';
import type { WebsiteTemplateCatalogueItem } from '../../models/website-template-catalogue.model';
import {
  fontOptions,
  isValidHexColor,
  isSupportedFont,
  THEME_COLOR_FIELDS,
  type ThemeColorField
} from '../../utils/website-config.util';
import { ImageUploadComponent } from '../../../../shared/components/image-upload/image-upload.component';
import type {
  AssetUploadResult,
  RestaurantLogoDestination,
  UploadDestination,
  WebsiteSectionDestination
} from '../../models/image-upload.model';

export type ThemeChange =
  | { kind: 'color'; field: ThemeColorField; value: string }
  | { kind: 'font'; value: string };

export type SectionConfigChange = {
  sectionType: string;
  settings: Record<string, unknown>;
};

export type TemplateChange = {
  templateId: string;
  templateKey: string;
};

export type FeaturedDishesChange = {
  itemIds: string[];
};

const COLOR_LABELS: Record<ThemeColorField, string> = {
  primary: 'Primary color',
  secondary: 'Secondary color',
  accent: 'Accent color',
  background: 'Background color',
  text: 'Text color'
};

const FALLBACK_COLORS: Record<ThemeColorField, string> = {
  primary: '#b3261e',
  secondary: '#7a5900',
  accent: '#ff8f00',
  background: '#ffffff',
  text: '#1c1b1f'
};

interface AccordionSection {
  id: string;
  title: string;
  icon: string;
  open: boolean;
}

@Component({
  selector: 'app-editor-settings-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-settings-panel.html',
  styleUrl: './editor-settings-panel.css',
  imports: [ImageUploadComponent]
})
export class EditorSettingsPanel {
  readonly config = input.required<WebsiteConfig>();
  readonly restaurant = input<RestaurantDto | null>(null);
  /** Website id used to build the server-authorized upload destination. */
  readonly websiteId = input<string | null>(null);
  readonly menuItems = input<readonly MenuItemDto[]>([]);
  readonly templates = input<readonly WebsiteTemplateCatalogueItem[]>([]);
  readonly currentTemplateId = input<string | null>(null);

  readonly themeChange = output<ThemeChange>();
  readonly sectionConfigChange = output<SectionConfigChange>();
  readonly templateChange = output<TemplateChange>();
  readonly featuredDishesChange = output<FeaturedDishesChange>();
  /** Emitted when a restaurant logo image is uploaded. */
  readonly logoChange = output<string>();

  protected readonly colorFields = THEME_COLOR_FIELDS;
  protected readonly fontChoices = fontOptions();

  protected readonly colorLabel = (field: ThemeColorField): string => COLOR_LABELS[field];

  protected readonly colorValue = computed(() => {
    const colors = this.config().theme.colors ?? {};

    return (field: ThemeColorField): string => {
      const raw = colors[field];
      return isValidHexColor(raw) ? raw : FALLBACK_COLORS[field];
    };
  });

  protected readonly fontValue = computed((): string => {
    const raw = this.config().theme.font;
    return isSupportedFont(raw) ? raw : 'system-ui';
  });

  protected readonly sections = signal<AccordionSection[]>([
    { id: 'hero', title: 'Hero Banner', icon: '🎯', open: true },
    { id: 'gallery', title: 'Gallery', icon: '🖼️', open: false },
    { id: 'branding', title: 'Branding & Logo', icon: '🏷️', open: false },
    { id: 'theme', title: 'Theme & Design', icon: '🎨', open: false },
    { id: 'featured-dishes', title: 'Featured Dishes', icon: '🍽️', open: false },
    { id: 'contact', title: 'Contact & Hours', icon: '📍', open: false },
    { id: 'story', title: 'Restaurant Story', icon: '📖', open: false },
    { id: 'template', title: 'Template', icon: '📐', open: false }
  ]);

  protected readonly heroSection = computed<WebsiteSectionConfig | null>(() =>
    this.config().sections.find(s => s.type === 'hero') ?? null
  );

  protected readonly gallerySection = computed<WebsiteSectionConfig | null>(() =>
    this.config().sections.find(s => s.type === 'gallery') ?? null
  );

  protected readonly menuPreviewSection = computed<WebsiteSectionConfig | null>(() =>
    this.config().sections.find(s => s.type === 'menu-preview') ?? null
  );

  protected readonly aboutSection = computed<WebsiteSectionConfig | null>(() =>
    this.config().sections.find(s => s.type === 'about') ?? null
  );

  protected readonly heroImageAssetId = computed<string | null>(() =>
    (this.heroSection()?.settings?.['imageUrl'] as string | null) ?? null
  );

  protected readonly aboutImageAssetId = computed<string | null>(() =>
    (this.aboutSection()?.settings?.['imageUrl'] as string | null) ?? null
  );

  protected readonly galleryAssetIds = computed<string[]>(() => {
    const value = this.gallerySection()?.settings?.['galleryImageIds'];
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  });

  protected readonly logoAssetId = computed<string | null>(() =>
    (this.config().settings?.['logoAssetId'] as string | null) ?? null
  );

  protected readonly contactSection = computed<WebsiteSectionConfig | null>(() =>
    this.config().sections.find(s => s.type === 'contact') ?? null
  );

  protected readonly hoursSection = computed<WebsiteSectionConfig | null>(() =>
    this.config().sections.find(s => s.type === 'hours') ?? null
  );

  protected readonly featuredItemIds = computed<string[]>(() => {
    const menuSection = this.menuPreviewSection();
    const items = menuSection?.settings?.['featuredItemIds'];
    return Array.isArray(items) ? items.filter((id): id is string => typeof id === 'string') : [];
  });

  protected readonly availableMenuItems = computed(() =>
    this.menuItems().filter(item => item.isActive && item.isAvailable)
  );

  protected readonly selectedTemplate = computed(() =>
    this.templates().find(t => t.template.id === this.currentTemplateId()) ?? null
  );

  protected readonly weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  protected toggleSection(sectionId: string): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, open: !s.open } : s)
    );
  }

  protected onColorInput(field: ThemeColorField, value: string): void {
    if (isValidHexColor(value)) {
      this.themeChange.emit({ kind: 'color', field, value });
    }
  }

  protected onFontChange(value: string): void {
    if (isSupportedFont(value)) {
      this.themeChange.emit({ kind: 'font', value });
    }
  }

  protected updateHeroSetting(key: string, value: string): void {
    const section = this.heroSection();
    if (!section) return;

    const newSettings = { ...section.settings, [key]: value };
    this.sectionConfigChange.emit({ sectionType: 'hero', settings: newSettings });
  }

  protected updateAboutSetting(key: string, value: string): void {
    const section = this.aboutSection();
    if (!section) return;

    const newSettings = { ...section.settings, [key]: value };
    this.sectionConfigChange.emit({ sectionType: 'about', settings: newSettings });
  }

  protected updateContactSetting(key: string, value: string): void {
    const section = this.contactSection();
    if (!section) return;

    const newSettings = { ...section.settings, [key]: value };
    this.sectionConfigChange.emit({ sectionType: 'contact', settings: newSettings });
  }

  protected updateHoursSetting(key: string, value: string): void {
    const section = this.hoursSection();
    if (!section) return;

    const newSettings = { ...section.settings, [key]: value };
    this.sectionConfigChange.emit({ sectionType: 'hours', settings: newSettings });
  }

  /**
   * Builds the server-authorized upload destination for a website draft
   * section. The website id and tenant are resolved server-side; the client
   * only supplies the section type and setting key.
   */
  protected buildWebsiteSectionDestination(
    sectionType: 'hero' | 'about' | 'gallery',
    settingKey: string
  ): WebsiteSectionDestination | null {
    const websiteId = this.websiteId();
    if (!websiteId) return null;

    return {
      kind: 'website-section',
      websiteId,
      sectionType,
      settingKey
    };
  }

  protected buildRestaurantLogoDestination(): RestaurantLogoDestination | null {
    const restaurantId = this.restaurant()?.id;
    if (!restaurantId) return null;

    return { kind: 'restaurant-logo', restaurantId };
  }

protected onHeroImageUploaded(results: AssetUploadResult[]): void {
  const result = results[0];
  if (!result) return;

  this.updateHeroSetting('imageUrl', result.assetId);
}

protected onAboutImageUploaded(results: AssetUploadResult[]): void {
  const result = results[0];
  if (!result) return;

  this.updateAboutSetting('imageUrl', result.assetId);
}

protected onGalleryImageUploaded(results: AssetUploadResult[]): void {
  const section = this.gallerySection();
  if (!section || results.length === 0) return;

  const current = this.galleryAssetIds();
  const uploadedIds = results.map(result => result.assetId);
  const next = [...current, ...uploadedIds.filter(id => !current.includes(id))];

  if (next.length === current.length) return;

  this.sectionConfigChange.emit({
    sectionType: 'gallery',
    settings: {
      ...section.settings,
      galleryImageIds: next
    }
  });
}

protected onLogoImageUploaded(results: AssetUploadResult[]): void {
  const result = results[0];
  if (!result) return;

  this.logoChange.emit(result.assetId);
}


  protected toggleFeaturedItem(itemId: string): void {
    const current = this.featuredItemIds();
    const isSelected = current.includes(itemId);

    let newIds: string[];
    if (isSelected) {
      newIds = current.filter(id => id !== itemId);
    } else {
      if (current.length >= 3) return;
      newIds = [...current, itemId];
    }

    this.featuredDishesChange.emit({ itemIds: newIds });
  }

  protected isItemSelected(itemId: string): boolean {
    return this.featuredItemIds().includes(itemId);
  }

  protected getItemPrice(item: MenuItemDto): string {
    return `${item.currency} ${item.price.toFixed(2)}`;
  }

  protected selectTemplate(templateId: string, templateKey: string): void {
    this.templateChange.emit({ templateId, templateKey });
  }

  protected getTemplateImageUrl(template: WebsiteTemplateCatalogueItem): string | null {
    return template.template.previewImageFileId
      ? `/api/v1/files/${template.template.previewImageFileId}`
      : null;
  }

  protected getDefaultAddress(): string {
    const r = this.restaurant();
    if (!r) return '';
    const parts = [r.addressLine1, r.addressLine2, r.city, r.country].filter(Boolean);
    return parts.join(', ');
  }

  protected getHoursValue(day: string): string {
    const section = this.hoursSection();
    if (!section) return '';
    const hours = section.settings?.['hours'] as Record<string, string> | undefined;
    return hours?.[day.toLowerCase()] ?? '';
  }
}