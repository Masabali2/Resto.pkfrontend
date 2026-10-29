
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import type { StorageInfo } from '../../models/branding-assets.models';
import type { RestaurantDto } from '../../../../core/models/restaurant.model';

@Component({
  selector: 'app-branding-header',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branding-header.html',
  styleUrl: './branding-header.css'
})
export class BrandingHeader {
  readonly restaurant = input<RestaurantDto | null>(null);
  readonly storage = input<StorageInfo | null>(null);
  readonly storageLoading = input<boolean>(false);
  readonly dirty = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly previewClicked = output<void>();
  readonly saveClicked = output<void>();

  protected readonly storagePercent = computed(() => {
    const storage = this.storage();
    const quotaBytes = storage?.quotaBytes;

    if (!storage || quotaBytes == null || quotaBytes <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((storage.usedBytes / quotaBytes) * 100)
    );
  });

  protected readonly storageUsedText = computed(() => {
    const storage = this.storage();

    if (!storage) {
      return '—';
    }

    const quotaBytes = storage.quotaBytes;

    return `${this.formatBytes(storage.usedBytes)} / ${
      quotaBytes == null ? '—' : this.formatBytes(quotaBytes)
    }`;
  });

  private formatBytes(bytes: number): string {
    if (bytes <= 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(k)),
      sizes.length - 1
    );

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
