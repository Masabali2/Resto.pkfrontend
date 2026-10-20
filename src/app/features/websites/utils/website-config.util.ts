import {
  FONT_LABELS,
  SUPPORTED_FONTS,
  WEBSITE_CONFIG_SCHEMA_VERSION,
  type ParseWebsiteConfigResult,
  type SupportedFont,
  type WebsiteConfig
} from '../models/website-config.model';

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Color keys surfaced by the editor; drafts may contain additional keys. */
export const THEME_COLOR_FIELDS = [
  'primary',
  'secondary',
  'accent',
  'background',
  'text'
] as const;

export type ThemeColorField = (typeof THEME_COLOR_FIELDS)[number];

/** The backend schema exposes exactly one theme font. */
export const THEME_FONT_FIELD = 'font' as const;

export function isSupportedFont(value: unknown): value is SupportedFont {
  return typeof value === 'string' &&
    (SUPPORTED_FONTS as readonly string[]).includes(value);
}

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
}

/**
 * Parses configuration JSON exactly as the backend WebsiteConfigSchema
 * expects it. Unknown top-level and nested properties are kept so a round
 * trip through the editor never drops data the UI does not expose.
 */
export function parseWebsiteConfig(json: string | null | undefined): ParseWebsiteConfigResult {
  if (json == null || json.trim().length === 0) {
    return { config: null, error: 'No draft configuration has been saved for this website yet.' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { config: null, error: 'The saved draft could not be read because its configuration is not valid JSON.' };
  }

  if (!isRecord(parsed)) {
    return { config: null, error: 'The saved draft configuration must be a JSON object.' };
  }

  if (parsed['schemaVersion'] !== WEBSITE_CONFIG_SCHEMA_VERSION) {
    return {
      config: null,
      error: `This draft uses schema version ${String(parsed['schemaVersion'])}, which this editor does not support.`
    };
  }

  if (!isRecord(parsed['theme'])) {
    return { config: null, error: 'The draft configuration is missing its "theme" object.' };
  }

  if (!Array.isArray(parsed['sections'])) {
    return { config: null, error: 'The draft configuration is missing its "sections" array.' };
  }

  if (parsed['settings'] !== undefined && !isRecord(parsed['settings'])) {
    return { config: null, error: 'The draft configuration has an invalid "settings" object.' };
  }

  const theme = parsed['theme'];

  if (theme['colors'] !== undefined && !isRecord(theme['colors'])) {
    return { config: null, error: 'The draft theme "colors" must be an object of hex values.' };
  }

  const extraTopLevel: Record<string, unknown> = {};

  for (const key of Object.keys(parsed)) {
    if (key !== 'schemaVersion' && key !== 'theme' && key !== 'sections' && key !== 'settings') {
      extraTopLevel[key] = parsed[key];
    }
  }

  return {
    config: {
      schemaVersion: WEBSITE_CONFIG_SCHEMA_VERSION,
      theme: theme as WebsiteConfig['theme'],
      sections: parsed['sections'].filter(isRecord),
      settings: isRecord(parsed['settings']) ? parsed['settings'] : {},
      extraTopLevel
    },
    error: null
  };
}

/** Serializes the editor state into the exact JSON shape PUT /draft expects. */
export function serializeWebsiteConfig(config: WebsiteConfig): string {
  const document: Record<string, unknown> = {
    schemaVersion: config.schemaVersion,
    theme: config.theme,
    sections: config.sections,
    settings: config.settings
  };

  // Re-emit any top-level keys the editor does not surface so a round trip
  // through Save Draft never drops data the backend previously accepted.
  for (const [key, value] of Object.entries(config.extraTopLevel ?? {})) {
    document[key] = value;
  }

  return JSON.stringify(document);
}

/**
 * Default starting configuration for a brand-new website that has no saved
 * draft yet. It contains only properties accepted by the backend
 * WebsiteConfigSchema (verified against its source): schemaVersion 1, an
 * empty theme.colors map, one allow-listed font, a minimal hero section and
 * an empty settings object. Nothing is persisted until the user explicitly
 * saves it through PUT /api/v1/websites/{id}/draft.
 */
export function createDefaultWebsiteConfig(): WebsiteConfig {
  return {
    schemaVersion: WEBSITE_CONFIG_SCHEMA_VERSION,
    theme: { colors: {}, font: 'system-ui' },
    sections: [{ type: 'hero', settings: {} }],
    settings: {},
    extraTopLevel: {}
  };
}

export function fontOptions(): { value: SupportedFont; label: string }[] {
  return SUPPORTED_FONTS.map(font => ({ value: font, label: FONT_LABELS[font] }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
