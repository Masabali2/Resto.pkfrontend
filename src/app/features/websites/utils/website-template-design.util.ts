import {
  TEMPLATE_BODY_FONTS,
  TEMPLATE_BUTTON_STYLES,
  TEMPLATE_CORNER_STYLES,
  TEMPLATE_FOOTER_LAYOUTS,
  TEMPLATE_GALLERY_LAYOUTS,
  TEMPLATE_HEADER_LAYOUTS,
  TEMPLATE_HEADING_FONTS,
  TEMPLATE_HERO_LAYOUTS,
  TEMPLATE_MENU_LAYOUTS,
  TEMPLATE_SECTION_TYPES,
  WEBSITE_TEMPLATE_DESIGN_SCHEMA_VERSION,
  type TemplateBodyFont,
  type TemplateButtonStyle,
  type TemplateCornerStyle,
  type TemplateFooterLayout,
  type TemplateGalleryLayout,
  type TemplateHeaderLayout,
  type TemplateHeadingFont,
  type TemplateHeroLayout,
  type TemplateMenuLayout,
  type TemplateSectionType,
  type WebsiteTemplateAsset,
  type WebsiteTemplateDesignParseResult,
  type WebsiteTemplateDesignViewModel,
  type WebsiteTemplateLayout,
  type WebsiteTemplateMedia,
  type WebsiteTemplatePalette,
  type WebsiteTemplatePreviewContent,
  type WebsiteTemplateSampleDish,
  type WebsiteTemplateSection,
  type WebsiteTemplateTypography
} from '../models/website-template-design.model';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const ASSET_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const ASSET_URL_PATTERN = /^\/[A-Za-z0-9._~%/-]+$/;

const MAX_ASSETS = 32;
const MAX_GALLERY_ASSETS = 12;
const MAX_ASSET_ID_LENGTH = 100;
const MAX_ASSET_URL_LENGTH = 300;
const MAX_ALT_LENGTH = 240;
const MAX_IMAGE_DIMENSION = 20_000;

const HEADING_FONT_STACKS: Record<TemplateHeadingFont, string> = {
  'serif-editorial': "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
  'serif-traditional': "'Bookman Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  'sans-modern': "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'sans-bold': "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'display-wide': "'Futura', 'Avenir Next', 'Trebuchet MS', system-ui, sans-serif"
};

const HEADING_FONT_WEIGHTS: Record<TemplateHeadingFont, string> = {
  'serif-editorial': '700',
  'serif-traditional': '700',
  'sans-modern': '800',
  'sans-bold': '900',
  'display-wide': '800'
};

const HEADING_FONT_TRACKING: Record<TemplateHeadingFont, string> = {
  'serif-editorial': '-0.01em',
  'serif-traditional': '0em',
  'sans-modern': '-0.02em',
  'sans-bold': '-0.03em',
  'display-wide': '0.06em'
};

const BODY_FONT_STACKS: Record<TemplateBodyFont, string> = {
  'sans-modern': "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'sans-humanist': "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
  'serif-editorial': "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
  'serif-traditional': "'Bookman Old Style', 'Palatino Linotype', Palatino, Georgia, serif"
};

const CORNER_RADII: Record<TemplateCornerStyle, string> = {
  sharp: '2px',
  soft: '14px',
  rounded: '26px'
};

const DEFAULT_PALETTE: WebsiteTemplatePalette = {
  background: '#ffffff',
  surface: '#ffffff',
  text: '#1e293b',
  mutedText: '#64748b',
  primary: '#24563a',
  accent: '#d99027',
  border: '#e2e8f0'
};

const DEFAULT_TYPOGRAPHY: WebsiteTemplateTypography = {
  headingFont: 'sans-modern',
  bodyFont: 'sans-humanist'
};

const DEFAULT_LAYOUT: WebsiteTemplateLayout = {
  header: 'centered',
  hero: 'split',
  menu: 'featured-cards',
  gallery: 'grid',
  footer: 'multi-column',
  buttons: 'solid',
  corners: 'soft'
};

