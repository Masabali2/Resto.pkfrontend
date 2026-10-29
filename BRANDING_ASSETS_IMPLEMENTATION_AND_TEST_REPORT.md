# Resto.pk — Branding & Assets Management: Implementation and Test Report

**Status:** Partially ready (implementation complete and contract-aligned; end-to-end not executable in this environment due to pre-existing, unrelated build/test breakage).

**Repositories/branches inspected**
- Backend: `Masabali2/Resto.pk` — branch `newfeaturebranch` (local `C:\Users\DELL\Music\Resto.pk`, HEAD `42e6a13` == origin).
- Frontend: `Masabali2/Resto.pkfrontend` — branch `websiteconfiguration` (local `C:\Users\DELL\Music\Resto.pkfrontend`, clean, == origin).

No changes were made to `main` in either repository. Backend changes stay in `Resto.pk`/`newfeaturebranch`; frontend changes stay in `Resto.pkfrontend`/`websiteconfiguration`. Existing uncommitted backend working-tree changes (migration files m20–m61, modified model snapshot, duplicate `src/RestaurantSaaS.Infrastructure/src/` migrations) were preserved and not touched.

---

## A. Executive summary

**What was implemented**
Aligned the existing Angular Branding & Assets feature with the existing ASP.NET Core backend so both sides use the same contracts, without introducing a second asset architecture or rebuilding existing functionality.

- Backend: exposed the five branding asset slots (Logo, DarkLogo, Favicon, OGBanner, HeroBanner) through the existing restaurant-asset architecture (`RestaurantAssetsController` + `IRestaurantAssetService`), added server-side reference-checked deletion (409 `ASSET_STILL_REFERENCED`), added a storage-usage endpoint reporting an honest null quota, extended the website-config schema font allowlist, and fixed asset delivery URL resolution.
- Frontend: re-pointed `BrandingAssetsService` at the real `RestaurantAssetsController` endpoints (upload POST, list GET, delete DELETE, storage GET), mapped asset IDs consistently (restaurant asset ID everywhere), transformed the branding configuration payload to the backend `WebsiteConfigSchema` shape (`theme.colors`, `theme.font`, `settings.*`), handled 409 conflicts, null quota, and preserved existing UI design/routes/sidebar.

**End-to-end integration:** Verified contract-by-contract via backend unit tests and a frontend service spec. A live browser/HTTP round-trip was NOT executable in this environment (see J), so the E2E workflow could not be executed end-to-end against a running backend + database.

**Remaining blockers**
- Frontend `ng test` (Karma) cannot compile the full suite because of **pre-existing** TypeScript errors in unrelated `menu-management` specs (`menu-management.spec.ts`, `menu-management-summary.spec.ts`) — not caused by this feature.
- Frontend `ng build --configuration production` fails on **pre-existing** template errors (untouched `typography-settings.html` `$event.target.value`; child components not imported because `BrandingAssets.imports: []`).
- No live backend/database is available to run a true HTTP round-trip E2E.

**Overall readiness verdict:** Partially ready. The feature is contract-complete and unit-verified; a live E2E pass is blocked by environment/pre-existing issues unrelated to this change.

---

## B. Initial audit findings (verified mismatches before changes)

Confirmed facts (read directly from the checked-out branches):

