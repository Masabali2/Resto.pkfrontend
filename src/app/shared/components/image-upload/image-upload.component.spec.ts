import { of } from 'rxjs';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ImageUploadComponent } from './image-upload.component';
import { ImageUploadService } from '../../../features/websites/services/image-upload.service';
import type { AssetUploadResult } from '../../../features/websites/models/image-upload.model';

class FakeUploadService {
  lastRequest: { file: File; destination: any } | null = null;
  upload = (req: { file: File; destination: any }) => {
    this.lastRequest = req;
    return of(uploadedResult);
  };
}

const uploadedResult: AssetUploadResult = {
  assetId: 'a1',
  fileName: 'photo.png',
  contentType: 'image/png',
  fileSize: 100,
  width: 10,
  height: 10,
  previewUrl: '/api/v1/files/k.png',
  destinationKind: 'website-section'
};

const destination = {
  kind: 'website-section',
  websiteId: 'w1',
  sectionType: 'hero',
  settingKey: 'imageUrl'
};

describe('ImageUploadComponent', () => {
  let fixture: ComponentFixture<ImageUploadComponent>;
  let component: ImageUploadComponent;
  let uploadService: FakeUploadService;

  beforeEach(() => {
    uploadService = new FakeUploadService();
    TestBed.configureTestingModule({
      imports: [ImageUploadComponent],
      providers: [{ provide: ImageUploadService, useValue: uploadService }]
    });
    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('destination', destination);
    fixture.detectChanges();
  });

  it('emits the uploaded asset result when the service succeeds', () => {
    let emitted: AssetUploadResult | null = null;
    component.uploaded.subscribe(result => (emitted = result));

    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    fixture.whenStable().then(() => {
      expect(uploadService.lastRequest).not.toBeNull();
      expect(uploadService.lastRequest!.file).toBe(file);
      expect(uploadService.lastRequest!.destination).toEqual(destination);
      expect(emitted).toEqual(uploadedResult);
    });
  });

  it('does not upload when no destination is configured', () => {
    fixture.componentRef.setInput('destination', null);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    fixture.whenStable().then(() => {
      expect(uploadService.lastRequest).toBeNull();
    });
  });

  it('exposes a preview URL after selecting an image', () => {
    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    fixture.detectChanges();
    const preview = fixture.nativeElement.querySelector('img.image-upload__preview');
    expect(preview).not.toBeNull();
    expect((preview as HTMLImageElement).src).toContain('blob:');
  });
});
