import { environment } from '../../../environments/environment';

const API_BASE_URL = environment.apiUrl.replace(/\/+$/, '');

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

  return `${API_BASE_URL.replace(/\/api$/, '')}${normalizedUrl}`;
}