const DEFAULT_SECTION_ORDER: TemplateSectionType[] = [
  'header',
  'hero',
  'menu',
  'about',
  'gallery',
  'contact',
  'footer'
];

export function isValidTemplateColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
}

export function isTemplateHeadingFont(value: unknown): value is TemplateHeadingFont {
  return typeof value === 'string' && (TEMPLATE_HEADING_FONTS as readonly string[]).includes(value);
}

export function isTemplateBodyFont(value: unknown): value is TemplateBodyFont {
  return typeof value === 'string' && (TEMPLATE_BODY_FONTS as readonly string[]).includes(value);
}

/**
 * Mirrors the backend asset-ID rule: a lower-case slug of letters, digits and
 * dashes. Asset identity is separate from the URL, so a section reference can
 * survive a URL change.
 */
export function isSafeTemplateAssetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ASSET_ID_LENGTH &&
    ASSET_ID_PATTERN.test(value)
  );
}

/**
 * Mirror of the backend URL rule: same-origin, root-relative image paths only.
 * Absolute URLs, protocol-relative URLs, schemes (`javascript:`, `data:`),
 * backslashes, double slashes and parent-directory traversal are rejected.
 * The backend already enforces this; re-checking here is defence in depth so
 * an unsafe value can never reach the DOM through a compromised response.
 */
export function isSafeTemplateAssetUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ASSET_URL_LENGTH &&
    ASSET_URL_PATTERN.test(value) &&
    !value.startsWith('//') &&
    !value.includes('//') &&
    !value.includes('..')
  );
}

/**
 * Parses the raw `designConfigurationJson` of a catalogue entry into the
 * typed view model the generic renderer consumes.
 *
 * The parser is deliberately the ONLY place where the raw JSON is read. It
 * mirrors the backend allow-list (`WebsiteTemplateDesignSchema`): malformed
 * documents, non-hex colours and unsupported layout variants are rejected
 * with an actionable message, and every component downstream receives either
 * a fully validated view model or `null`.
 */
export function parseWebsiteTemplateDesign(
  json: string | null | undefined
): WebsiteTemplateDesignParseResult {
  if (json == null || json.trim().length === 0) {
    return {
      viewModel: null,
      error: 'This template does not provide a design preview yet.'
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      viewModel: null,
      error: 'This template has a design configuration that could not be read.'
    };
  }

  if (!isRecord(parsed)) {
    return {
      viewModel: null,
      error: 'This template has a design configuration that could not be read.'
    };
  }

  const schemaVersion = parsed['schemaVersion'];

  if (schemaVersion !== WEBSITE_TEMPLATE_DESIGN_SCHEMA_VERSION) {
    return {
      viewModel: null,
      error: `This template uses design schema version ${String(schemaVersion)}, which is not supported.`
    };
  }

  const paletteResult = parsePalette(parsed['design']);
  if ('error' in paletteResult) {
    return { viewModel: null, error: paletteResult.error };
  }

  const typographyResult = parseTypography(parsed['design']);
  if ('error' in typographyResult) {
    return { viewModel: null, error: typographyResult.error };
  }

  const layoutResult = parseLayout(parsed['design']);
  if ('error' in layoutResult) {
    return { viewModel: null, error: layoutResult.error };
  }

  const sectionsResult = parseSections(parsed['design']);
  if ('error' in sectionsResult) {
    return { viewModel: null, error: sectionsResult.error };
  }

  const previewContent = parsePreviewContent(parsed['previewContent']);
  const assets = parseAssets(parsed['assets']);

  const configuration = {
    schemaVersion: WEBSITE_TEMPLATE_DESIGN_SCHEMA_VERSION,
    category: readString(parsed['category']) ?? '',
    tags: readStringArray(parsed['tags']),
    featured: parsed['featured'] === true,
    displayOrder: readNumber(parsed['displayOrder']) ?? 0,
    design: {
      palette: paletteResult.palette,
      typography: typographyResult.typography,
      layout: layoutResult.layout,
      sections: sectionsResult.sections
    },
    previewContent,
    assets
  };

  const enabledSections = configuration.design.sections
    .filter(section => section.enabled)
    .sort((left, right) => left.order - right.order);

  return {
    viewModel: {
      configuration,
      sections: enabledSections,
      cssVariables: buildCssVariables(configuration.design),
      media: resolveMedia(assets, previewContent)
    },
    error: null
  };
}

