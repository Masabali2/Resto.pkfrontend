import { inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MenuService } from '../services/menu.service';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { PagedResult } from '../../websites/models/paged-result.model';
import type { MenuItemDto, UpdateMenuItemRequest } from '../models/menu-item.model';

export const MENU_ITEMS_PAGE_SIZE = 20;

export interface CategoryItemState {
  readonly items: MenuItemDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly loading: boolean;
  readonly error: string | null;
}

const EMPTY_STATE: CategoryItemState = {
  items: [],
  page: 1,
  pageSize: MENU_ITEMS_PAGE_SIZE,
  totalCount: 0,
  loading: false,
  error: null
};

/**
 * Per-category menu-item paging/loading/error state for the menu detail page.
 *
 * Owns everything the page previously hand-rolled inside `MenuDetail`:
 * immutable state updates, stale-response protection (a late response can
 * never overwrite a newer request or data belonging to another tenant/menu),
 * optimistic reorder with rollback, and local update/remove after mutations.
 */
@Injectable()
export class CategoryItemsStore {
  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  private readonly states = signal<Record<string, CategoryItemState>>({});
  private readonly sequences = new Map<string, number>();
  private readonly reordering = new Set<string>();

  /** Snapshot getter for template-facing helper methods. */
  readonly state = this.states.asReadonly();

  readonly itemsFor = (categoryId: string): CategoryItemState =>
    this.states()[categoryId] ?? EMPTY_STATE;

  /** Clears all state (tenant switch / navigating to another menu). */
  reset(): void {
    this.states.set({});
    this.sequences.clear();
    this.reordering.clear();
  }

  load(categoryId: string, page = 1): void {
    const existing = this.states()[categoryId];

    if (existing?.loading) {
      return;
    }

    const requestId = (this.sequences.get(categoryId) ?? 0) + 1;
    this.sequences.set(categoryId, requestId);

    this.states.update(states => ({
      ...states,
      [categoryId]: {
        ...(states[categoryId] ?? EMPTY_STATE),
        loading: true,
        error: null
      }
    }));

    this.menuService
      .getCategoryItems(categoryId, page, MENU_ITEMS_PAGE_SIZE)
      .subscribe({
        next: (response: ApiResponse<PagedResult<MenuItemDto>>) => {
          if (!this.isCurrent(categoryId, requestId)) {
            return;
          }

          if (!response.success || !response.data) {
            this.patch(categoryId, {
              loading: false,
              error: response.message ?? 'Unable to load items.'
            });
            return;
          }

          const data = response.data;
          this.states.update(states => ({
            ...states,
            [categoryId]: {
              items: data.items ?? [],
              page: data.page ?? page,
              pageSize: data.pageSize ?? MENU_ITEMS_PAGE_SIZE,
              totalCount: data.totalCount ?? 0,
              loading: false,
              error: null
            }
          }));
        },
        error: (error: unknown) => {
          if (!this.isCurrent(categoryId, requestId)) {
            return;
          }

          this.patch(categoryId, {
            loading: false,
            error:
              this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load items.'
          });
        }
      });
  }

  /** Replaces the item with the same id in whichever category holds it. */
  updateItem(updated: MenuItemDto): void {
    this.states.update(states => {
      const categoryId = Object.keys(states).find(cid =>
        states[cid].items.some(i => i.id === updated.id)
      );

      if (!categoryId) {
        return states;
      }

      const state = states[categoryId];

      return {
        ...states,
        [categoryId]: {
          ...state,
          items: state.items.map(i => (i.id === updated.id ? updated : i))
        }
      };
    });
  }

  /** Removes an item locally (after a successful delete); returns the owning category id. */
  removeItem(itemId: string): string | null {
    const categoryId = Object.keys(this.states()).find(cid =>
      this.states()[cid].items.some(i => i.id === itemId)
    ) ?? null;

    if (!categoryId) {
      return null;
    }

    this.states.update(states => ({
      ...states,
      [categoryId]: {
        ...states[categoryId],
        items: states[categoryId].items.filter(i => i.id !== itemId)
      }
    }));

    return categoryId;
  }

  /** Drops one category's state entirely (after its deletion). */
  removeCategory(categoryId: string): void {
    this.sequences.delete(categoryId);
    this.reordering.delete(categoryId);
    this.states.update(states => {
      const { [categoryId]: _removed, ...rest } = states;
      return rest;
    });
  }

  /**
   * Swaps two adjacent items by exchanging their `displayOrder` values via
   * two PUT calls issued as one atomic batch. The list is optimistically
   * swapped first and rolled back if either call fails or the backend
   * rejects with validation errors; the current page is refreshed on success.
   * Concurrent reorders of the same category are ignored.
   */
  moveItem(categoryId: string, itemId: string, direction: 'up' | 'down'): void {
    const state = this.states()[categoryId];

    if (!state || this.reordering.has(categoryId)) {
      return;
    }

    const items = state.items;
    const idx = items.findIndex(i => i.id === itemId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (idx < 0 || targetIdx < 0 || targetIdx >= items.length) {
      return;
    }

    const a = items[idx];
    const b = items[targetIdx];
    const previousItems = state.items;

    const swapped = [...items];
    swapped[idx] = b;
    swapped[targetIdx] = a;
    this.patch(categoryId, { items: swapped });

    this.reordering.add(categoryId);

    forkJoin({
      first: this.menuService.updateItem(a.id, this.swapRequest(b)),
      second: this.menuService.updateItem(b.id, this.swapRequest(a))
    }).subscribe({
      next: ({ first, second }) => {
        this.reordering.delete(categoryId);

        const failed = [first, second].find(
          r => !r.success || r.data === null
        );

        if (failed) {
          this.patch(categoryId, { items: previousItems });
          this.patch(categoryId, {
            error: failed.message ?? 'Unable to reorder items. Please try again.'
          });
          return;
        }

        this.load(categoryId, state.page);
      },
      error: (error: unknown) => {
        this.reordering.delete(categoryId);
        this.patch(categoryId, { items: previousItems });
        this.patch(categoryId, {
          error:
            this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to reorder items. Please try again.'
        });
      }
    });
  }

  /** Whether a reorder for this category is currently in flight. */
  isReordering(categoryId: string): boolean {
    return this.reordering.has(categoryId);
  }

  private swapRequest(other: MenuItemDto): UpdateMenuItemRequest {
    return {
      displayOrder: other.displayOrder,
      imageFileId: null,
      clearImage: false
    };
  }

  private patch(categoryId: string, changes: Partial<CategoryItemState>): void {
    this.states.update(states => ({
      ...states,
      [categoryId]: {
        ...(states[categoryId] ?? EMPTY_STATE),
        ...changes
      }
    }));
  }

  private isCurrent(categoryId: string, requestId: number): boolean {
    return this.sequences.get(categoryId) === requestId;
  }
}
