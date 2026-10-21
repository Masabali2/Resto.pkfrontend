# Resto.pk — Menu Management Frontend (Implementation Plan)

Plan file: `.kilo/plans/1792484413861-menu-management-admin.md`
Spec source of truth: `README.md` (6,494 lines — 8 SDLC documents).

## 1. Inspection findings (do this first; do not re-derive)

**Frontend repo** `https://github.com/Masabali2/Resto.pkfrontend.git` (origin)
- Working tree: branch **`public-website`** @ `232f0f7` ("Merge PR #26 … angular-dashboard-ui-shell-2d675"), in sync with `origin/public-website`.
- `origin/main` is **behind** (`88eb125`) — it has **no** dashboard shell, **no** tenant context/interceptor, and the old boilerplate README. **Do not integrate against `origin/main`.**
- `git fetch` is not permitted by the current tool permissions; the `origin/*` refs are as of the last fetch. The GitHub page confirms `main` = 60 commits, README still boilerplate, branch `public-website` is the advanced line.
- Uncommitted user work to **preserve**:
  - `README.md` modified (+6,471 lines) — the SDLC spec export. Do not touch.
  - **Staged**: `website-detail.ts`, `website-editor.ts` — the `environment` import is commented out and `publicSiteUrl` is stubbed to `null` because the base `src/environments/environment.ts` lacks `publicSiteBaseUrl`. Leave these staged edits as they are; F1 below makes the field available so the user can decide to restore them.
  - Untracked `.kilo/` (this plan).
- **Dashboard Integration stage: COMPLETE.** Evidence: commit `fe5b7d4` "feat: Integrate tenant context, interceptor, and dashboard pages" (merged in `232f0f7`) plus the committed `dashboard-layout` / `dashboard-sidebar` / `dashboard-header` / `tenant-selector`, `tenant.interceptor.ts`, `tenant-context.service.ts`, `dashboard-overview.ts`. The **Verification** half has no dedicated artifacts (no e2e target in `angular.json`, no Cypress/Playwright in `package.json`, only 3 vitest spec files) — treat verification as unit-test + manual pass.

**Backend repo** `https://github.com/Masabali2/Resto.pk.git` (local clone at `C:\Users\DELL\Music\Resto.pk`)
- Branch `main` @ `55f0526`, in sync with `origin/main` (GitHub: 40 commits). The three menu controllers are **tracked and pushed** — the menu API is committed, not local-only.
- Uncommitted backend changes (do not touch): `Program.cs` (adds CORS policy `http://localhost:4200` with `AllowCredentials`, and a JWT `OnMessageReceived` fallback reading the `resto_access_token` cookie) and migration `20261016071702_m20`. These confirm the auth model: **JWT in an httpOnly cookie**; the browser sends it via `withCredentials: true` (existing `credentialsInterceptor`).

## 2. Feature matrix (verified contract → frontend work)