| Area | Backend (verified) | Frontend (verified) | Required action |
|---|---|---|---|
| Asset upload | `POST api/v1/assets/upload` (File + Destination JSON); **no `assetType` bound**; returns `FileMetadata.Id` as `AssetId` | Sent `assetType` form field (ignored) via `v1/assets/upload`; expected restaurant-asset result | Align upload to `POST restaurants/{restaurantId}/assets/{assetType}` |
| Asset listing | `GET restaurants/{restaurantId}/assets` → `RestaurantAssetDto[]` (`Id` = RestaurantAsset.Id, presigned `Url`) | Consumed same URL; expected `previewUrl`, `isReferenced` | Map DTO consistently; `isReferenced` not provided (rely on 409) |
| Asset replacement | `RestaurantAssetService.UploadAsync` replaces same-type active asset (deactivates old, soft-deletes old file after save) | Not wired (upload path wrong) | Wire frontend upload to replacement endpoint |
| Asset deletion | `RestaurantAssetsController.Delete` had **no reference check**; `AssetsController.Delete` had 409 but on `FileMetadata.Id` | `DELETE v1/assets/{id}`, expected 409 → `AssetReferencedError` | Add reference check to `RestaurantAssetsController.Delete` → 409 `ASSET_STILL_REFERENCED`; use RestaurantAsset.Id consistently |
| Storage usage | **No** `GET restaurants/{id}/storage` endpoint; no storage quota policy exists (`SubscriptionPlan` has no storage field) | `getStorageInfo` called it; expected `{usedBytes, quotaBytes}` | Add endpoint → `{usedBytes, quotaBytes: null}` (never invent a quota) |
| Branding config schema | `schemaVersion/theme(sections/settings)`; `theme.colors`(any key → hex), `theme.font`(single allowlist: no `plus-jakarta-sans`/`outfit`); rejects `typography`/`heroLayout`/`assets` top-level | Sent `theme.{primary,secondary,tint}`, `typography`, `heroLayout`, `assets` top-level (would be rejected) | Align payload to `theme.colors.*` + `theme.font` + `settings.{typography,heroLayout,assets}`; extend font allowlist |
| AssetType enum | Logo=1…Other=99; **no** DarkLogo/OGBanner/HeroBanner | Logo/DarkLogo/Favicon/OGBanner/HeroBanner | Add DarkLogo=8, OGBanner=9, HeroBanner=10 (existing values preserved); register in `AssetTypeNames` + `AllowedTypes` |
| Routes/sidebar | N/A | `/branding-assets` registered, `Website.Update` guard, sidebar entry present | Already correct — verify only |
| Preview | Public renderer reads published config + `GET public/sites/{slug}/branding` | Local modal with real menu data (no backend write) | Keep local draft preview (no auto-publish); fix asset URL origin |

Assumptions (clearly separated): none are relied upon for security; every contract above was read from source.

---

## C. Backend changes (`Resto.pk` / `newfeaturebranch`)

| File | Purpose / change | API / validation / security / DB impact |
|---|---|---|
| `src/RestaurantSaaS.Domain/Enums/AssetType.cs` | Added `DarkLogo = 8`, `OGBanner = 9`, `HeroBanner = 10`; existing values (Logo=1…Other=99) preserved | Enum stored as `int` in EF — **no migration required** |
| `src/RestaurantSaaS.Application/Common/Files/RestaurantAssetRules.cs` | Added DarkLogo/OGBanner/HeroBanner to `AllowedTypes` | Upload of the three new branding slots now permitted |
| `src/RestaurantSaaS.Infrastructure/Services/RestaurantAssetService.cs` | • Added `AssetTypeNames` entries for darklogo/ogbanner/herobanner<br>• `DeleteAsync` → returns `Task<bool>`: false when asset still referenced (website config), true when deleted; never deletes referenced asset; tenant-aware; server-side reference check<br>• Added `GetStorageUsageAsync` (distinct non-deleted file bytes for active restaurant assets, quota = null)<br>• Added private `IsReferencedByWebsiteAsync` / `ContainsGuidReference` | Delete: 409 when referenced; Storage: `{usedBytes, quotaBytes: null}` |
| `src/RestaurantSaaS.Application/Common/Interfaces/IRestaurantAssetService.cs` | `DeleteAsync` → `Task<bool>`; added `GetStorageUsageAsync` | Interface contract change (single caller: controller, updated) |
| `src/RestaurantSaaS.Application/Features/Restaurants/DTOs/RestaurantAssetDtos.cs` | Added `StorageUsageDto(long UsedBytes, long? QuotaBytes)` | DTO for storage endpoint |
| `src/RestaurantSaaS.Application/Common/WebsiteConfigSchema.cs` | Added `plus-jakarta-sans`, `outfit` to `FontFamilies` (existing values preserved) | Frontend heading/body fonts now pass server validation |
| `src/RestaurantSaaS.Api/Controllers/RestaurantAssetsController.cs` | • `DELETE {assetId}`: returns 409 `ASSET_STILL_REFERENCED` when `DeleteAsync` returns false; 204 on success<br>• Added `[HttpGet("storage")]` → `ApiResponse<StorageUsageDto>` (`Restaurant.View` policy) | New storage endpoint; delete conflict contract |
| `src/RestaurantSaaS.Infrastructure/Services/LocalFileStorageService.cs` | `GetPresignedUrl` path corrected from `/api/files/` to `/api/v1/files/` (matches `AssetsController.GetFile` route) | Asset delivery URLs now resolve |

Database: **no migration added** (AssetType persisted as `int`; configuration persisted as JSON in existing `WebsiteConfiguration.ConfigurationJson` column; storage computed from existing `Files` table). No migrations were applied to any database.

