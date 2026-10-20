export const environment = {
  production: false,
  apiUrl: 'https://localhost:7182/api',
  /**
   * Base URL where published public sites are served (slug-based lookup via
   * GET /api/v1/public/sites/{slug}). The backend does not expose a public
   * site domain, so this must be configured per deployment. Empty string
   * means "not configured" and the UI shows the path template instead of a
   * clickable URL.
   */
  publicSiteBaseUrl: ''
};
