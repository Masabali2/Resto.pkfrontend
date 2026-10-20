export interface WebsiteTemplateDto {
  id: string;
  name: string;
  description: string | null;
  templateKey: string;
  previewImageFileId: string | null;
  isActive: boolean;
  createdAt: string;
}
