/**
 * Mirrors the backend WebsiteDraftDto (implemented in WebsitesController:
 * GET api/v1/websites/{id}/draft). Delivered inside the standard ApiResponse
 * envelope. HasDraft=false with null payload is a SUCCESS response meaning no
 * draft exists yet; published content is never returned through this endpoint.
 */
export interface WebsiteDraftDto {
  websiteId: string;
  hasDraft: boolean;
  /** Raw configuration JSON exactly as stored in the draft version. */
  configurationJson: string | null;
  /** Draft configuration version number, or null when no draft exists yet. */
  version: number | null;
}
