import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { BrandingAssetsService, AssetReferencedError } from './branding-assets.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { BrandingAssetType, HeroLayout } from '../models/branding-assets.models';
import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;
const API_ORIGIN = new URL(API_URL).origin;

describe('BrandingAssetsService', () => {
  let service: BrandingAssetsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(BrandingAssetsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POSTs a single file field to the restaurant-asset upload endpoint and maps the restaurant asset id', () => {
    const file = new File(['dummy'], 'logo.png', { type: 'image/png' });
    const restaurantId = 'r1';
    const assetType: BrandingAssetType = 'DarkLogo';
    const dto = {
      id: 'asset-123',
      assetType: 'DarkLogo',
      fileName: 'logo.png',
      contentType: 'image/png',
      fileSize: 1234,
      fileId: 'file-abc',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      url: '/api/v1/files/file-abc?exp=3600'
    };

    let result: unknown;
    service.uploadAsset(file, restaurantId, assetType).subscribe(value => (result = value));

    const req = httpMock.expectOne(
      `${API_URL}/restaurants/${restaurantId}/assets/${assetType}`
    );
    expect(req.request.method).toBe('POST');

    const formData = req.request.body as FormData;
    const uploadedFile = formData.get('file');
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe('logo.png');
    // The asset type travels in the route, never as a client-trusted form field.
    expect(formData.get('assetType')).toBeNull();
    expect(req.request.headers.get('Content-Type')).toBeNull();

    req.flush({ success: true, data: dto });

    expect(result).toEqual({
      id: 'asset-123',
      assetType: 'DarkLogo',
      fileName: 'logo.png',
      contentType: 'image/png',
      fileSize: 1234,
      storageKey: 'file-abc',
      previewUrl: `${API_ORIGIN}/api/v1/files/file-abc?exp=3600`,
      created: '2026-01-01T00:00:00Z',
      isReferenced: false
    });
  });

  it('loads restaurant assets and maps each dto to a BrandingAsset', () => {
    const restaurantId = 'r1';
    const dtos = [
      {
        id: 'a1', assetType: 'Logo', fileName: 'logo.png', contentType: 'image/png',
        fileSize: 100, fileId: 'f1', createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z', url: `${API_ORIGIN}/api/v1/files/f1?exp=3600`
      }
    ];

    let result: unknown;
    service.loadAssets(restaurantId).subscribe(value => (result = value));

    const req = httpMock.expectOne(`${API_URL}/restaurants/${restaurantId}/assets`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: dtos });

    expect(result).toEqual([
      {
        id: 'a1',
        assetType: 'Logo',
        fileName: 'logo.png',
        contentType: 'image/png',
        fileSize: 100,
        storageKey: 'f1',
        previewUrl: `${API_ORIGIN}/api/v1/files/f1?exp=3600`,
        created: '2026-01-01T00:00:00Z',
        isReferenced: false
      }
    ]);
  });

  it('deletes by restaurant asset id and throws AssetReferencedError on 409', () => {
    const restaurantId = 'r1';
    const assetId = 'a1';

    let error: unknown;
    service.deleteAsset(restaurantId, assetId).subscribe({
      error: err => (error = err)
    });

    const req = httpMock.expectOne(
      `${API_URL}/restaurants/${restaurantId}/assets/${assetId}`
    );
    expect(req.request.method).toBe('DELETE');

    req.flush(
      { success: false, message: 'Still referenced.', errorCode: 'ASSET_STILL_REFERENCED' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(error).toBeInstanceOf(AssetReferencedError);
  });

  it('deletes successfully when the backend returns 204', () => {
    const restaurantId = 'r1';
    const assetId = 'a1';

    let completed = false;
    service.deleteAsset(restaurantId, assetId).subscribe({
      complete: () => (completed = true)
    });

    const req = httpMock.expectOne(
      `${API_URL}/restaurants/${restaurantId}/assets/${assetId}`
    );
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('reads storage usage and reports null quota as unavailable', () => {
    const restaurantId = 'r1';

    let result: unknown;
    service.getStorageInfo(restaurantId).subscribe(value => (result = value));

    const req = httpMock.expectOne(`${API_URL}/restaurants/${restaurantId}/storage`);
    expect(req.request.method).toBe('GET');

    req.flush({ success: true, data: { usedBytes: 123456, quotaBytes: null } });

    expect(result).toEqual({ usedBytes: 123456, quotaBytes: null });
  });

  it('returns null storage info when the backend does not expose storage metadata', () => {
    const restaurantId = 'r1';

    let result: unknown;
    service.getStorageInfo(restaurantId).subscribe(value => (result = value));

    const req = httpMock.expectOne(`${API_URL}/restaurants/${restaurantId}/storage`);
    req.flush({ success: false, message: 'Not available' });

    expect(result).toBeNull();
  });

  it('persists branding settings in the backend WebsiteConfigSchema shape', () => {
    const websiteId = 'w1';
    const settings = {
      theme: { primary: '#F97316', secondary: '#0F172A', tint: '#FFF7ED' },
      typography: { headingFont: 'plus-jakarta-sans', bodyFont: 'inter', fontScale: 110 },
      heroLayout: 'overlay' as HeroLayout,
      assets: { Logo: 'a1', Favicon: 'a2' }
    };

    let sentBody: unknown;
    service.saveConfiguration(websiteId, settings).subscribe();
    const req = httpMock.expectOne(`${API_URL}/v1/websites/${websiteId}/draft`);
    expect(req.request.method).toBe('PUT');
    sentBody = req.request.body;

    req.flush({ success: true });

    expect(sentBody).toMatchObject({ configurationJson: expect.any(String) });
    const config = JSON.parse((sentBody as { configurationJson: string }).configurationJson);
    expect(config.schemaVersion).toBe(1);
    expect(config.theme.colors.primary).toBe('#F97316');
    expect(config.theme.font).toBe('plus-jakarta-sans');
    expect(config.settings.typography.headingFont).toBe('plus-jakarta-sans');
    expect(config.settings.typography.bodyFont).toBe('inter');
    expect(config.settings.typography.fontScale).toBe(110);
    expect(config.settings.heroLayout).toBe('overlay');
    expect(config.settings.assets).toEqual({ Logo: 'a1', Favicon: 'a2' });
    // No unsupported top-level branding properties leak into the draft.
    expect(config.typography).toBeUndefined();
    expect(config.heroLayout).toBeUndefined();
    expect(config.theme.primary).toBeUndefined();
  });
});
