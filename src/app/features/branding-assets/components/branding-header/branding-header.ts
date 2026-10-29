import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { StorageInfo } from '../../models/branding-assets.models';
import type { RestaurantDto } from '../../../../core/models/restaurant.model';

@Component({
  selector: 'app-branding-header',
  standalone: true,
  imports: [RouterLink],
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
    if (!storage || storage.quotaBytes <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((storage.usedBytes / storage.quotaBytes) * 100));
  });

  protected readonly storageUsedText = computed(() => {
    const storage = this.storage();
    if (!storage) {
      return '—';
    }
    return `${this.formatBytes(storage.usedBytes)} / ${this.formatBytes(storage.quotaBytes)}`;
  });

  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
