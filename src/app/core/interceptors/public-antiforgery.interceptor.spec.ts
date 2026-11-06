import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { publicAntiforgeryInterceptor } from './public-antiforgery.interceptor';

describe('publicAntiforgeryInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  const publicUrl = environment.apiUrl + '/v1/public/restaurants/sample-restaurant/orders';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([publicAntiforgeryInterceptor])),
        provideHttpClientTesting()
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adds the antiforgery header and credentials to public mutations', () => {
    httpClient.post(publicUrl, { customerName: 'Test Customer' }).subscribe();

    const tokenRequest = http.expectOne(environment.apiUrl + '/antiforgery-token');
    expect(tokenRequest.request.method).toBe('GET');
    tokenRequest.flush({ token: 'csrf-token' });

    const orderRequest = http.expectOne(publicUrl);
    expect(orderRequest.request.method).toBe('POST');
    expect(orderRequest.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(orderRequest.request.credentials).toBe('include');
    orderRequest.flush({ success: true });
  });

  it('refreshes the token and retries a public mutation after an antiforgery 400', () => {
    const errors: unknown[] = [];
    httpClient.post(publicUrl, {}).subscribe({ error: error => errors.push(error) });

    http.expectOne(environment.apiUrl + '/antiforgery-token').flush({ token: 'expired-token' });
    const rejected = http.expectOne(publicUrl);
    expect(rejected.request.headers.get('X-XSRF-TOKEN')).toBe('expired-token');
    rejected.flush({ message: 'Invalid antiforgery token.' }, {
      status: 400,
      statusText: 'Bad Request'
    });

    http.expectOne(environment.apiUrl + '/antiforgery-token').flush({ token: 'fresh-token' });
    const retry = http.expectOne(publicUrl);
    expect(retry.request.headers.get('X-XSRF-TOKEN')).toBe('fresh-token');
    expect(retry.request.credentials).toBe('include');
    retry.flush({ success: true });

    expect(errors).toEqual([]);
  });

  it('does not request an antiforgery token for reads or non-public mutations', () => {
    httpClient.get(publicUrl).subscribe();
    http.expectOne(publicUrl).flush({ success: true });

    httpClient.post(environment.apiUrl + '/restaurants/restaurant-1/orders', {}).subscribe();
    http.expectOne(environment.apiUrl + '/restaurants/restaurant-1/orders').flush({ success: true });

    http.expectNone(environment.apiUrl + '/antiforgery-token');
  });
});
