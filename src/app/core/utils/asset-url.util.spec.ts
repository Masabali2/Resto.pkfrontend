import { environment } from '../../../environments/environment';
import { resolveAssetUrl } from './asset-url.util';

const API_ORIGIN = new URL(environment.apiUrl).origin;

describe('resolveAssetUrl', () => {
  it('resolves a relative API file URL against the configured backend origin', () => {
    const fileId = '734361f8-c689-4d6d-9559-e6b4539aba9e';

    expect(resolveAssetUrl(`/api/v1/files/${fileId}`)).toBe(
      `${API_ORIGIN}/api/v1/files/${fileId}`
    );
  });

  it('resolves an API path without a leading slash', () => {
    expect(resolveAssetUrl('api/v1/files/key.png')).toBe(
      `${API_ORIGIN}/api/v1/files/key.png`
    );
  });

  it('leaves absolute HTTP and HTTPS URLs unchanged', () => {
    expect(resolveAssetUrl('https://cdn.example.com/image.png')).toBe(
      'https://cdn.example.com/image.png'
    );
    expect(resolveAssetUrl('http://cdn.example.com/image.png')).toBe(
      'http://cdn.example.com/image.png'
    );
  });

  it('leaves blob, data and protocol-relative URLs unchanged', () => {
    expect(resolveAssetUrl('blob:https://localhost:4200/abc')).toBe(
      'blob:https://localhost:4200/abc'
    );
    expect(resolveAssetUrl('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA'
    );
    expect(resolveAssetUrl('//cdn.example.com/image.png')).toBe(
      '//cdn.example.com/image.png'
    );
  });

  it('returns null or empty values safely', () => {
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl(undefined)).toBeNull();
    expect(resolveAssetUrl('')).toBeNull();
  });

  it('does not rewrite frontend public assets to the API origin', () => {
    expect(resolveAssetUrl('/assets/images/SpiceGarden/hero.png')).toBe(
      '/assets/images/SpiceGarden/hero.png'
    );
    expect(resolveAssetUrl('/favicon.ico')).toBe('/favicon.ico');
  });
});