Tests added:
- `tests/RestaurantSaaS.Infrastructure.Tests/RestaurantAssetServiceTests.cs` (14 tests): DarkLogo/OGBanner/HeroBanner upload persistence, invalid asset type, unauthenticated access, replacement deactivates previous, list metadata/inactive exclusion, delete unreferenced (true + soft-delete), delete referenced (false + keeps everything), delete not-found, storage distinct bytes + null quota + cross-tenant, cross-tenant delete not-found.
- `tests/RestaurantSaaS.Application.Tests/WebsiteConfigurationSchemaFontsTests.cs` (6 tests): font allowlist contents, allowed fonts accepted, disallowed font rejected.

Backend test results: `RestaurantSaaS.Infrastructure.Tests` **154 passed**, `RestaurantSaaS.Application.Tests` **77 passed**. No regressions.

---

## D. Frontend changes (`Resto.pkfrontend` / `websiteconfiguration`)

| File | Change |
|---|---|
| `src/app/features/branding-assets/services/branding-assets.service.ts` | Re-pointed to `RestaurantAssetsController`: `uploadAsset` POSTs `FormData` (`file` only; `assetType` in route) to `restaurants/{id}/assets/{assetType}` and maps `RestaurantAssetDto` → `BrandingAsset` (id = restaurant asset ID, absolute `previewUrl` via API origin); `deleteAsset(restaurantId, assetId)` DELETEs `restaurants/{id}/assets/{assetId}`, 409 → `AssetReferencedError`; `getStorageInfo` GETs `restaurants/{id}/storage` (quota may be null); `saveConfiguration` builds the backend `WebsiteConfigSchema` shape (`schemaVersion`, `theme.colors.*`, `theme.font`, `settings.{typography,heroLayout,assets}`) and PUTs the draft. Removed `ImageUploadService` usage for branding (kept for website sections). Added `assetUrl()` to prefix the API origin to relative backend delivery URLs. |
| `src/app/features/branding-assets/models/branding-assets.models.ts` | `StorageInfo.quotaBytes` → `number | null` |
| `src/app/features/branding-assets/branding-assets.ts` | `storage` signal typed `{ usedBytes; quotaBytes: number \| null }`; `applySavedConfig` reads `theme.colors` + `settings.typography`/`settings.heroLayout` (new persisted shape); `saveAll` passes client settings to the service (service performs the transform); deletion routed through `deleteAsset(restaurantId, assetId)` |
| `src/app/features/branding-assets/components/asset-management/asset-management.ts` | Upload result mapped from `result.id`/`result.storageKey`/`result.created`; `doDelete` calls `deleteAsset(restaurantId, asset.id)`; 409/`AssetReferencedError` opens the conflict modal and preserves the asset; other errors show a notification |
| `src/app/features/branding-assets/components/media-library/media-library.ts` | `doDelete` calls `deleteAsset(restaurantId, asset.id)`; 409 opens conflict modal |
| `src/app/features/branding-assets/components/branding-header/branding-header.ts` | `storageUsedText` renders honestly when `quotaBytes` is null (`{used} used (storage limit not configured)`); `storagePercent` returns 0 when quota is null/≤0 |
| `src/app/features/branding-assets/services/branding-assets.service.spec.ts` | NEW: 7 tests (upload field/URL/ID mapping, list mapping, delete 409 → AssetReferencedError, delete 204, storage null quota, storage unavailable → null, config persisted in schema shape with no top-level leak) |

Routes/sidebar/permissions: **already correct, no change needed.** `/branding-assets` is lazily loaded under the authenticated shared layout with `permission: 'Website.Update'` (verified in `app.routes.ts`); sidebar entry exists with `requiredPermissions: ['Website.Update']`. The permission names match the backend catalog (`Website.Update`, `Restaurant.View`, `Restaurant.Update`).

Preview: `WebsitePreviewModal` remains a local draft preview driven by current (unsaved) signals + real menu data from `MenuService`; no backend write occurs, so preview never unintentionally publishes. Asset `previewUrl` values are now absolute and resolvable.

---

## E. Verified API contract matrix

