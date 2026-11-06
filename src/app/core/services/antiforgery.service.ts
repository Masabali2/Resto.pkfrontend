import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AntiforgeryResponse { token: string; }

@Injectable({ providedIn: 'root' })
export class AntiforgeryService {
  private readonly http = inject(HttpClient);
  private tokenRequest$: Observable<string> | null = null;

  getToken(forceRefresh = false): Observable<string> {
    if (!forceRefresh && this.tokenRequest$) {
      return this.tokenRequest$;
    }

    const request$ = this.http.get<AntiforgeryResponse>(environment.apiUrl + '/antiforgery-token').pipe(
      map(response => response.token),
      tap(token => { if (!token) this.tokenRequest$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.tokenRequest$ = request$;
    return request$;
  }
  invalidate(): void { this.tokenRequest$ = null; }
}
