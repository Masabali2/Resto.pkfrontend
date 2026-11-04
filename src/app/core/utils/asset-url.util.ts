import { environment } from '../../../environments/environment';

/**
 * Frontend public assets are served by the Angular application itself and
 * must never be rewritten to the API origin.
 */
const FRONTEND_PUBLIC_ASSET = /^\/?(?:assets(?:\/|$)|favicon(?:\.[a-z0-9]+)?$)/i;

/**
 * Resolves an API-hosted asset URL against the configured backend origin.
 *
 * - Absolute HTTP/HTTPS, protocol-relative, data: and blob: URLs are returned
 *   unchanged.
 * - Relative API paths (for example `/api/v1/files/{id}`) are resolved against
 *   the backend origin derived from `environment.apiUrl`.
 * - Frontend public assets (`/assets/...`, `/favicon...`) stay on the current
 *   origin so Angular's own static files are not redirected to the API.
 * - Null and empty values are handled safely.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (url == null || url === '') return url ?? null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith('//')) return url;
  if (FRONTEND_PUBLIC_ASSET.test(url)) return url;

  const base = environment.apiUrl.replace(/\/api\/?$/i, '');
  if (url.startsWith('/')) return base + url;
  return base + '/' + url;
}