function parsePalette(design: unknown):
  | { palette: WebsiteTemplatePalette }
  | { error: string } {
  const designRecord = isRecord(design) ? design : undefined;
  const rawPalette = designRecord ? designRecord['palette'] : undefined;

  if (rawPalette === undefined || rawPalette === null) {
    return { palette: { ...DEFAULT_PALETTE } };
  }

  if (!isRecord(rawPalette)) {
    return { error: 'This template has an invalid colour palette.' };
  }

  const palette: WebsiteTemplatePalette = { ...DEFAULT_PALETTE };

  for (const key of Object.keys(DEFAULT_PALETTE) as (keyof WebsiteTemplatePalette)[]) {
    const value = rawPalette[key];

    if (value === undefined || value === null) {
      continue;
    }

    if (!isValidTemplateColor(value)) {
      return { error: `This template has an invalid "${key}" colour.` };
    }

    palette[key] = value;
  }

  return { palette };
}

function parseTypography(design: unknown):
  | { typography: WebsiteTemplateTypography }
  | { error: string } {
  const designRecord = isRecord(design) ? design : undefined;
  const rawTypography = designRecord ? designRecord['typography'] : undefined;

  if (rawTypography === undefined || rawTypography === null) {
    return { typography: { ...DEFAULT_TYPOGRAPHY } };
  }

  if (!isRecord(rawTypography)) {
    return { error: 'This template has invalid typography settings.' };
  }

  const typography: WebsiteTemplateTypography = { ...DEFAULT_TYPOGRAPHY };
  const heading = rawTypography['headingFont'];

  if (heading !== undefined && heading !== null) {
    if (!isTemplateHeadingFont(heading)) {
      return { error: `This template uses an unsupported heading font "${String(heading)}".` };
    }

    typography.headingFont = heading;
  }

  const body = rawTypography['bodyFont'];

  if (body !== undefined && body !== null) {
    if (!isTemplateBodyFont(body)) {
      return { error: `This template uses an unsupported body font "${String(body)}".` };
    }

    typography.bodyFont = body;
  }

  return { typography };
}

function parseLayout(design: unknown): { layout: WebsiteTemplateLayout } | { error: string } {
  const designRecord = isRecord(design) ? design : undefined;
  const rawLayout = designRecord ? designRecord['layout'] : undefined;

  if (rawLayout === undefined || rawLayout === null) {
    return { layout: { ...DEFAULT_LAYOUT } };
  }

  if (!isRecord(rawLayout)) {
    return { error: 'This template has invalid layout settings.' };
  }

  const layout: WebsiteTemplateLayout = { ...DEFAULT_LAYOUT };
  const checks: {
    key: keyof WebsiteTemplateLayout;
    allowed: readonly string[];
  }[] = [
    { key: 'header', allowed: TEMPLATE_HEADER_LAYOUTS },
    { key: 'hero', allowed: TEMPLATE_HERO_LAYOUTS },
    { key: 'menu', allowed: TEMPLATE_MENU_LAYOUTS },
    { key: 'gallery', allowed: TEMPLATE_GALLERY_LAYOUTS },
    { key: 'footer', allowed: TEMPLATE_FOOTER_LAYOUTS },
    { key: 'buttons', allowed: TEMPLATE_BUTTON_STYLES },
    { key: 'corners', allowed: TEMPLATE_CORNER_STYLES }
  ];

  for (const check of checks) {
    const value = rawLayout[check.key];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value !== 'string' || !check.allowed.includes(value)) {
      return { error: `This template uses an unsupported "${check.key}" layout variant.` };
    }

    switch (check.key) {
      case 'header':
        layout.header = value as TemplateHeaderLayout;
        break;
      case 'hero':
        layout.hero = value as TemplateHeroLayout;
        break;
      case 'menu':
        layout.menu = value as TemplateMenuLayout;
        break;
      case 'gallery':
        layout.gallery = value as TemplateGalleryLayout;
        break;
      case 'footer':
        layout.footer = value as TemplateFooterLayout;
        break;
      case 'buttons':
        layout.buttons = value as TemplateButtonStyle;
        break;
      case 'corners':
        layout.corners = value as TemplateCornerStyle;
        break;
    }
  }

  return { layout };
}