| Operation | HTTP method | Route | Request/response contract | Authorization | Verification status |
|---|---|---|---|---|---|
| Upload branding asset | POST | `api/restaurants/{restaurantId}/assets/{assetType}` | `multipart file` → `RestaurantAssetDto` (`id`, `assetType`, `fileName`, `contentType`, `fileSize`, `url`, `fileId`, `createdAt`, `updatedAt`) | `Restaurant.Update` + active subscription | Backend code + unit tests pass; frontend spec verifies URL/method/form field/ID mapping |
| List restaurant assets | GET | `api/restaurants/{restaurantId}/assets` | `RestaurantAssetDto[]` | `Restaurant.View` | Backend code + unit tests pass; frontend spec verifies mapping |
| Replace asset | POST | `api/restaurants/{restaurantId}/assets/{assetType}` | Same as upload; deactivates previous same-type active asset after successful save | `Restaurant.Update` + subscription | Backend code + replacement unit test pass |
| Delete asset | DELETE | `api/restaurants/{restaurantId}/assets/{assetId}` | 204 on success; 409 `ASSET_STILL_REFERENCED` when referenced; 404 when missing | `Restaurant.Update` + subscription | Backend code + unit tests pass; frontend spec verifies 409 → `AssetReferencedError` |
| Storage usage | GET | `api/restaurants/{restaurantId}/storage` | `{ usedBytes, quotaBytes }` (`quotaBytes` null when no policy) | `Restaurant.View` | Backend code + unit tests pass; frontend spec verifies |
| Get website draft | GET | `api/v1/websites/{id}/draft` | `ApiResponse<WebsiteDraftDto>` (`configurationJson`) | `Website.View` | Existing; reused unchanged |
| Save website draft | PUT | `api/v1/websites/{id}/draft` | `SaveWebsiteDraftRequest` (`configurationJson`) → `ApiResponse<WebsiteDto>`; validated against `WebsiteConfigSchema` | `Website.Update` | Existing; reused unchanged (frontend transform added) |
| List websites | GET | `api/v1/websites` | `WebsitesPage` | — | Existing; reused |
| Get restaurant | — | via `ActiveRestaurantStateService` / `RestaurantService` | `RestaurantDto` | — | Existing; reused |
| Get menus / items | GET | `api/.../menus`, `.../menu-items` | Menu DTOs | — | Existing; reused by preview |
| Public branding | GET | `api/v1/public/sites/{slug}/branding` | `PublicRestaurantAssetDto[]` | Anonymous | Existing; reused |
| Publish website | POST | `api/v1/websites/{id}/publish` | — | `Website.Publish` | Existing; unchanged |

---

## F. Navigation and route verification

- Exact route: `/branding-assets` (verified in `src/app/app.routes.ts`).
- Lazy-loading: `loadComponent` → standalone `BrandingAssets` component (verified).
- Layout: authenticated shared layout (verified; `authGuard` + `permissionGuard`).
- Sidebar location: `Branding & Assets` entry, route `/branding-assets`, `requiredPermissions: ['Website.Update']`, status `available` (verified in `sidebar-navigation.ts`).
- Permission guard: `data: { permission: 'Website.Update' }`; server enforces `Restaurant.Update`/`Website.Update` on every protected operation.
- Direct URL navigation / refresh / deep-link: route registration supports it (verified statically); **live browser verification not possible** (no dev server/backend run in environment).
- Preview and return navigation: `openPreview()`/`closePreview()` on `BrandingAssets`; preview modal emits `close` (verified statically).

Navigation results above that require a running dev server were **not executed live** (documented, not claimed as passed).

---

## G. Branding configuration compatibility

Final persisted schema (backend `WebsiteConfigSchema`, validated server-side):

```json
{
  "schemaVersion": 1,
  "theme": {
    "colors": { "primary": "#hex", "secondary": "#hex", "tint": "#hex" },
    "font": "<one of FontFamilies>"
  },
  "settings": {
    "typography": { "headingFont": "...", "bodyFont": "...", "fontScale": <number> },
    "heroLayout": "<split\|overlay\|compact>",
    "assets": { "Logo": "<restaurantAssetId>", "DarkLogo": "...", "Favicon": "...", "OGBanner": "...", "HeroBanner": "..." }
  }
}
```

- Colors live in `theme.colors.*` (hex-validated), the primary font in `theme.font` (allowlist now includes `plus-jakarta-sans`, `outfit` in addition to existing values), and typography/hero layout/asset references live under `settings.*`.
- Unrelated configuration fields (`sections`, other `settings`, SEO, template) are preserved because the frontend submits the complete document through the existing `PUT .../draft` endpoint (full-draft replace semantics, unchanged) and only branding keys are authored by this feature.
- Asset references stored are the **restaurant asset IDs** (`RestaurantAsset.Id`), identical to the IDs used for deletion — no ID confusion.
- Hex colors, allowed fonts, typography ranges, hero layout values, and asset ownership are validated server-side (`WebsiteConfigSchema.Validate`, `EnsureRestaurantOwnershipAsync`, tenant filters). Arbitrary client objects are not accepted.

---

## H. Security review

