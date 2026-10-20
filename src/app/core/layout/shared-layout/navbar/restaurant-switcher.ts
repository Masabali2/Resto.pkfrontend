import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter } from 'rxjs';
import { AuthorizationService } from '../../../services/authorization.service';
import { TenantContextService } from '../../../services/tenant-context.service';
import { RestaurantService } from '../../../../features/websites/services/restaurant.service';
import type { RestaurantDto } from '../../../../features/websites/models/restaurant.model';

/**
 * Compact restaurant workspace control for the dashboard Navbar. It reads the
 * real restaurants of the active tenant through RestaurantService
 * (GET /api/restaurants) — the same source RestaurantList uses. Selection is
 * tracked in the URL as the `restaurantId` query parameter, the mechanism
 * MenuList already establishes for restaurant-scoped pages; there is no
 * backend "active restaurant" endpoint, so nothing else persists it and no
 * invented switching API is used. The tenant (workspace) and the restaurant
 * are distinct concepts: this control only ever reflects restaurants inside
 * the active tenant. States: no restaurant → neutral prompt linking to the
 * existing setup journey; exactly one restaurant → static context chip with
 * no misleading dropdown; multiple → accessible menu listing real entries.
 * RestaurantDto carries no logo field, so a neutral store icon is shown.
 */
@Component({
  selector: 'app-restaurant-switcher',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-switcher.html',
  styleUrl: './restaurant-switcher.css'
})
export class RestaurantSwitcher {
  private readonly restaurantService = inject(RestaurantService);
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly restaurants = signal<RestaurantDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly open = signal(false);
  protected readonly selectedRestaurantId = signal<string | null>(null);

  protected readonly activeRestaurant = computed(() => {
    const items = this.restaurants();
    const id = this.selectedRestaurantId();
    return items.find(item => item.id === id) ?? items[0] ?? null;
  });

  protected readonly canChoose = computed(() => this.restaurants().length > 1);

  protected readonly triggerLabel = computed(() =>
    this.activeRestaurant()?.name ?? 'No restaurant yet'
  );

  constructor() {
    toObservable(this.tenantContext.activeTenantId)
      .pipe(
        filter(tenantId => tenantId !== null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.load());
  }

  protected select(restaurant: RestaurantDto): void {
    this.close();

    if (this.isSelected(restaurant)) {
      return;
    }

    this.selectedRestaurantId.set(restaurant.id);
    void this.router.navigate([], {
      queryParams: { restaurantId: restaurant.id },
      queryParamsHandling: 'merge'
    });
  }

  protected isSelected(restaurant: RestaurantDto): boolean {
    return this.activeRestaurant()?.id === restaurant.id;
  }

  protected toggle(): void {
    this.open.update(open => !open);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.close();
    }
  }

  private load(): void {
    if (!this.authorization.hasPermission('Restaurant.View')) {
      this.restaurants.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.restaurantService.getRestaurants(1, 100).subscribe({
      next: response => {
        this.restaurants.set(response.success ? response.data?.items ?? [] : []);
        this.loading.set(false);
      },
      error: () => {
        this.restaurants.set([]);
        this.loading.set(false);
      }
    });
  }
}