| # | Operation | Backend endpoint | Permission | Frontend support today | Missing implementation | Known limitations |
|---|---|---|---|---|---|---|
| 1 | List menus of a restaurant | `GET /api/v1/restaurants/{restaurantId}/menus?page=&pageSize=` | `Menu.View` | none | `MenuService.getMenus`, list page | **No "all menus" endpoint exists** — a restaurant must be selected first |
| 2 | Get menu + its categories | `GET /api/v1/menus/{menuId}` | `Menu.View` | none | `MenuService.getMenu`, workspace page | categories are **not** paged |
| 3 | Create menu | `POST /api/v1/restaurants/{restaurantId}/menus` | `Menu.Create` | none | `MenuService.createMenu` + form | name ≤150, description ≤1000 |
| 4 | Update menu name/description | `PUT /api/v1/menus/{menuId}` | `Menu.Update` | none | `MenuService.updateMenu` + form | partial update (both fields optional) |
| 5 | Activate / deactivate menu | `PATCH /api/v1/menus/{menuId}/status` | `Menu.Update` | none | `MenuService.setMenuActive` | inactive menu is hidden from the public site |
| 6 | Archive menu | `DELETE /api/v1/menus/{menuId}` | `Menu.Delete` | none | `MenuService.archiveMenu` + confirm | **terminal** — no un-archive endpoint; archived menu rejects all mutations |
| 7 | List categories of a menu | `GET /api/v1/menus/{menuId}/categories` | `MenuCategory.View` | none | `MenuService.getCategories` | not paged |
| 8 | Create category | `POST /api/v1/menus/{menuId}/categories` | `MenuCategory.Create` | none | `MenuService.createCategory` + form | name ≤100, description ≤500 |
| 9 | Update category | `PUT /api/v1/menu-categories/{categoryId}` | `MenuCategory.Update` | none | `MenuService.updateCategory` + form | — |
| 10 | Activate / deactivate category | `PATCH /api/v1/menu-categories/{categoryId}/status` | `MenuCategory.Update` | none | `MenuService.setCategoryActive` | — |
| 11 | Delete category | `DELETE /api/v1/menu-categories/{categoryId}` | `MenuCategory.Delete` | none | `MenuService.deleteCategory` + confirm | **409 if items still exist** → deactivate instead |
| 12 | Reorder categories | `PATCH /api/v1/menus/{menuId}/categories/order` | `MenuCategory.Update` | none | `MenuService.reorderCategories` + up/down UI | body must contain **every** category id exactly once |
| 13 | List items of a category | `GET /api/v1/menu-categories/{categoryId}/items?page=&pageSize=` | `MenuItem.View` | none | `MenuService.getCategoryItems` + pager | paged (default pageSize 50, cap at app layer) |
| 14 | List items of a menu | `GET /api/v1/menus/{menuId}/items?page=&pageSize=` | `MenuItem.View` | none | (optional) `MenuService.getMenuItems` | — |
| 15 | Create item | `POST /api/v1/menu-categories/{categoryId}/items` | `MenuItem.Create` | none | `MenuService.createItem` + form | price ≥0, ≤2 dp; currency 3 chars; name ≤150; description ≤1000 |
| 16 | Get item | `GET /api/v1/menu-items/{itemId}` | `MenuItem.View` | none | `MenuService.getItem` | — |
| 17 | Update item | `PUT /api/v1/menu-items/{itemId}` | `MenuItem.Update` | none | `MenuService.updateItem` + form | `clearImage` and `imageFileId` are mutually exclusive |
| 18 | Toggle availability (in/out of stock) | `PATCH /api/v1/menu-items/{itemId}/availability` | `MenuItem.Update` | none | `MenuService.setItemAvailability` | independent of `isActive` |
| 19 | Toggle active (show/hide) | `PATCH /api/v1/menu-items/{itemId}/status` | `MenuItem.Update` | none | `MenuService.setItemActive` | — |
| 20 | Delete item | `DELETE /api/v1/menu-items/{itemId}` | `MenuItem.Delete` | none | `MenuService.deleteItem` + confirm | **soft delete** — historical orders stay valid |
| 21 | Move item up/down | — (no bulk endpoint) | `MenuItem.Update` | none | two `PUT` calls swapping `displayOrder` | partial failure possible → re-read the category page |
| 22 | Item image upload | **no endpoint** | — | — | — | `MenuImageRules` states upload is out of scope server-side; asset rules allow only `Logo|Favicon|CoverImage|Banner|MobileLogo` → **blocked, see BT2** |
| 23 | Publish / unpublish menu | **no endpoint** | — | — | — | `Menu.Publish()`/`Unpublish()` exist in the domain but are not exposed → **blocked, see BT1** |
| 24 | Tenant-scoped menu calls | `X-Tenant-Id` + `resto_access_token` cookie | membership-backed | `tenantInterceptor` + `TenantContextService` exist | reuse as-is | backend re-validates the header against a live membership check and fails closed |

**Permission catalogue (use these exact strings — `Permissions.cs:18-31`):**
`Menu.View` `Menu.Create` `Menu.Update` `Menu.Delete` · `MenuCategory.View` `MenuCategory.Create` `MenuCategory.Update` `MenuCategory.Delete` · `MenuItem.View` `MenuItem.Create` `MenuItem.Update` `MenuItem.Delete`

