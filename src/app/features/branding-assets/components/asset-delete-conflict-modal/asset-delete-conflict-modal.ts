import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import type { BrandingAsset } from '../../models/branding-assets.models';

@Component({
  selector: 'app-asset-delete-conflict-modal',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asset-delete-conflict-modal.html',
  styleUrl: './asset-delete-conflict-modal.css'
})
export class AssetDeleteConflictModal {
  readonly open = input<boolean>(false);
  readonly asset = input<BrandingAsset | null>(null);

  readonly dismiss = output<void>();
}
