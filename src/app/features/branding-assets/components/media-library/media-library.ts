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
import type { BrandingAsset } from '../../models/branding-assets.models';
import { AssetDeleteConflictModal } from '../asset-delete-conflict-modal/asset-delete-conflict-modal';

const BYTES_PER_MEBIBYTE = 1024 * 1024;

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [AssetDeleteConflictModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './media-library.html',
  styleUrl: './media-library.css'
})
export class MediaLibrary {
  private readonly brandingService = inject(BrandingAssetsService);
  private readonly notification = inject(NotificationService);

  readonly assets = input<BrandingAsset[]>([]);
  readonly restaurant = input<string | null>(null);
  readonly loading = input<boolean>(false);

  readonly assetsChange = output<BrandingAsset[]>();

  private readonly assetsSignal = signal<BrandingAsset[]>([]);
  readonly deleting = signal<string | null>(null);
  readonly conflictOpen = signal<boolean>(false);
  readonly conflictAsset = signal<BrandingAsset | null>(null);

  constructor() {
    effect(() => {
      this.assetsSignal.set(this.assets());
    });
  }

  protected readonly rows = computed(() => this.assetsSignal().slice().reverse());

  protected sizeText(bytes: number): string {
    return `${(bytes / BYTES_PER_MEBIBYTE).toFixed(2)} MB`;
  }

  protected typeBadgeClass(assetType: string): string {
    return assetType === 'Logo' || assetType === 'HeroBanner'
      ? 'asset-type-badge asset-type-badge-brand'
      : 'asset-type-badge asset-type-badge-default';
  }

  protected handleDelete(asset: BrandingAsset): void {
    if (asset.isReferenced) {
      this.conflictAsset.set(asset);
      this.conflictOpen.set(true);
      return;
    }
    this.doDelete(asset);
  }

  private doDelete(asset: BrandingAsset): void {
    this.deleting.set(asset.id);

    this.brandingService
      .deleteAsset(asset.id)
      .pipe(finalize(() => this.deleting.set(null)))
      .subscribe({
        next: () => {
          this.assetsSignal.update(list => list.filter(a => a.id !== asset.id));
          this.assetsChange.emit(this.assetsSignal());
          this.notification.success(`${asset.fileName} deleted.`);
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