**DTO shapes (camelCase; `PagedResult<T>` already matches `features/websites/models/paged-result.model.ts`):**
```ts
type MenuStatus = 'Draft' | 'Published' | 'Archived';
interface MenuDto { id; tenantId; restaurantId; name; description: string|null; isActive: boolean;
                    status: MenuStatus; createdAt; updatedAt: string|null }
interface MenuDetailsDto extends MenuDto { categories: MenuCategoryDto[] }
interface MenuCategoryDto { id; menuId; name; description: string|null; displayOrder: number;
                            isActive: boolean; createdAt; updatedAt: string|null }
interface MenuItemDto { id; menuCategoryId; menuId; name; description: string|null; price: number;
                        currency: string; imageFileId: string|null; displayOrder: number;
                        isAvailable: boolean; isActive: boolean; createdAt; updatedAt: string|null }
```

## 3. Key contract decisions (already resolved — implement, do not re-litigate)

- **D1 Routes** (follow the `/websites/:id/editor` convention):
  `/menus` · `/menus/:menuId` · `/menus/:menuId/categories/new` · `/menus/:menuId/categories/:categoryId/edit` · `/menus/:menuId/categories/:categoryId/items/new` · `/menus/:menuId/categories/:categoryId/items/:itemId/edit`
- **D2 Guards**: `authGuard` + `permissionGuard` with `data: { permission: 'Menu.View' }` for list/workspace; `MenuCategory.*` / `MenuItem.*` for the corresponding form routes. In-page gating via `AuthorizationService.hasPermission()` — **UX only; the backend is the authority** (BR-GEN-004). Never invent permission strings.
- **D3 Restaurant context**: the repo has **no shared "selected restaurant" service**. Use the existing `RestaurantService.getRestaurants()` (`GET /api/restaurants?page&pageSize=`, permission `Restaurant.View`) and keep the selection in the **URL query param `restaurantId`** (same convention as `create-website.ts` reading `?restaurantId=`). Auto-select when the tenant has exactly one restaurant. Do not invent a restaurant-creation shortcut; link to `/setup/restaurant` when the tenant has none.
- **D4 Item paging**: load items **per category** (`GET /v1/menu-categories/{id}/items?page=&pageSize=20`) in an accordion workspace, one pager per category. Satisfies NFR-PERF-005 without loading the whole menu.
- **D5 Price**: form control is a **string**; validate `/^\d+(\.\d{1,2})?$/`, convert to number before sending. Display via a shared `formatPrice()` helper (`Intl.NumberFormat`, `Rs 1,250.00`). Never derive authoritative totals client-side (BR-PRICE-001).
- **D6 Currency**: always send `currency: 'PKR'` (backend `Money.DefaultCurrency = "PKR"`); show it read-only in the form.
- **D7 Category reorder**: send the complete ordered id array; up/down buttons (no drag-and-drop dependency); optimistic update, revert + re-read on error.
- **D8 Item ordering**: swap `displayOrder` with the neighbour via two `PUT`s; on any failure re-read the category's item page (the list is the truth).
- **D9 Images**: keep `imageFileId` in the model, **do not render an upload control** (no backend contract — BT2).
- **D10 Confirmation**: implement the stub `ConfirmationDialog` (`src/app/shared/components/confirmation-dialog/confirmation-dialog.ts` has no inputs/outputs today) with `open` / `title` / `message` / `confirmLabel` inputs and `confirmed` / `cancelled` outputs, focus-trapped and keyboard-operable, and use it for archive / delete. Do not use `window.confirm`.
- **D11 Archived menus**: render read-only when `status === 'Archived'`; disable every mutating control (server rejects them anyway).
- **D12 Errors**: `HttpErrorHandlerService.handle()` with `fieldAliases` mapping backend field names to form controls (pattern at `login.ts:98-102`, `restaurant-setup.ts:214-234`). 409 → "This category still has menu items. Deactivate it or remove the items first."; 403 → the backend message; 404 → "not found" copy; never map 403 to an empty state.

## 4. Tenant-context design (mirrors `features/restaurants/pages/restaurant-list/restaurant-list.ts`)

