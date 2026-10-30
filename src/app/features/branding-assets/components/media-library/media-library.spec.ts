import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MediaLibrary } from './media-library';
import { BrandingAssetsService } from '../../services/branding-assets.service';
import { NotificationService } from '../../../../core/services/notification.service';
import type { BrandingAsset } from '../../models/branding-assets.models';

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

const makeAsset = (overrides: Partial<BrandingAsset> = {}): BrandingAsset => ({
  id: 'a1',
  assetType: 'Logo',
  fileName: 'logo.png',
  contentType: 'image/png',
  fileSize: 1024,
  storageKey: 'k1',
  previewUrl: 'http://x/logo.png',
  created: '2026-01-01T00:00:00Z',
  isReferenced: false,
  ...overrides
});

describe('MediaLibrary', () => {
  let component: MediaLibrary;
  let fixture: ComponentFixture<MediaLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaLibrary],
      providers: [
        { provide: BrandingAssetsService, useValue: mockBrandingAssetsService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MediaLibrary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose rows in reverse order', () => {
    (component as any).assets.set([makeAsset({ id: 'a1', fileName: 'first.png' }), makeAsset({ id: 'a2', fileName: 'second.png' })]);
    const rows = (component as any).rows();
    expect(rows.map((r: BrandingAsset) => r.id)).toEqual(['a2', 'a1']);
  });

  it('sizeText should format bytes as MB', () => {
    expect((component as any).sizeText(1024 * 1024)).toBe('1.00 MB');
    expect((component as any).sizeText(0)).toBe('0.00 MB');
  });

  it('typeBadgeClass should brand Logo and HeroBanner', () => {
    expect((component as any).typeBadgeClass('Logo')).toContain('asset-type-badge-brand');
    expect((component as any).typeBadgeClass('HeroBanner')).toContain('asset-type-badge-brand');
    expect((component as any).typeBadgeClass('Favicon')).toContain('asset-type-badge-default');
  });

  it('handleDelete with no restaurant should notify error and not call delete', () => {
    (component as any).restaurant.set(null);
    (component as any).handleDelete(makeAsset());
    expect(mockNotificationService.error).toHaveBeenCalled();
    expect(mockBrandingAssetsService.deleteAsset).not.toHaveBeenCalled();
  });

  it('dismissConflict should close the conflict modal and clear asset', () => {
    (component as any).conflictOpen.set(true);
    (component as any).conflictAsset.set(makeAsset());
    (component as any).dismissConflict();
    expect((component as any).conflictOpen()).toBe(false);
    expect((component as any).conflictAsset()).toBeNull();
  });

  it('assetsChange output should exist and be subscribable', () => {
    expect(component.assetsChange).toBeDefined();
    let emitted: BrandingAsset[] | null = null;
    component.assetsChange.subscribe(a => (emitted = a));
    component.assetsChange.emit([]);
    expect(emitted).toEqual([]);
  });
});
