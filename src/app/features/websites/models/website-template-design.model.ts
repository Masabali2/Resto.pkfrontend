/**
 * Typed representation of the backend `WebsiteTemplate.DesignConfigurationJson`
 * document (schema version 1).
 *
 * The backend is the single source of truth for the catalogue: the Angular
 * application never keeps a second, hard-coded list of templates. This file
 * only describes the SHAPE of a design configuration and the allow-listed
 * visual variants the generic renderer understands.
 *
 * Everything in here is data — never markup, script or CSS. A design
 * configuration is validated on the backend (see WebsiteTemplateDesignSchema)
 * and re-validated on the client before it is rendered.
 */

export const WEBSITE_TEMPLATE_DESIGN_SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Allow-listed visual variants                                       */
/* ------------------------------------------------------------------ */

export const TEMPLATE_HEADING_FONTS = [
  'serif-editorial',
  'serif-traditional',
  'sans-modern',
  'sans-bold',
  'display-wide'
] as const;

export type TemplateHeadingFont = (typeof TEMPLATE_HEADING_FONTS)[number];

export const TEMPLATE_BODY_FONTS = [
  'sans-modern',
  'sans-humanist',
  'serif-editorial',
  'serif-traditional'
] as const;

export type TemplateBodyFont = (typeof TEMPLATE_BODY_FONTS)[number];

export const TEMPLATE_HEADER_LAYOUTS = ['centered', 'left', 'split'] as const;
export type TemplateHeaderLayout = (typeof TEMPLATE_HEADER_LAYOUTS)[number];

export const TEMPLATE_HERO_LAYOUTS = [
  'split',
  'centered',
  'image-led',
  'cinematic',
  'asymmetric'
] as const;
export type TemplateHeroLayout = (typeof TEMPLATE_HERO_LAYOUTS)[number];

export const TEMPLATE_MENU_LAYOUTS = [
  'featured-cards',
  'compact-cards',
  'editorial-list',
  'grid-cards',
  'list-rows'
] as const;
export type TemplateMenuLayout = (typeof TEMPLATE_MENU_LAYOUTS)[number];

export const TEMPLATE_GALLERY_LAYOUTS = ['masonry', 'grid', 'strip', 'carousel'] as const;
export type TemplateGalleryLayout = (typeof TEMPLATE_GALLERY_LAYOUTS)[number];

export const TEMPLATE_FOOTER_LAYOUTS = ['multi-column', 'simple', 'centered'] as const;
export type TemplateFooterLayout = (typeof TEMPLATE_FOOTER_LAYOUTS)[number];

export const TEMPLATE_BUTTON_STYLES = ['solid', 'outline', 'pill'] as const;
export type TemplateButtonStyle = (typeof TEMPLATE_BUTTON_STYLES)[number];

export const TEMPLATE_CORNER_STYLES = ['sharp', 'soft', 'rounded'] as const;
export type TemplateCornerStyle = (typeof TEMPLATE_CORNER_STYLES)[number];

export const TEMPLATE_SECTION_TYPES = [
  'header',
  'hero',
  'menu',
  'about',
  'gallery',
  'contact',
  'footer'
] as const;

export type TemplateSectionType = (typeof TEMPLATE_SECTION_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Document shape                                                      */
/* ------------------------------------------------------------------ */

export interface WebsiteTemplatePalette {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  primary: string;
  accent: string;
  border: string;
}

export interface WebsiteTemplateTypography {
  headingFont: TemplateHeadingFont;
  bodyFont: TemplateBodyFont;
}

export interface WebsiteTemplateLayout {
  header: TemplateHeaderLayout;
  hero: TemplateHeroLayout;
  menu: TemplateMenuLayout;
  gallery: TemplateGalleryLayout;
  footer: TemplateFooterLayout;
  buttons: TemplateButtonStyle;
  corners: TemplateCornerStyle;
}

export interface WebsiteTemplateSection {
  type: TemplateSectionType;
  enabled: boolean;
  order: number;
}

export interface WebsiteTemplateDesign {
  palette: WebsiteTemplatePalette;
  typography: WebsiteTemplateTypography;
  layout: WebsiteTemplateLayout;
  sections: WebsiteTemplateSection[];
}

export interface WebsiteTemplateSampleDish {
  name: string;
  price: string;
}

export interface WebsiteTemplatePreviewContent {
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  primaryActionLabel: string;
  sampleDishes: WebsiteTemplateSampleDish[];
}

export interface WebsiteTemplateDesignConfiguration {
  schemaVersion: number;
  category: string;
  tags: string[];
  featured: boolean;
  displayOrder: number;
  design: WebsiteTemplateDesign;
  previewContent: WebsiteTemplatePreviewContent;
}

/**
 * The validated view model consumed by the generic renderer. It is produced
 * once, in a single place, so no component ever parses raw JSON itself.
 */
export interface WebsiteTemplateDesignViewModel {
  configuration: WebsiteTemplateDesignConfiguration;
  /** Enabled sections only, sorted by their configured order. */
  sections: WebsiteTemplateSection[];
  /** Resolved CSS custom properties (safe, validated values only). */
  cssVariables: Readonly<Record<string, string>>;
}

export interface WebsiteTemplateDesignParseResult {
  viewModel: WebsiteTemplateDesignViewModel | null;
  /** Populated when the document is missing, malformed or not supported. */
  error: string | null;
}

/**
 * `card` renders the compact, clipped thumbnail used by the catalogue grid.
 * `full` renders the larger, fully interactive preview used by the dialog
 * (and reserved for a future published-site renderer).
 */
export type TemplateRendererMode = 'card' | 'full';