That page is the canonical pattern — copy it:
- `PageState = 'loading' | 'list' | 'empty' | 'no-workspace' | 'forbidden' | 'error'`.
- `tenantContext.activeTenantId.pipe(takeUntilDestroyed()).subscribe(...)` → reload when the tenant changes.
- `requestSequence` + `loadedTenantId` + `isCurrent(requestId, tenantId)` → **drop stale responses** so a response that arrives after a tenant switch is discarded.
- On tenant change: **clear** tenant-scoped state (menus, categories, items, selected restaurant) before reloading — never leave the previous tenant's rows on screen.
- `activeTenantId === null` → `no-workspace` state (user has memberships but no active tenant, or none at all). Distinguish from 403 → `forbidden`.
- `TenantContextService.switchAndRefresh()` already re-fetches `GET /Auth/me` so permissions are re-evaluated for the new tenant; `AuthorizationService.permissions` therefore updates automatically — no extra work needed. `AuthorizationService.setTenantContext()` exists but is **not called anywhere in app code** (only in its own spec) — do not rely on it.
- **No tenant or restaurant ids are sent in bodies or query params** except the restaurant id that the backend itself puts in the route (`/restaurants/{restaurantId}/menus`) — that is a supported location.
- Guard against a **stale request returning after a tenant switch** with the `isCurrent` check (above) in every list/detail page.

## 5. Ordered implementation tasks

**Foundations (small, additive, no user work reverted)**
1. **F1** Add `publicSiteBaseUrl: ''` to `src/environments/environment.ts`, add `src/environments/environment.production.ts`, and add `fileReplacements` for the `production` configuration in `angular.json` (currently a production build silently targets `https://localhost:7182/api` — NFR-DEPLOY-002). Do **not** un-comment the staged `environment` imports in `website-detail.ts` / `website-editor.ts` — report it so the user can restore them.
2. **F2** `src/app/core/models/permissions.ts` — a typed `PERMISSIONS` const for the menu/category/item identifiers so they are not inline strings.
3. **F3** Implement `ConfirmationDialog` (D10) — shared, reusable, accessible.
4. **F4** `dashboard-navigation.ts:66-72` — flip the `Menu` entry to `status: 'available'`, add `route: ['/menus']`, keep `requiredPermissions: ['Menu.View']`. The sidebar already hides items the user lacks (`dashboard-sidebar.ts:33-46`).

**Feature**
5. **Models** — `src/app/features/menu/models/`: `menu.model.ts`, `menu-category.model.ts`, `menu-item.model.ts` (DTOs + request types exactly as in §2), `menu-price.util.ts` (`parsePrice`, `formatPrice`, `isValidPrice`). Doc-comment each type with the backend file it mirrors (see `website.model.ts:18-21`).
6. **Service** — `src/app/features/menu/services/menu.service.ts`: one cohesive service for the feature (mirrors `website.service.ts` style: `Observable<ApiResponse<T>>`, `${environment.apiUrl}/v1` base, `HttpParams` for paging, no logic in components). Methods for matrix rows 1–20.
7. **Routes** — add the `/menus` tree to `src/app/app.routes.ts` (guards + `title` in the existing style, e.g. `'Menus — Resto.pk'`), and register `/menus/**` as `RenderMode.Server` in `src/app/app.routes.server.ts` (mirroring `websites/**`).
8. **Menu list page** — `features/menu/pages/menu-list/`: restaurant selector (URL-backed `restaurantId`), menu table (name, status badge with **text + shape, not colour alone**, active flag, updated), create/edit menu, activate/deactivate, archive (confirm dialog). Empty states: no restaurant → CTA to `/setup/restaurant`; no menus → create prompt; `forbidden` state for 403.
9. **Menu workspace page** — `features/menu/pages/menu-detail/`: loads `GET /v1/menus/{menuId}` (menu + categories); accordion of categories; each expanded category lazily loads its item page with a pager; row actions edit / toggle availability / toggle active / move up-down / delete (409 copy); read-only when archived or when the user lacks the permission.
10. **Category form** — `features/menu/pages/menu-category-form/` (one component reused by new + edit via route data): name (required, ≤100), description (≤500), display order (≥0, optional).
11. **Item form** — `features/menu/pages/menu-item-form/` (reused by new + edit): name (required, ≤150), description (≤1000), price (required, ≥0, ≤2 dp, string control), currency (read-only `PKR`), display order (≥0, optional), availability (default available on create). **No image field.**
12. **Form conventions** — mirror `restaurant-setup.ts`: `fb.nonNullable.group`, `Validators.required/maxLength/pattern`, `submitted`/`generalError`/`fieldErrors` signals, `showFieldError`/`getFieldError`, `applyResponseErrors` mapping `response.errors[]` to controls, `finalize` to clear the submitting flag. Guard every mutation with a `submitting` flag → **no duplicate submissions**; show the success toast **only after** the backend confirms.
13. **Accessibility** — labelled inputs, `aria-describedby` for field errors, `aria-live="polite"` on the status/empty region, visible focus rings, keyboard-operable dialog (focus trap + `Esc` to cancel), status conveyed by text/shape as well as colour, responsive layout down to mobile, `prefers-reduced-motion` respected.
14. **Unsaved-changes guard** on the form routes (dirty check → confirm on navigate away) using the shared confirmation dialog.
15. **Tests** (vitest, `ng test`) — follow `authorization.service.spec.ts` / `permission.guard.spec.ts` style:
    - `menu.service.spec.ts` — verb, path, body and paging params for every method.
    - `menu-price.util.spec.ts` — rejects >2 dp, negatives, non-numeric; formats correctly.
    - `menu-list.spec.ts` — loading → list / empty / forbidden / error; 403 is **not** empty; stale-response guard drops a response after a tenant switch.
    - `menu-detail.spec.ts` — category load, item paging, archived → read-only, permission-gated actions, 409 delete copy, duplicate-submission prevention.
