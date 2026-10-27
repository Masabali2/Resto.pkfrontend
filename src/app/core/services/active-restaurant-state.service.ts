
import { HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';
import { AuthStateService } from './auth-state.service';
import { HttpErrorHandlerService } from './http-error-handler.service';
import { RestaurantService } from './restaurant.service';
import { isActiveRestaurantStatus } from '../utils/restaurant-status.util';
import type { ActiveRestaurantState } from '../models/active-restaurant.model';
import type { RestaurantDto } from '../models/restaurant.model';

/** Number of restaurants requested per page. */
const RESTAURANT_PAGE_SIZE = 100;

interface RestaurantOutcome {  state: ActiveRestaurantState;
  restaurant: RestaurantDto | null;
  restaurants: RestaurantDto[];
  message: string | null;
}

type RestaurantListResult =
  | {
      kind: 'ok';
      items: RestaurantDto[];
      totalPages: number;
    }
  | {
      kind: 'failed';
      message: string;
    };

const LIST_ERROR_MESSAGE = 'We could not load your restaurants. Please try again.';
const DETAIL_ERROR_MESSAGE =
  'We could not load the selected restaurant. Please try again.';

/**
 * Single source of truth for the restaurant the user is working with.
 *
 * The service is tenant aware: it always reads the restaurants of the
 * *active* tenant through the tenant scoped API. The tenant itself is taken
 * from the auth state and is never sent by this service — the tenant
 * interceptor attaches it to the request.
 *
 * Responsibilities:
 *  - keep the selected restaurant of the active tenant in shared state,
 *  - reload the restaurants whenever the active tenant changes,
 *  - read the detail of the selected restaurant,
 *  - expose the state the presentation layer needs.
 *
 * The service owns no markup and no HTTP details of its own.
 */
@Injectable({
  providedIn: 'root'
})
export class ActiveRestaurantStateService {
  private readonly authState = inject(AuthStateService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSignal = signal<ActiveRestaurantState>('idle');
  private readonly restaurantSignal = signal<RestaurantDto | null>(null);
  private readonly restaurantsSignal = signal<RestaurantDto[]>([]);
  private readonly messageSignal = signal<string | null>(null);
  private readonly tenantIdSignal = signal<string | null>(null);
  private readonly loadingSignal = signal(false);

  /**
   * Incremented for every request that starts. A response that belongs to an
   * outdated request is discarded, so a slow answer of a previous tenant can
   * never replace the current selection.
   */
  private requestToken = 0;

  readonly state = this.stateSignal.asReadonly();
  readonly restaurant = this.restaurantSignal.asReadonly();
  readonly restaurants = this.restaurantsSignal.asReadonly();
  readonly errorMessage = this.messageSignal.asReadonly();
  readonly activeTenantId = this.tenantIdSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  /** True when the active tenant owns more than one restaurant. */
  readonly hasMultipleRestaurants = computed(
    () => this.restaurantsSignal().length > 1
  );

  /** True when a restaurant of the active tenant is selected. */
  readonly hasRestaurant = computed(() => this.restaurantSignal() !== null);

  constructor() {
    toObservable(this.authState.authResult)
      .pipe(
        map(result => result?.activeTenant?.tenantId ?? null),
        distinctUntilChanged(),
        tap(tenantId => this.beginTenantScope(tenantId)),
        switchMap(tenantId => {
          const token = this.requestToken;

          return this.loadForTenant(tenantId, null).pipe(
            map(outcome => ({ token, outcome }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ token, outcome }) => this.applyOutcome(outcome, token));
  }

  /**
   * Selects another restaurant of the active tenant and reads its detail.
   *
   * The tenant is never changed here: the selection only moves inside the
   * restaurants the current tenant owns.
   */
  selectRestaurant(restaurantId: string): void {
    const tenantId = this.tenantIdSignal();

    if (!tenantId || this.restaurantSignal()?.id === restaurantId) {
      return;
    }

    const token = ++this.requestToken;

    this.loadingSignal.set(true);
    this.messageSignal.set(null);

    this.restaurantService
      .getRestaurantById(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response): void => {
          if (token !== this.requestToken) {
            return;
          }

          this.loadingSignal.set(false);

          if (!response.success || !response.data) {
            this.stateSignal.set('error');
            this.restaurantSignal.set(null);
            this.messageSignal.set(response.message ?? DETAIL_ERROR_MESSAGE);

            return;
          }

          this.stateSignal.set('resolved');
          this.restaurantSignal.set(response.data);
          this.messageSignal.set(null);
        },
        error: (error: unknown): void => {
          if (token !== this.requestToken) {
            return;
          }

          const outcome = this.toFailureOutcome(error, this.restaurantsSignal());

          this.loadingSignal.set(false);
          this.stateSignal.set(outcome.state);
          this.restaurantSignal.set(null);
          this.messageSignal.set(outcome.message);
        }
      });
  }

  /** Reads the restaurants of the active tenant again. */
  refresh(): void {
    const tenantId = this.tenantIdSignal();

    if (!tenantId) {
      return;
    }

    const token = ++this.requestToken;

    this.loadingSignal.set(true);
    this.messageSignal.set(null);

    this.loadForTenant(tenantId, this.restaurantSignal()?.id ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(outcome => this.applyOutcome(outcome, token));
  }

  /**
   * Prepares the state for a new active tenant. The previous tenant and its
   * restaurants are dropped immediately so nothing of the previous workspace
   * stays visible while the new restaurants are read.
   */
  private beginTenantScope(tenantId: string | null): void {
    this.requestToken++;
    this.tenantIdSignal.set(tenantId);
    this.restaurantSignal.set(null);
    this.restaurantsSignal.set([]);
    this.messageSignal.set(null);
    this.loadingSignal.set(tenantId !== null);
    this.stateSignal.set(tenantId === null ? 'idle' : 'loading');
  }

  /**
   * Reads the restaurants of the given tenant and the detail of the selected
   * one. `preferredId` keeps a previous selection when it is still part of
   * the freshly loaded list.
   */
  private loadForTenant(
    tenantId: string | null,
    preferredId: string | null
  ): Observable<RestaurantOutcome> {
    if (tenantId === null) {
      return of({
        state: 'idle',
        restaurant: null,
        restaurants: [],
        message: null
      });
    }

    return this.loadAllRestaurants().pipe(
      switchMap(result => {
        if (result.kind === 'failed') {
          return of({
            state: 'error',
            restaurant: null,
            restaurants: [],
            message: result.message
          } satisfies RestaurantOutcome);
        }

        const candidate = this.pickCandidate(result.items, preferredId);

        if (!candidate) {
          return of({
            state: 'empty',
            restaurant: null,
            restaurants: result.items,
            message: null
          } satisfies RestaurantOutcome);
        }

        return this.restaurantService.getRestaurantById(candidate.id).pipe(
          map(
            (response): RestaurantOutcome =>
              response.success && response.data
                ? {
                    state: 'resolved',
                    restaurant: response.data,
                    restaurants: result.items,
                    message: null
                  }
                : {
                    state: 'error',
                    restaurant: null,
                    restaurants: result.items,
                    message: response.message ?? DETAIL_ERROR_MESSAGE
                  }
          ),
          catchError((error: unknown) =>
            of(this.toFailureOutcome(error, result.items))
          )
        );
      }),
      catchError((error: unknown) => of(this.toFailureOutcome(error, [])))
    );
  }

  /**
   * Reads every page of the restaurant list of the active tenant.
   *
   * The first page decides how many pages exist; the remaining pages are
   * requested explicitly so a tenant with more restaurants than the page
   * size holds is never truncated to its first page.
   */
  private loadAllRestaurants(): Observable<RestaurantListResult> {
    return this.restaurantService
      .getRestaurants(1, RESTAURANT_PAGE_SIZE)
      .pipe(
        map(
          (response): RestaurantListResult => {
            if (!response.success || !response.data) {
              return {
                kind: 'failed',
                message: response.message ?? LIST_ERROR_MESSAGE
              };
            }

            return {
              kind: 'ok',
              items: [...(response.data.items ?? [])],
              totalPages: Math.max(1, response.data.totalPages ?? 1)
            };
          }
        ),
        switchMap(
          (result): Observable<RestaurantListResult> => {
            if (result.kind === 'failed') {
              return of(result);
            }

            const remainingPages = Array.from(
              { length: Math.max(0, result.totalPages - 1) },
              (_, index) => index + 2
            );

            if (remainingPages.length === 0) {
              return of(result);
            }

            return forkJoin(
              remainingPages.map(page =>
                this.restaurantService.getRestaurants(page, RESTAURANT_PAGE_SIZE)
              )
            ).pipe(
              map(responses => ({
                kind: 'ok',
                items: [
                  ...result.items,
                  ...responses.flatMap(response =>
                    response.success && response.data
                      ? (response.data.items ?? [])
                      : []
                  )
                ],
                totalPages: result.totalPages
              }))
            );
          }
        )
      );
  }

  /**
   * Chooses the restaurant to display: the previous selection when it is
   * still part of the list, otherwise the first active restaurant, otherwise
   * the first restaurant of the tenant.
   */
  private pickCandidate(
    items: RestaurantDto[],
    preferredId: string | null
  ): RestaurantDto | null {
    if (items.length === 0) {
      return null;
    }

    if (preferredId) {
      const preferred = items.find(item => item.id === preferredId);

      if (preferred) {
        return preferred;
      }
    }

    const active = items.find(item => isActiveRestaurantStatus(item.status));

    return active ?? items[0];
  }

  /** Maps a failed request to the state the presentation layer shows. */
  private toFailureOutcome(
    error: unknown,
    restaurants: RestaurantDto[]
  ): RestaurantOutcome {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return {
          state: 'forbidden',
          restaurant: null,
          restaurants,
          message: null
        };
      }

      if (error.status === 404) {
        return {
          state: 'error',
          restaurant: null,
          restaurants,
          message: 'This restaurant is no longer available.'
        };
      }
    }

    return {
      state: 'error',
      restaurant: null,
      restaurants,
      message:
        this.httpErrorHandler.extractBackendMessage(error) ?? LIST_ERROR_MESSAGE
    };
  }

  /** Publishes an outcome when it still belongs to the current request. */
  private applyOutcome(outcome: RestaurantOutcome, token: number): void {
    if (token !== this.requestToken) {
      return;
    }

    this.loadingSignal.set(false);
    this.stateSignal.set(outcome.state);
    this.restaurantsSignal.set(outcome.restaurants);
    this.restaurantSignal.set(outcome.restaurant);
    this.messageSignal.set(outcome.message);
  }
}
