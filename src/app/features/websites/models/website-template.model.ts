/**
 * Catalogue entry of the platform-owned website template list.
 *
 * Verified against the backend `WebsiteTemplateDto` record
 * (RestaurantSaaS.Application/Features/Websites/DTOs/WebsiteDtos.cs).
 */
export interface WebsiteTemplateDto {
  id: string;
  name: string;
  description: string | null;
  templateKey: string;
  previewImageFileId: string | null;
  isActive: boolean;
  createdAt: string;
  /**
   * Versioned design configuration (palette, typography, layout variants,
   * section order and safe sample preview copy). It is a JSON document, not
   * markup — parse it once with `parseWebsiteTemplateDesign`.
   */
  designConfigurationJson: string | null;
}

/**
 * Entry of the ANONYMOUS public template catalogue.
 *
 * Backend contract: `PublicWebsiteTemplateDto` returned by
 * `GET api/v1/public/website-templates`. It is a strict subset of the tenant
 * catalogue entry — only these five fields exist, because the endpoint must
 * not expose administrative metadata (`isActive`, `createdAt`) or storage
 * references (`previewImageFileId`). Display order, when present, lives inside
 * `designConfigurationJson` and is read by the validated design parser.
 */
export type PublicWebsiteTemplateDto = Pick<
  WebsiteTemplateDto,
  'id' | 'name' | 'description' | 'templateKey' | 'designConfigurationJson'
>;