- Tenant isolation: every protected operation resolves the tenant server-side from the authenticated context (`X-Tenant-Id` header set by the frontend tenant interceptor from `authState.activeTenant.tenantId`); client-supplied tenant IDs are never trusted. `EnsureRestaurantOwnershipAsync` verifies restaurant→tenant; asset operations verify asset→restaurant→tenant.
- Authorization: `Restaurant.Update`/`Restaurant.View`/`Website.Update`/`Website.Publish` policies enforced by `[Authorize]` on controllers; frontend guard (`Website.Update`) is complementary, not a substitute.
- Asset ownership: delete/list/upload scoped to the active tenant's restaurant; cross-tenant access returns 404/403 (no existence leakage).
- Deletion safety: server-side reference check blocks deletion of any asset referenced by a website configuration (draft or published); returns 409 `ASSET_STILL_REFERENCED`; unreferenced assets delete successfully. The frontend shows the conflict modal only on the 409 response and preserves the asset on failure.
- Validation: file type/size enforced at upload; configuration validated against `WebsiteConfigSchema` before persistence; fonts/colors/hero layout validated server-side.
- Preview isolation: admin preview is a local render of current signals + real public data; no backend draft write, so unsaved changes are never published.
- Unresolved: public-site asset URLs are delivered through the tenant-secured `GET api/v1/files/{key}`; anonymous public-page resolvability of branding assets is a pre-existing architectural consideration outside this feature's scope.

---

## I. Testing report

### Backend
| Test/check | Command | Result | Evidence/details |
|---|---|---|---|
| Backend build (API project) | `dotnet build src/RestaurantSaaS.Api` | Passed | Compiles (output copy-lock warnings from a running VS process, not compile errors) |
| Infrastructure unit tests | `dotnet test tests/RestaurantSaaS.Infrastructure.Tests` | Passed | 154 passed, 0 failed (includes new 14 `RestaurantAssetServiceTests`) |
| Application unit tests | `dotnet test tests/RestaurantSaaS.Application.Tests` | Passed | 77 passed, 0 failed (includes new 6 `WebsiteConfigurationSchemaFontsTests`) |

### Frontend
| Test/check | Command | Result | Evidence/details |
|---|---|---|---|
| TypeScript typecheck | `npx tsc --noEmit -p tsconfig.app.json` | Passed | No errors |
| Branding-assets service spec | `npx ng test --watch=false --include=...branding-assets.service.spec.ts` | Passed | 7 passed |
| Full frontend test suite | `npx ng test --watch=false` | Blocked | Pre-existing TS errors in unrelated `menu-management.spec.ts` / `menu-management-summary.spec.ts` (not touched by this feature) prevent bundle compilation |
| Angular production build | `npx ng build --configuration production` | Blocked | Pre-existing template errors in untouched files (`typography-settings.html` `$event.target.value`; `BrandingAssets.imports: []` → NG8001 unknown child elements); not caused by this feature |

### Not run
- Live E2E workflow (Phase 11.4): no runnable backend + database in this environment; verified statically/contractually and via unit tests instead.

---

## J. Remaining issues

| Issue | Impact | Severity | Recommended next action |
|---|---|---|---|
| Full `ng test` blocked by pre-existing `menu-management` spec compile errors | Frontend regression suite cannot run | Medium | Fix or exclude the unrelated `menu-management` specs (out of scope for this feature) |
| `ng build --configuration production` fails on pre-existing template errors | Production build cannot be verified | Medium | Fix untouched `typography-settings.html` and `BrandingAssets.imports: []` (out of scope) |
| Live E2E (backend + database + frontend round-trip) not executed | End-to-end behavior not proven in a running system | High | Run the backend against a local database, serve the frontend, and walk through the Phase 11.4 workflow |
| Public-site anonymous resolvability of branding asset URLs | Public pages may not load tenant-secured asset URLs | Low | Evaluate whether `GET api/v1/files/{key}` should allow anonymous access for public assets |

---

## K. Final verdict

**Partially ready.**

Justification: All branding asset contracts are implemented and aligned between backend and frontend (upload/list/replace/delete with consistent restaurant-asset IDs, server-side reference-checked 409 deletion, honest null quota storage usage, schema-validated branding configuration persisted under `theme.colors`/`theme.font`/`settings`, font allowlist extended, asset URL origin fixed, tenant isolation and authorization enforced server-side). Backend unit tests (154 + 77) pass; frontend typecheck passes; the new frontend service spec passes (7 tests). Routes, sidebar, and permission guards were verified already correct. The UI design is unchanged. The verdict is not "Ready" only because a live HTTP/browser E2E could not be executed (no runnable backend/database in this environment) and the full frontend test/build suite is blocked by pre-existing, unrelated failures in `menu-management` specs and templates. None of the blocking failures were introduced by this feature.
