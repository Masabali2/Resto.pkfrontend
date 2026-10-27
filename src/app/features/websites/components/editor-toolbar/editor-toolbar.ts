import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { WebsiteDto } from '../../models/website.model';

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export interface CompareData {
  draftConfig: unknown;
  publishedConfig: unknown | null;
  differences: ConfigDifference[];
}

export interface ConfigDifference {
  path: string;
  draftValue: unknown;
  publishedValue: unknown;
  type: 'added' | 'removed' | 'changed';
}

export type EditorState = 'loading' | 'ready' | 'no-draft' | 'draft-invalid' | 'missing' | 'error';
export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed';
export type PublishState = 'idle' | 'confirming' | 'publishing' | 'unpublishing';

const VIEWPORT_SIZES: Record<ViewportMode, { width: number; label: string; icon: string }> = {
  mobile: { width: 375, label: 'Mobile', icon: '📱' },
  tablet: { width: 768, label: 'Tablet', icon: '📟' },
  desktop: { width: 1200, label: 'Desktop', icon: '💻' }
};

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-toolbar.html',
  styleUrl: './editor-toolbar.css'
})
export class EditorToolbar {
  readonly website = input.required<WebsiteDto | null>();
  readonly saveState = input.required<SaveState>();
  readonly publishState = input.required<PublishState>();
  readonly editorState = input.required<EditorState>();
  readonly viewportMode = input.required<ViewportMode>();
  readonly publicationLabel = input.required<string>();
  readonly canPublish = input.required<boolean>();
  readonly publishBlockedReason = input<string | null>(null);
  readonly publicSiteUrl = input<string | null>(null);
  readonly hasUnsavedChanges = input.required<boolean>();
  readonly isComparing = input(false);
  readonly compareData = input<CompareData | null>(null);

  readonly backClick = output<void>();
  readonly saveClick = output<void>();
  readonly publishClick = output<void>();
  readonly unpublishClick = output<void>();
  readonly previewClick = output<void>();
  readonly compareClick = output<void>();
  readonly viewportChange = output<ViewportMode>();

  protected readonly viewportModes = ['mobile', 'tablet', 'desktop'] as const;
  protected readonly viewportInfo = VIEWPORT_SIZES;

  protected readonly saveLabel = computed(() => {
    switch (this.saveState()) {
      case 'dirty': return 'Unsaved changes';
      case 'saving': return 'Saving…';
      case 'saved': return 'Saved';
      case 'failed': return 'Save failed — try again';
      default: return 'No changes';
    }
  });

  protected readonly isSaveDisabled = computed(() =>
    this.saveState() === 'saving' || this.saveState() === 'clean' || !this.hasUnsavedChanges()
  );

  protected onViewportClick(mode: ViewportMode): void {
    this.viewportChange.emit(mode);
  }
}