import type { WebsiteTemplateDesignViewModel } from './website-template-design.model';
import type {
  PublicWebsiteTemplateDto,
  WebsiteTemplateDto
} from './website-template.model';

/**
 * A catalogue entry prepared for the template gallery.
 *
 * The backend catalogue is the source of truth; this view model only adds
 * the derived, presentation-ready values (parsed design configuration,
 * category, tags, featured flag and a pre-computed search haystack).
 *
 * The template type is generic so the same builder serves the tenant
 * catalogue (`WebsiteTemplateDto`, the default) and the anonymous public
 * catalogue (`PublicWebsiteTemplateDto`) without widening the public contract.
 */
export interface WebsiteTemplateCatalogueItem<
  TTemplate extends PublicWebsiteTemplateDto = WebsiteTemplateDto
> {
  template: TTemplate;
  /** Parsed and validated design configuration, or null when unavailable. */
  design: WebsiteTemplateDesignViewModel | null;
  /** Actionable message when the design configuration could not be read. */
  designError: string | null;
  category: string;
  tags: string[];
  featured: boolean;
  displayOrder: number;
  /** Lower-cased text used by the gallery search box. */
  searchHaystack: string;
}
