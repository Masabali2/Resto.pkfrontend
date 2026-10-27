import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { WebsiteService } from './website.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { PublicWebsiteTemplateDto } from '../models/website-template.model';

const API_ROOT = 'https://localhost:7182/api';

describe('WebsiteService template catalogues', () => {
  let service: WebsiteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(WebsiteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getPublicTemplates calls the anonymous public endpoint', () => {
    const publicTemplate: PublicWebsiteTemplateDto = {
      id: 't1',
      name: 'Spice Garden',
      description: 'Desi',
      templateKey: 'spice-garden',
      designConfigurationJson: '{"schemaVersion":1}'
    };

    let received: ApiResponse<PublicWebsiteTemplateDto[]> | null = null;

    service.getPublicTemplates().subscribe(response => {
      received = response;
    });

    const request = httpMock.expectOne(`${API_ROOT}/v1/public/website-templates`);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({
      success: true,
      data: [publicTemplate],
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    } satisfies ApiResponse<PublicWebsiteTemplateDto[]>);

    expect(received).not.toBeNull();
    expect(received!.success).toBe(true);
    expect(received!.data?.[0].templateKey).toBe('spice-garden');
  });

  it('keeps getTemplates on the protected tenant endpoint', () => {
    service.getTemplates().subscribe();

    const request = httpMock.expectOne(`${API_ROOT}/v1/websites/templates`);

    expect(request.request.method).toBe('GET');

    request.flush({
      success: true,
      data: [],
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    });
  });
});
