/**
 * Frontend domain models for the Branding & Assets feature.
 *
 * Asset shapes mirror the backend asset contracts referenced by the
 * design spec (GET restaurants/{restaurantId}/assets,
 * POST v1/assets/upload, DELETE v1/assets/{id}). Because the backend
 * repository is not part of this workspace, these contracts are assumed
 * from the reference design and must be validated against the actual
 * backend before production deployment (see the implementation report).
 */

export type BrandingAssetType = 'Logo' | 'DarkLogo' | 'Favicon' | 'OGBanner' | 'HeroBanner';

export const BRANDING_ASSET_TYPES: readonly BrandingAssetType[] = [
  'Logo',
  'DarkLogo',
  'Favicon',
  'OGBanner',
  'HeroBanner'
];

/**
 * A single stored asset returned by the backend.
 * `previewUrl` is the publicly accessible delivery URL for the asset.
 */
export interface BrandingAsset {
  id: string;
  assetType: BrandingAssetType;
  fileName: string;
  contentType: string;
  fileSize: number;
  storageKey: string;
  previewUrl: string | null;
  created: string;
  isReferenced: boolean;
}

/**
 * Client-side editable state for one asset slot.
 */
export interface AssetSlotView {
  assetType: BrandingAssetType;
  label: string;
  previewUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
}

export interface BrandingTheme {
  primary: string;
  secondary: string;
  tint: string;
}

export interface BrandingTypography {
  headingFont: string;
  bodyFont: string;
  fontScale: number;
}

export type HeroLayout = 'split' | 'overlay' | 'compact';

export const HERO_LAYOUTS: readonly { value: HeroLayout; label: string }[] = [
  { value: 'split', label: 'Split Card Minimal' },
  { value: 'overlay', label: 'Full Cover Overlay' },
  { value: 'compact', label: 'Centered Icon Minimal' }
];

export interface BrandingConfiguration {
  theme: BrandingTheme;
  typography: BrandingTypography;
  heroLayout: HeroLayout;
  assets: Record<BrandingAssetType, BrandingAsset | null>;
}

export interface StorageInfo {
  usedBytes: number;
  quotaBytes: number;
}

/** Default branding configuration matching the reference design. */
export const DEFAULT_BRANDING_THEME: BrandingTheme = {
  primary: '#F97316',
  secondary: '#0F172A',
  tint: '#FFF7ED'
};

export const DEFAULT_BRANDING_TYPOGRAPHY: BrandingTypography = {
  headingFont: 'plus-jakarta-sans',
  bodyFont: 'plus-jakarta-sans',
  fontScale: 100
};

export const DEFAULT_HERO_LAYOUT: HeroLayout = 'split';

/** Font choices reproduced from the reference design. */
export const BRANDING_HEADING_FONTS = [
  { value: 'plus-jakarta-sans', label: 'Plus Jakarta Sans (Modern Geometric)', fontFamily: '"Plus Jakarta Sans", sans-serif' },
  { value: 'playfair-display', label: 'Playfair Display (Elegant Serif)', fontFamily: '"Playfair Display", serif' },
  { value: 'outfit', label: 'Outfit (Clean Trendy)', fontFamily: '"Outfit", sans-serif' }
] as const;

export const BRANDING_BODY_FONTS = [
  { value: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', fontFamily: '"Plus Jakarta Sans", sans-serif' },
  { value: 'inter', label: 'Inter (Legible & Clean)', fontFamily: '"Inter", sans-serif' }
] as const;

export type BrandingHeadingFont = (typeof BRANDING_HEADING_FONTS)[number]['value'];
export type BrandingBodyFont = (typeof BRANDING_BODY_FONTS)[number]['value'];

export function brandingFontClass(value: BrandingHeadingFont | BrandingBodyFont): string {
  switch (value) {
    case 'plus-jakarta-sans': return 'brand-font-plus-jakarta';
    case 'playfair-display': return 'brand-font-playfair';
    case 'outfit': return 'brand-font-outfit';
    case 'inter': return 'brand-font-inter';
    default: return 'brand-font-plus-jakarta';
  }
}

export interface WebsiteBrandingSettings {
  theme?: BrandingTheme;
  typography?: BrandingTypography;
  heroLayout?: HeroLayout;
  assets?: Partial<Record<BrandingAssetType, string>>;
}
