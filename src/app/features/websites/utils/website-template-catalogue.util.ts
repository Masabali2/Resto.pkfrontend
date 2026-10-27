import type { WebsiteTemplateCatalogueItem } from '../models/website-template-catalogue.model';
import type { PublicWebsiteTemplateDto } from '../models/website-template.model';
import { parseWebsiteTemplateDesign } from './website-template-design.util';

/**
 * Prepares a catalogue entry for the gallery.
 *
 * The raw `designConfigurationJson` is parsed exactly once, here, so no
 * component ever parses JSON itself. A template whose configuration cannot
 * be read still appears in the gallery — it simply renders a safe fallback
 * and carries an actionable message.
 */
export function buildCatalogueItem<T extends PublicWebsiteTemplateDto>(
  template: T
): WebsiteTemplateCatalogueItem<T> {
  const parsed = parseWebsiteTemplateDesign(template.designConfigurationJson);
  const configuration = parsed.viewModel?.configuration ?? null;

  const category = configuration?.category ?? '';
  const tags = configuration?.tags ?? [];

  const searchHaystack = [
    template.name,
    template.description ?? '',
    template.templateKey,
    category,
    ...tags
  ]
    .join(' ')
    .toLowerCase();

  return {
    template,
    design: parsed.viewModel,
    designError: parsed.error,
    category,
    tags,
    featured: configuration?.featured ?? false,
    displayOrder: configuration?.displayOrder ?? 0,
    searchHaystack
  };
}
