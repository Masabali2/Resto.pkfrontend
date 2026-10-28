import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';
import { ImageUploadService } from '../../../features/websites/services/image-upload.service';
import type {
  AssetUploadResult,
  UploadDestination
} from '../../../features/websites/models/image-upload.model';
import { NotificationService } from '../../../core/services/notification.service';

const BYTES_PER_MEBIBYTE = 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/**
 * Reusable, context-aware image upload control.
 *
 * The parent supplies a typed `destination` describing the authorized
 * resource (website section, restaurant logo, or menu item). The component
 * never lets the caller pick an arbitrary role or destination — that is
 * resolved server-side from the trusted session.
 *
 * Emits `uploaded` with the stable asset result so the parent can persist the
 * association (e.g. write the asset id into a section setting or menu item
 * imageFileId).
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.css',
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)'
  }
})
export class ImageUploadComponent {
  private readonly uploadService = inject(ImageUploadService);
  private readonly notification = inject(NotificationService);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Authorized upload destination supplied by the parent feature. */
  readonly destination = input<UploadDestination | null>(null);

  /** Human-readable label rendered on the drop zone / button. */
  readonly label = input<string>('Upload image');

  /** Optional hint shown below the control. */
  readonly hint = input<string | null>(null);

  /** Maximum file size in bytes. Defaults to 5 MiB. */
  readonly maxFileSizeBytes = input<number>(5 * BYTES_PER_MEBIBYTE);

  /** Whether multiple files may be selected (gallery). */
  readonly multiple = input<boolean>(false);

  /** Whether the control is disabled. */
  readonly disabled = input<boolean>(false);

  /** Accepted image MIME types for the file input. */
  protected readonly acceptedTypes = ACCEPTED_IMAGE_TYPES;

  /** Emitted when an image uploads successfully. */
  readonly uploaded = output<AssetUploadResult>();

  /** Emitted when an upload fails after retries are exhausted. */
  readonly uploadFailed = output<{ file: File; message: string }>();

  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);
  protected readonly preview = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly recentResults = signal<AssetUploadResult[]>([]);

  /** Max file size in mebibytes, exposed to the template for display. */
  protected readonly maxFileSizeMebibytes = computed(() =>
    Math.round(this.maxFileSizeBytes() / BYTES_PER_MEBIBYTE)
  );

  protected fileSizeMebibytes(bytes: number): string {
    return (bytes / BYTES_PER_MEBIBYTE).toFixed(2);
  }

  private readonly objectUrls = new Set<string>();
  private uploadingFile: File | null = null;
  private abortController: AbortController | null = null;

  protected onFileInputChange(event: Event): void {
    const fileInputEl = event.target as HTMLInputElement | null;
    const files = fileInputEl?.files ? Array.from(fileInputEl.files) : [];
    this.handleFiles(files);
    if (fileInputEl) {
      fileInputEl.value = '';
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    this.handleFiles(files);
  }

  protected openFilePicker(): void {
    if (this.disabled()) return;
    this.fileInput()?.nativeElement.click();
  }

  protected retry(): void {
    const file = this.uploadingFile;
    if (!file || this.uploading()) return;
    this.error.set(null);
    this.progress.set(0);
    this.uploadFile(file);
  }

  protected cancel(): void {
    this.abortController?.abort();
    this.resetUploadState();
    this.revokePreview();
  }

  protected removeAsset(result: AssetUploadResult): void {
    this.recentResults.update(list => list.filter(r => r.assetId !== result.assetId));
  }

  private handleFiles(files: File[]): void {
    if (this.disabled()) return;
    this.error.set(null);

    const images = files.filter(f => f.type.startsWith('image/'));
    const nonImages = files.filter(f => !f.type.startsWith('image/'));

    if (nonImages.length) {
      this.notification.error('Only image files (JPEG, PNG, WebP) are accepted.');
    }

    if (!this.multiple() && images.length > 1) {
      this.notification.error('Please select a single image.');
      return;
    }

    if (images.length === 0) return;

    for (const file of images) {
      const clientSize = this.maxFileSizeBytes();
      if (file.size > clientSize) {
      this.notification.error(
        `${file.name} exceeds the ${this.maxFileSizeMebibytes()} MiB limit.`
      );
        continue;
      }
      this.uploadFile(file);
    }
  }

  private uploadFile(file: File): void {
    if (this.uploading() && !this.multiple()) return;

    this.uploadingFile = file;
    this.uploading.set(true);
    this.error.set(null);
    this.progress.set(0);

    const destination = this.destination();
    if (!destination) {
      this.error.set('No upload destination is configured.');
      this.uploadingFile = null;
      this.uploading.set(false);
      this.progress.set(0);
      this.revokePreview();
      return;
    }

    this.revokePreview();
    const objectUrl = URL.createObjectURL(file);
    this.objectUrls.add(objectUrl);
    this.preview.set(objectUrl);

    this.abortController = new AbortController();

    this.uploadService
      .upload({ file, destination })
      .pipe(finalize(() => this.resetUploadState()))
      .subscribe({
        next: result => {
          this.progress.set(100);
          this.recentResults.update(list => [...list, result]);
          this.uploaded.emit(result);
          this.notification.success('Image uploaded.');
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Upload failed.';
          this.error.set(message);
          this.uploadingFile = null;
          this.uploadFailed.emit({ file, message });
          this.notification.error(message);
        }
      });
  }

  private resetUploadState(): void {
    this.uploading.set(false);
    this.progress.set(0);
    this.uploadingFile = null;
    this.abortController = null;
  }

  private revokePreview(): void {
    for (const url of this.objectUrls) {
      try { URL.revokeObjectURL(url); } catch { /* best effort */ }
    }
    this.objectUrls.clear();
    this.preview.set(null);
  }

  ngOnDestroy(): void {
    this.cancel();
    this.revokePreview();
  }
}
