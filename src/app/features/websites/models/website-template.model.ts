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
