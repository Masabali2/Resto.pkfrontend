import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AntiforgeryService } from './antiforgery.service';

describe('AntiforgeryService', () => {
  let service: AntiforgeryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AntiforgeryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shares an in-flight and cached token request', () => {
    const tokens: string[] = [];
    service.getToken().subscribe(token => tokens.push(token));
    service.getToken().subscribe(token => tokens.push(token));

    const request = http.expectOne(environment.apiUrl + '/antiforgery-token');
    expect(request.request.method).toBe('GET');
    request.flush({ token: 'csrf-token' });

    expect(tokens).toEqual(['csrf-token', 'csrf-token']);
    service.getToken().subscribe(token => tokens.push(token));
    expect(tokens).toEqual(['csrf-token', 'csrf-token', 'csrf-token']);
    http.expectNone(environment.apiUrl + '/antiforgery-token');
  });

  it('fetches a new token after invalidation or an explicit refresh', () => {
    service.getToken().subscribe();
    http.expectOne(environment.apiUrl + '/antiforgery-token').flush({ token: 'first-token' });

    service.invalidate();
    service.getToken().subscribe();
    http.expectOne(environment.apiUrl + '/antiforgery-token').flush({ token: 'second-token' });

    service.getToken(true).subscribe();
    http.expectOne(environment.apiUrl + '/antiforgery-token').flush({ token: 'third-token' });
  });
});
