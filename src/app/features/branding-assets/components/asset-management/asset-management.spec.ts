import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetManagement } from './asset-management';
import { BrandingAssetsService } from '../../services/branding-assets.service';
import { NotificationService } from '../../../../core/services/notification.service';
import type { BrandingAsset, BrandingAssetType } from '../../models/branding-assets.models';

const mockBrandingAssetsService = {
  uploadAsset: vi.fn(() => null as unknown),
  deleteAsset: vi.fn(() => null as unknown),
  getStorageInfo: vi.fn(() => null as unknown)
};
const mockNotificationService = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn()
};

describe('AssetManagement', () => {
  let component: AssetManagement;
  let fixture: ComponentFixture<AssetManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetManagement],
      providers: [
        { provide: BrandingAssetsService, useValue: mockBrandingAssetsService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose all five asset slots', () => {
    expect((component as any).slots.map((s: { assetType: BrandingAssetType }) => s.assetType)).toEqual([
      'Logo',
      'DarkLogo',
      'Favicon',
      'OGBanner',
      'HeroBanner'
    ]);
  });

  it('isDarkSlot should return true only for DarkLogo', () => {
    expect((component as any).isDarkSlot('DarkLogo')).toBe(true);
    expect((component as any).isDarkSlot('Logo')).toBe(false);
    expect((component as any).isDarkSlot('Favicon')).toBe(false);
  });

  it('slotPlaceholderInitials should return short initials per slot', () => {
    expect((component as any).slotPlaceholderInitials('Logo')).toBe('ML');
    expect((component as any).slotPlaceholderInitials('DarkLogo')).toBe('DL');
    expect((component as any).slotPlaceholderInitials('HeroBanner')).toBe('HB');
  });

  it('assetBadgeClass should return dark badge for DarkLogo', () => {
    expect((component as any).assetBadgeClass('DarkLogo')).toContain('asset-badge-dark');
    expect((component as any).assetBadgeClass('Logo')).toContain('asset-badge-default');
    expect((component as any).assetBadgeClass('Favicon')).toContain('asset-badge-default');
  });

  it('defaultFileName should return a file name per asset type', () => {
    expect((component as any).defaultFileName('Logo')).toBe('logo.png');
    expect((component as any).defaultFileName('DarkLogo')).toBe('logo-dark.png');
    expect((component as any).defaultFileName('Favicon')).toBe('favicon.ico');
    expect((component as any).defaultFileName('OGBanner')).toBe('og-banner.jpg');
    expect((component as any).defaultFileName('HeroBanner')).toBe('hero-banner.jpg');
  });

  it('previewUrlFor should return placeholder when no asset exists', () => {
    (component as any).assets.set([]);
    expect((component as any).previewUrlFor('Logo')).toBe((component as any).slotPlaceholder('Logo'));
  });

  it('fileNameFor should return default file name when no asset exists', () => {
    (component as any).assets.set([]);
    expect((component as any).fileNameFor('Logo')).toBe((component as any).defaultFileName('Logo'));
  });

  it('sizeTextFor should return em dash when no asset exists', () => {
    (component as any).assets.set([]);
    expect((component as any).sizeTextFor('Logo')).toBe('—');
  });

  it('isUploading / isDeleting should reflect signals', () => {
    expect((component as any).isUploading('Logo')).toBe(false);
    expect((component as any).isDeleting('Logo')).toBe(false);
    (component as any).uploading.set('Logo');
    (component as any).deleting.set('Favicon');
    expect((component as any).isUploading('Logo')).toBe(true);
    expect((component as any).isDeleting('Favicon')).toBe(true);
  });

  it('assetByType should map assets by type', () => {
    const asset: BrandingAsset = {
      id: 'a1',
      assetType: 'Logo' as BrandingAssetType,
      fileName: 'logo.png',
      contentType: 'image/png',
      fileSize: 100,
      storageKey: 'k1',
      previewUrl: 'http://x/logo.png',
      created: '2026-01-01T00:00:00Z',
      isReferenced: false
    };
    (component as any).assets.set([asset]);
    expect((component as any).assetByType()['Logo']?.id).toBe('a1');
    expect((component as any).assetByType()['Favicon']).toBeNull();
  });

  it('assetsChange output should exist and be subscribable', () => {
    expect(component.assetsChange).toBeDefined();
    let emitted: BrandingAsset[] | null = null;
    component.assetsChange.subscribe(a => (emitted = a));
    component.assetsChange.emit([]);
    expect(emitted).toEqual([]);
  });
});