16. **Verification** — run `npm run build` and `npm test` (see `package.json` scripts) and report the **actual** output, separating pre-existing failures from regressions. Manual pass against the local backend: create menu → category → item → toggle availability → reorder → delete item → delete a non-empty category (409) → archive menu (read-only) → switch tenant (stale data cleared) → user without `Menu.View` (route redirected, nav hidden).

## 6. Backend blockers to record (do not work around, do not fake)

- **BT1 — menu publish/unpublish is not exposed.** `Menu.Publish()`/`Unpublish()` exist in the domain and `UpdateMenuPublishRequest` exists as a DTO, but `MenusController` has no publish route. `Menu.IsPubliclyVisible` requires `IsActive && Status == Published`, so the public menu can never become visible — blocks FR-PUBLIC-003 / BR-WEB-006 and the whole ordering chain. Needed: `POST /api/v1/menus/{menuId}/publish` + `/unpublish` (permission `Menu.Update`), calling `Publish(categoryCount)` / `Unpublish()`.
- **BT2 — menu item image upload does not exist.** Needed: `POST /api/v1/menu-items/{itemId}/image` (multipart, 5 MB, `image/jpeg|png|webp|gif`) returning a `FileMetadata` id, or a `MenuItem` asset type in `RestaurantAssetRules`. Until then FR-MENU-012 / US-FILE-002 stay open.
- **BT3 — optional**: `PATCH /api/v1/menus/{menuId}/items/order` mirroring the category endpoint, to replace the two-`PUT` swap.
- No backend, schema, or unrelated-feature changes are authorised in this work — report these, do not implement them.

## 7. Risks

- **R1** BT1 blocks the value loop — the menu can be authored but never published. Track as a prerequisite for the public-site/cart/checkout slice.
- **R2** Archive is terminal (no un-archive) — a wrong archive permanently freezes the menu. Confirmation dialog required (D10).
- **R3** Two-`PUT` item reorder can partially fail → always re-read the category items after a failed move.
- **R4** Category delete 409 is the expected path for a non-empty category; the UI must steer to deactivate.
- **R5** `MenuDetailsDto.categories` is unpaged — fine for realistic category counts; revisit if a tenant has hundreds.
- **R6** Production builds still point at localhost until F1 lands.
- **R7** `ConfirmationDialog` is shared infrastructure: implement it additively (new inputs/outputs) and keep its current selector `app-confirmation-dialog` so nothing breaks.

## 8. Final report checklist (for the implementing agent)

Report: what was inspected (branch/commit for both repos); the verified endpoints + permission identifiers; every file created/modified/deleted; the implemented workflows; edge cases handled; missing backend capabilities (BT1–BT3); build/test commands with **actual** output; remaining limitations; next recommended stage (public restaurant site + cart/checkout/order, once BT1 lands). Do not push to the remote.
