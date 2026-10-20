/**
 * Frontend mirror of the backend WebsiteConfigSchema (schemaVersion 1).
 * Property names follow the backend contract; unknown properties found in a
 * loaded draft are preserved on `raw` so editing supported fields never
 * silently deletes sections or settings the editor does not understand.
 */

export const WEBSITE_CONFIG_SCHEMA_VERSION = 1;

export const SUPPORTED_SECTION_TYPES = [
  'hero',
  'menu-preview',
  'about',
  'gallery',
  'contact',
  'hours',
  'map',
  'footer',
  'banner',
  'testimonials'
] as const;

export type SectionType = (typeof SUPPORTED_SECTION_TYPES)[number];

export const SUPPORTED_FONTS = [
  'system-ui',
  'serif',
  'sans-serif',
  'monospace',
  'poppins',
  'inter',
  'roboto',
  'playfair-display'
] as const;

export type SupportedFont = (typeof SUPPORTED_FONTS)[number];

export const FONT_LABELS: Record<SupportedFont, string> = {
  'system-ui': 'System UI',
  serif: 'Serif',
  'sans-serif': 'Sans Serif',
  monospace: 'Monospace',
  poppins: 'Poppins',
  inter: 'Inter',
  roboto: 'Roboto',
  'playfair-display': 'Playfair Display'
};

/**
 * Backend schema shape: `theme.colors` is an open map of hex strings and
 * `theme.font` is a single allow-listed family. Unknown keys are preserved.
 */
export interface WebsiteThemeColors {
  [name: string]: string;
}

export interface WebsiteThemeConfig {
  colors?: WebsiteThemeColors;
  font?: SupportedFont | string;
  [key: string]: unknown;
}

export interface WebsiteSectionConfig {
  id?: string;
  type?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WebsiteConfig {
  schemaVersion: number;
  theme: WebsiteThemeConfig;
  sections: WebsiteSectionConfig[];
  settings: Record<string, unknown>;
  /** Extra top-level keys found in the draft, re-emitted verbatim on save. */
  extraTopLevel: Record<string, unknown>;
}

export interface ParseWebsiteConfigResult {
  config: WebsiteConfig | null;
  /** Populated when the JSON is missing, malformed, or schema-incompatible. */
  error: string | null;
}