function parseSections(design: unknown):
  | { sections: WebsiteTemplateSection[] }
  | { error: string } {
  const designRecord = isRecord(design) ? design : undefined;
  const rawSections = designRecord ? designRecord['sections'] : undefined;

  if (rawSections === undefined || rawSections === null) {
    return {
      sections: DEFAULT_SECTION_ORDER.map((type, index) => ({
        type,
        enabled: true,
        order: index + 1
      }))
    };
  }

  if (!Array.isArray(rawSections)) {
    return { error: 'This template has an invalid section list.' };
  }

  const sections: WebsiteTemplateSection[] = [];
  const seen = new Set<TemplateSectionType>();

  rawSections.forEach((rawSection, index) => {
    if (!isRecord(rawSection)) {
      return;
    }

    const type = rawSection['type'];

    if (typeof type !== 'string' || !TEMPLATE_SECTION_TYPES.includes(type as TemplateSectionType)) {
      return;
    }

    const sectionType = type as TemplateSectionType;

    if (seen.has(sectionType)) {
      return;
    }

    seen.add(sectionType);

    const order = readNumber(rawSection['order']);

    sections.push({
      type: sectionType,
      enabled: rawSection['enabled'] !== false,
      order: order ?? index + 1
    });
  });

  if (sections.length === 0) {
    return { error: 'This template does not declare any renderable section.' };
  }

  return { sections };
}

function parsePreviewContent(raw: unknown): WebsiteTemplatePreviewContent {
  const record = isRecord(raw) ? raw : undefined;

  const dishes: WebsiteTemplateSampleDish[] = [];
  const rawDishes = record ? record['sampleDishes'] : undefined;

  if (Array.isArray(rawDishes)) {
    rawDishes.slice(0, 8).forEach(entry => {
      if (!isRecord(entry)) {
        return;
      }

      const name = readString(entry['name']);
      const price = readString(entry['price']);

      if (!name) {
        return;
      }

      dishes.push({ name, price: price ?? '' });
    });
  }

  const galleryAssetIds: string[] = [];
  const rawGallery = record ? record['galleryAssetIds'] : undefined;

  if (Array.isArray(rawGallery)) {
    const seen = new Set<string>();

    for (const entry of rawGallery.slice(0, MAX_GALLERY_ASSETS)) {
      if (!isSafeTemplateAssetId(entry) || seen.has(entry)) {
        continue;
      }

      seen.add(entry);
      galleryAssetIds.push(entry);
    }
  }

  return {
    eyebrow: (record ? readString(record['eyebrow']) : null) ?? '',
    heroTitle: (record ? readString(record['heroTitle']) : null) ?? '',
    heroDescription: (record ? readString(record['heroDescription']) : null) ?? '',
    primaryActionLabel: (record ? readString(record['primaryActionLabel']) : null) ?? '',
    sampleDishes: dishes,
    heroAssetId: readAssetReference(record ? record['heroAssetId'] : undefined),
    aboutAssetId: readAssetReference(record ? record['aboutAssetId'] : undefined),
    galleryAssetIds
  };
}

/**
 * Parses the optional asset registry. Invalid entries are skipped rather than
 * invalidating the whole template: a single mistyped URL or missing alt text
 * must never take down an otherwise renderable preview. References to skipped
 * entries are dropped by {@link resolveMedia}.
 */
