import type { PagedResult } from './paged-result.model';

export interface CreateWebsiteRequest {
  restaurantId: string;
  websiteTemplateId: string;
  name: string;
  slug: string;
}

/** Body of PUT /api/v1/websites/{id}/draft. */
export interface SaveWebsiteDraftRequest {
  configurationJson: string;
}

/** Mirrors backend WebsiteStatus enum (Draft = 1, Published = 2, Unpublished = 3). */
export type WebsiteStatus = 'Draft' | 'Published' | 'Unpublished';

/**
 * Verified against backend WebsiteDtos.cs `WebsiteDto` record
 * (RestaurantSaaS.Application/Features/Websites/DTOs/WebsiteDtos.cs).
 */
export interface WebsiteDto {
  id: string;
  tenantId: string;
  restaurantId: string;
  restaurantName: string;
  websiteTemplateId: string;
  templateName: string;
  templateKey: string;
  name: string;
  slug: string;
  status: WebsiteStatus;
  isPublished: boolean;
  publishedAt: string | null;
  draftVersion: number | null;
  publishedVersion: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export type WebsitesPage = PagedResult<WebsiteDto>;
