import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { ImageUploadService } from './image-upload.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type {
  AssetUploadResult,
  UploadDestination,
  WebsiteSectionDestination
} from '../models/image-upload.model';
import { environment } from '../../../../environments/environment';

const API_ROOT = `${environment.apiUrl}/v1`;

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let httpMock: HttpTestingController;

  const destination: WebsiteSectionDestination = {
    kind: 'website-section',
    websiteId: 'w1',
    sectionType: 'hero',
    settingKey: 'imageUrl'
  };

  const uploadedResult: AssetUploadResult = {
    assetId: 'a1',
    fileName: 'photo.png',
    contentType: 'image/png',
    fileSize: 1234,
    width: 100,
    height: 100,
    previewUrl: '/api/v1/files/key.png',
    destinationKind: 'website-section'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ImageUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POSTs the file and JSON destination to the upload endpoint', () => {
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });

    service.upload({ file, destination }).subscribe(result => {
      expect(result).toEqual(uploadedResult);
    });

    const req = httpMock.expectOne(`${API_ROOT}/assets/upload`);
    expect(req.request.method).toBe('POST');

    const formData = req.request.body as FormData;
    const uploadedFile = formData.get('file');
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe('photo.png');
    expect((uploadedFile as File).type).toBe('image/png');
    expect(formData.get('destination')).toBe(JSON.stringify(destination));
    expect(req.request.headers.get('Content-Type')).toBeNull(); // browser sets multipart boundary

    req.flush({ success: true, data: uploadedResult });
  });

  it('emits an error when the backend reports failure', () => {
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });

    let error: unknown;
    service.upload({ file, destination }).subscribe({
      error: err => (error = err)
    });

    const req = httpMock.expectOne(`${API_ROOT}/assets/upload`);
    req.flush(
      { success: false, message: 'Rejected by server.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(error).toBeTruthy();
  });
});