function parseAssets(raw: unknown): WebsiteTemplateAsset[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const assets: WebsiteTemplateAsset[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const entry of raw.slice(0, MAX_ASSETS)) {
    if (!isRecord(entry)) {
      continue;
    }

    const assetId = entry['assetId'];
    const url = entry['url'];
    const alt = entry['alt'];

    if (!isSafeTemplateAssetId(assetId) || seenIds.has(assetId)) {
      continue;
    }

    if (!isSafeTemplateAssetUrl(url) || seenUrls.has(url)) {
      continue;
    }

    if (typeof alt !== 'string') {
      continue;
    }

    const trimmedAlt = alt.trim();

    if (
      trimmedAlt.length === 0 ||
      trimmedAlt.length > MAX_ALT_LENGTH ||
      /[<>\u0000-\u001f]/.test(trimmedAlt)
    ) {
      continue;
    }

    seenIds.add(assetId);
    seenUrls.add(url);

    assets.push({
      assetId,
      url,
      alt: trimmedAlt,
      width: readImageDimension(entry['width']),
      height: readImageDimension(entry['height'])
    });
  }

  return assets;
}

/** Resolves section references against the registry; unknown IDs drop out. */
function resolveMedia(
  assets: WebsiteTemplateAsset[],
  previewContent: WebsiteTemplatePreviewContent
): WebsiteTemplateMedia {
  const byId = new Map(assets.map(asset => [asset.assetId, asset] as const));
  const resolve = (assetId: string | null): WebsiteTemplateAsset | null =>
    assetId ? (byId.get(assetId) ?? null) : null;

  const gallery: WebsiteTemplateAsset[] = [];

  for (const assetId of previewContent.galleryAssetIds) {
    const asset = byId.get(assetId);

    if (asset && !gallery.includes(asset)) {
      gallery.push(asset);
    }
  }

  return {
    hero: resolve(previewContent.heroAssetId),
    about: resolve(previewContent.aboutAssetId),
    gallery
  };
}

function readAssetReference(value: unknown): string | null {
  return isSafeTemplateAssetId(value) ? value : null;
}

function readImageDimension(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_IMAGE_DIMENSION
    ? value
    : null;
}

/**
 * Builds the controlled set of CSS custom properties the renderer applies.
 * Every value is either a validated hex colour or a value taken from the
 * allow-lists above — never raw configuration text.
 */
function buildCssVariables(design: {
  palette: WebsiteTemplatePalette;
  typography: WebsiteTemplateTypography;
  layout: WebsiteTemplateLayout;
}): Readonly<Record<string, string>> {
  const { palette, typography, layout } = design;

  const radius = CORNER_RADII[layout.corners];
  const buttonRadius = layout.buttons === 'pill' ? '999px' : radius;

  return {
    '--tpl-background': palette.background,
    '--tpl-surface': palette.surface,
    '--tpl-text': palette.text,
    '--tpl-muted': palette.mutedText,
    '--tpl-primary': palette.primary,
    '--tpl-accent': palette.accent,
    '--tpl-border': palette.border,
    '--tpl-on-primary': readableTextOn(palette.primary),
    '--tpl-heading-font': HEADING_FONT_STACKS[typography.headingFont],
    '--tpl-body-font': BODY_FONT_STACKS[typography.bodyFont],
    '--tpl-heading-weight': HEADING_FONT_WEIGHTS[typography.headingFont],
    '--tpl-heading-tracking': HEADING_FONT_TRACKING[typography.headingFont],
    '--tpl-radius': radius,
    '--tpl-button-radius': buttonRadius
  };
}

/**
 * Picks a readable foreground for a background colour by relative luminance.
 * Deterministic and derived from the validated palette — no configuration
 * text ever reaches a CSS declaration.
 */
function readableTextOn(hex: string): string {
  const expanded =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  const red = parseInt(expanded.slice(1, 3), 16) / 255;
  const green = parseInt(expanded.slice(3, 5), 16) / 255;
  const blue = parseInt(expanded.slice(5, 7), 16) / 255;

  const channel = (value: number): number =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);

  return luminance > 0.45 ? '#101114' : '#ffffff';
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .slice(0, 12)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
