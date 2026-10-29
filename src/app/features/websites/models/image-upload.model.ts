
export type UploadDestinationKind = 'website-section' | 'restaurant-logo' | 'menu-item';

export interface WebsiteSectionDestination {
  kind: 'website-section';
  websiteId: string;
  sectionType: 'hero' | 'about' | 'gallery';
  /** Section setting key to write the asset id into (e.g. `imageUrl`). */
  settingKey: string;
  /** Optional display order for gallery images. */
  displayOrder?: number;
}

export interface RestaurantLogoDestination {
  kind: 'restaurant-logo';
  restaurantId: string;
}

export interface MenuItemDestination {
  kind: 'menu-item';
  menuItemId: string;
}

export type UploadDestination =
  | WebsiteSectionDestination
  | RestaurantLogoDestination
  | MenuItemDestination;

export interface AssetUploadResult {
  assetId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  previewUrl: string;
  destinationKind: UploadDestinationKind;
}

export interface UploadImageRequest {
  file: File;
  destination: UploadDestination;
  /** Optional asset type bound to the upload (branding assets only). */
  assetType?: string;
}

export interface ImageUploadOptions {
  maxFileSizeBytes: number;
  maxWidth: number;
  maxHeight: number;
  allowedContentTypes: string[];
}
