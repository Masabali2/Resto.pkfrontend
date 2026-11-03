import { environment } from '../../../environments/environment';

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (url == null || url === '') return url ?? null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = environment.apiUrl.replace(/\/api\/?$/i, '');
  if (url.startsWith('/')) return base + url;
  return base + '/' + url;
}
