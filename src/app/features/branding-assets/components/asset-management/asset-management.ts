import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification.service';
import { BrandingAssetsService, AssetReferencedError } from '../../services/branding-assets.service';
import type { BrandingAsset, BrandingAssetType } from '../../models/branding-assets.models';
import { AssetDeleteConflictModal } from '../asset-delete-conflict-modal/asset-delete-conflict-modal';

const BYTES_PER_MEBIBYTE = 1024 * 1024;
const MAX_FILE_SIZE = 6 * BYTES_PER_MEBIBYTE;

const ASSET_SLOTS: readonly { assetType: BrandingAssetType; label: string; placeholder: string }[] = [
  { assetType: 'Logo', label: 'Main Light Logo', placeholder: 'https://placehold.co/300x120/f8fafc/64748b?text=No+Asset' },
  { assetType: 'DarkLogo', label: 'Dark Header Logo', placeholder: 'https://placehold.co/300x120/0f172a/ffffff?text=No+Asset' },
  { assetType: 'Favicon', label: 'Favicon / App Icon', placeholder: 'https://placehold.co/64x64/f8fafc/64748b?text=No+Asset' },
  { assetType: 'OGBanner', label: 'Social Share Cover', placeholder: 'https://placehold.co/500x250/f8fafc/64748b?text=No+Asset' },
  { assetType: 'HeroBanner', label: 'Public Website Hero Banner', placeholder: 'https://placehold.co/800x320/f8fafc/64748b?text=No+Asset' }
];

@Component({
  selector: 'app-asset-management',
  standalone: true,
  imports: [AssetDeleteConflictModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asset-management.html',
  styleUrl: './asset-management.css'
})
export class AssetManagement {
  private readonly brandingService = inject(BrandingAssetsService);
  private readonly notification = inject(NotificationService);

  readonly assets = input<BrandingAsset[]>([]);
  readonly restaurant = input<string | null>(null);
  readonly loading = input<boolean>(false);

  readonly assetsChange = output<BrandingAsset[]>();

  readonly slots = ASSET_SLOTS;

  private readonly assetsSignal = signal<BrandingAsset[]>([]);
  readonly pendingAssetType = signal<BrandingAssetType | null>(null);
  readonly uploading = signal<BrandingAssetType | null>(null);
  readonly deleting = signal<BrandingAssetType | null>(null);
  readonly conflictOpen = signal<boolean>(false);
  readonly conflictAsset = signal<BrandingAsset | null>(null);

  constructor() {
    effect(() => {
      this.assetsSignal.set(this.assets());
    });
  }

  /** Asset currently bound to each slot type. */
  readonly assetByType = computed(() => {
    const list = this.assetsSignal();
    const map: Record<string, BrandingAsset | null> = {};
    for (const type of ASSET_SLOTS.map(s => s.assetType)) {
      map[type] = list.find(a => a.assetType === type) ?? null;
    }
    return map;
  });

  protected previewUrlFor(type: BrandingAssetType): string {
    const asset = this.assetByType()[type];
    return asset?.previewUrl ?? this.slotPlaceholder(type);
  }

  protected slotPlaceholder(type: BrandingAssetType): string {
    return ASSET_SLOTS.find(s => s.assetType === type)?.placeholder ?? '';
  }

  protected fileNameFor(type: BrandingAssetType): string {
    const asset = this.assetByType()[type];
    return asset ? asset.fileName : this.defaultFileName(type);
  }

  protected sizeTextFor(type: BrandingAssetType): string {
    const asset = this.assetByType()[type];
    if (!asset) {
      return '—';
    }
    return `${(asset.fileSize / BYTES_PER_MEBIBYTE).toFixed(2)} MB`;
  }

  protected defaultFileName(type: BrandingAssetType): string {
    switch (type) {
      case 'Logo': return 'logo.png';
      case 'DarkLogo': return 'logo-dark.png';
      case 'Favicon': return 'favicon.ico';
      case 'OGBanner': return 'og-banner.jpg';
      case 'HeroBanner': return 'hero-banner.jpg';
    }
    return 'asset';
  }

  protected isUploading(type: BrandingAssetType): boolean {
    return this.uploading() === type;
  }

  protected isDeleting(type: BrandingAssetType): boolean {
    return this.deleting() === type;
  }

  protected triggerUpload(type: BrandingAssetType): void {
    if (this.loading()) return;
    this.pendingAssetType.set(type);
    const input = document.getElementById('brandingGlobalFileInput') as HTMLInputElement | null;
    if (input) {
      input.click();
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const file = input.files?.[0] ?? null;
    const type = this.pendingAssetType();
    if (!file || !type) {
      input.value = '';
      return;
    }

    const restaurantId = this.restaurant();
    if (!restaurantId) {
      this.notification.error('No restaurant is selected. Please select a restaurant first.');
      input.value = '';
      this.pendingAssetType.set(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notification.error('Only image files are accepted.');
      input.value = '';
      this.pendingAssetType.set(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.notification.error(`${file.name} exceeds the 6 MB file size limit.`);
      input.value = '';
      this.pendingAssetType.set(null);
      return;
    }

    this.uploading.set(type);
    this.notification.info(`Uploading ${file.name} as ${type}...`);

    this.brandingService
      .uploadAsset(file, restaurantId, type)
      .pipe(finalize(() => { this.uploading.set(null); input.value = ''; this.pendingAssetType.set(null); }))
      .subscribe({
        next: result => {
          const asset: BrandingAsset = {
            id: result.assetId,
            assetType: type,
            fileName: result.fileName,
            contentType: result.contentType,
            fileSize: result.fileSize,
            storageKey: result.assetId,
            previewUrl: result.previewUrl,
            created: new Date().toISOString().split('T')[0],
            isReferenced: false
          };

          this.assetsSignal.update(list => {
            const existing = list.findIndex(a => a.assetType === type);
            if (existing >= 0) {
              const next = [...list];
              next[existing] = asset;
              return next;
            }
            return [asset, ...list];
          });

          this.assetsChange.emit(this.assetsSignal());
          this.notification.success(`${type} asset uploaded successfully.`);
        },
        error: err => {
          this.notification.error(err instanceof Error ? err.message : 'Upload failed.');
        }
      });
  }

  protected handleDelete(type: BrandingAssetType): void {
    const asset = this.assetByType()[type];
    if (!asset) {
      return;
    }

    if (asset.isReferenced) {
      this.conflictAsset.set(asset);
      this.conflictOpen.set(true);
      return;
    }

    this.doDelete(type);
  }

  private doDelete(type: BrandingAssetType): void {
    const asset = this.assetByType()[type];
    if (!asset) return;

    this.deleting.set(type);

    this.brandingService
      .deleteAsset(asset.id)
      .pipe(finalize(() => this.deleting.set(null)))
      .subscribe({
        next: () => {
          this.assetsSignal.update(list => list.filter(a => a.id !== asset.id));
          this.assetsChange.emit(this.assetsSignal());
          this.notification.success(`${type} asset deleted.`);
        },
        error: err => {
          this.notification.error(err instanceof Error ? err.message : 'Delete failed.');
        }
      });
  }

  protected dismissConflict(): void {
    this.conflictOpen.set(false);
    this.conflictAsset.set(null);
  }
}
