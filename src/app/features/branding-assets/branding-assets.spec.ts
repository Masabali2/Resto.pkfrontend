import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandingAssets } from './branding-assets';
import { ActiveRestaurantStateService } from '../../core/services/active-restaurant-state.service';
import { BrandingAssetsService } from './services/branding-assets.service';
import { WebsiteService } from '../websites/services/website.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import type { BrandingTheme, BrandingTypography, BrandingAsset } from './models/branding-assets.models';
import type { BrandingTab } from './components/branding-tabs/branding-tabs';
import type { RestaurantDto } from '../../core/models/restaurant.model';

const mockActiveRestaurantState = {
  restaurant: vi.fn(() => null as RestaurantDto | null)
};
const mockBrandingAssetsService = {
  loadAssets: vi.fn(() => of([])),
  getStorageInfo: vi.fn(() => of(null)),
  saveConfiguration: vi.fn(() => of(null))
};
const mockWebsiteService = {
  getWebsites: vi.fn(() => of({ success: true, data: { items: [] } })),
  getDraft: vi.fn(() => of({ success: true, data: { configurationJson: null } })),
  saveDraft: vi.fn(() => of(null))
};
const mockNotificationService = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn()
};
const mockRouter = {};

describe('BrandingAssets', () => {
  let component: BrandingAssets;
  let fixture: ComponentFixture<BrandingAssets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandingAssets],
      providers: [
        { provide: ActiveRestaurantStateService, useValue: mockActiveRestaurantState },
        { provide: BrandingAssetsService, useValue: mockBrandingAssetsService },
        { provide: WebsiteService, useValue: mockWebsiteService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandingAssets);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default signals', () => {
    expect(component.activeTab()).toBe('assets');
    expect(component.loading()).toBe(false);
    expect(component.saving()).toBe(false);
    expect(component.previewOpen()).toBe(false);
    expect(component.dirty()).toBe(false);
    expect(component.form.dirty).toBe(false);
    expect(component.websiteId()).toBeNull();
  });

  it('switchTab should set activeTab', () => {
    component.switchTab('colors');
    expect(component.activeTab()).toBe('colors');
    component.switchTab('library');
    expect(component.activeTab()).toBe('library');
  });

  it('onThemeChange should set theme and mark dirty', () => {
    const theme: BrandingTheme = { primary: '#FF0000', secondary: '#000', tint: '#fff' };
    component.onThemeChange(theme);
    expect(component.theme()).toEqual(theme);
    expect(component.dirty()).toBe(true);
    expect(component.form.dirty).toBe(true);
  });

  it('onTypographyChange should set typography and mark dirty', () => {
    const typography: BrandingTypography = { headingFont: 'outfit', bodyFont: 'inter', fontScale: 110 };
    component.onTypographyChange(typography);
    expect(component.typography()).toEqual(typography);
    expect(component.dirty()).toBe(true);
  });

  it('onHeroLayoutChange should set layout and mark dirty', () => {
    component.onHeroLayoutChange('overlay');
    expect(component.heroLayout()).toBe('overlay');
    expect(component.dirty()).toBe(true);
  });

  it('onAssetsChange should set assets and mark dirty', () => {
    const asset: BrandingAsset = {
      id: 'a1',
      assetType: 'Logo',
      fileName: 'logo.png',
      contentType: 'image/png',
      fileSize: 100,
      storageKey: 'k1',
      previewUrl: 'http://x/logo.png',
      created: '2026-01-01',
      isReferenced: false
    };
    component.onAssetsChange([asset]);
    expect(component.assets()).toEqual([asset]);
    expect(component.dirty()).toBe(true);
  });

  it('openPreview / closePreview should toggle previewOpen', () => {
    component.openPreview();
    expect(component.previewOpen()).toBe(true);
    component.closePreview();
    expect(component.previewOpen()).toBe(false);
  });

  it('saveAll with no websiteId should notify and return early', () => {
    (component as any).websiteId.set(null);
    component.saveAll();
    expect(mockNotificationService.info).toHaveBeenCalled();
    expect(component.saving()).toBe(false);
    expect(mockBrandingAssetsService.saveConfiguration).not.toHaveBeenCalled();
  });

  it('BrandingTab type should include all tabs', () => {
    const tabs: BrandingTab[] = ['assets', 'colors', 'typography', 'hero', 'library'];
    expect(tabs).toHaveLength(5);
  });
});
