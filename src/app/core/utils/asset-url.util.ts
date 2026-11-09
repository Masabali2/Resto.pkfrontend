import { environment } from '../../../environments/environment';

const API_ORIGIN = new URL(environment.apiUrl).origin;

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (url == null || url.length === 0) {
    return null;
  }

  if (/^(?:https?:|blob:|data:)/i.test(url) || url.startsWith('//')) {
    return url;
  }

  if (url.startsWith('/assets/') || url === '/favicon.ico') {
    return url;
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_ORIGIN}${normalizedPath}`;
}
