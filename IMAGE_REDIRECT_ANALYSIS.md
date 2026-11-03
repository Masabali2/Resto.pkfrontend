# Image Loading & Redirect Analysis Report

## 1) How the menu item form loads images
**Files:**
- `src/app/features/menu/pages/menu-item-form/menu-item-form.ts` (355 lines)
- `src/app/features/menu/pages/menu-item-form/menu-item-form.html` (179 lines)

**Flow:**
- Component state (ts:64-97): 
  - `itemImageFileId = signal<string | null>(null)` (ts:84) holds the asset/file ID
  - `uploadItemId = computed(() => this.isEdit ? this.itemId : this.createdItemId())` (ts:88-91) - for create flow uses the newly created item ID
  - `uploadDestination = computed(() => ({ kind: 'menu-item', menuItemId: id }))` when uploadItemId exists (ts:92-97)
- On edit load (ts:99-130): when loading existing item via `menuService.getItem(this.itemId)`, sets `this.itemImageFileId.set(item.imageFileId ?? null)` (ts:111). Form patched from response (ts:112-119).
- Create flow (ts:207-260): creates item first (ts:218), on success sets `this.createdItemId.set(response.data.id)` and `this.itemImageFileId.set(response.data.imageFileId ?? null)` (ts:240-246). Stays on form to allow attaching image (comment at ts:241-243).
- Image upload attachment (ts:319-345): `onImageUploaded(result: { assetId: string })` calls `menuService.updateItem(itemId, { imageFileId: result.assetId, clearImage: false })` and on success updates `itemImageFileId` from response (ts:333-340).
- Template rendering (html:116-143): when `itemImageFileId()` exists, renders preview via `<img [src]="'/api/v1/files/' + assetId" ...>` (html:134-142). The `ImageUploadComponent` is configured with `[destination]="uploadDestination()"` and `[disabled]="!uploadDestination()"` (html:118-126).

**Key line numbers:**
- ts:84,88-97,111,240-246,319-345
- html:118-143 (image upload + preview)

## 2) How image file URLs are constructed
There are **two different patterns** used in the codebase:

1. **Relative path (current origin)** - used by menu item form:
- `src/app/features/menu/pages/menu-item-form/menu-item-form.html:136`  
  `[src]="'/api/v1/files/' + assetId"` → produces `https://<current-origin>/api/v1/files/<assetId>` (e.g., `https://localhost:4200/api/v1/files/...` in dev)

2. **Full API URL from environment** - used by menu detail:
- `src/app/features/menu/pages/menu-detail/menu-detail.ts:78,834-839`  
  `protected readonly apiUrl = environment.apiUrl;` (env.apiUrl = `https://localhost:7182/api` in dev, see `src/environments/environment.ts:4`)  
  `imageFileUrl(fileId)` returns `${this.apiUrl}/v1/files/${fileId}` → `https://localhost:7182/api/v1/files/<fileId>`
- `src/app/features/menu/pages/menu-detail/menu-detail.html:117` uses `imageFileUrl(item.imageFileId)`

**Environment (dev):**
- `src/environments/environment.ts:3-6` → `{ production: false, apiUrl: 'https://localhost:7182/api', publicSiteBaseUrl: '' }`

The failing URL from the issue is `https://localhost:4200/api/v1/files/tenant/fd2c41670fcf4ef0a08b969a4f90f975/a8e1a7f66a5443edbb332a7fde14f1f7.jfif` - note:
- Port 4200 (Angular dev server / SSR server), not 7182 (backend API)
- Path includes extra `tenant/<tenantId>/` segment before the file ID - this is not constructed by either pattern above. That suggests either the backend returns a full/prefixed URL that gets used as-is, or there's another construction mechanism. The form's pattern is the only place using a bare relative `/api/v1/files/...` without tenant prefix; the "tenant/..." in the path may come from backend response formatting or a different code path. But the construction sites in the codebase we examined don't add "tenant/".

## 3) HTTP interceptors (and redirect logic)
**Interceptor files:**
- `src/app/core/interceptors/credentials.interceptor.ts` (17 lines)
- `src/app/core/interceptors/error.interceptor.ts` (16 lines)  
- `src/app/core/interceptors/tenant.interceptor.ts` (34 lines)

**Registration:**
- `src/app/app.config.ts:26-38` registers interceptors in order: `credentialsInterceptor, tenantInterceptor, errorInterceptor` via `provideHttpClient(withInterceptors([...]))` with `withFetch()`. Also sets up auth initialization via `provideAppInitializer(() => inject(AuthStateService).initializeSession())`.

**Behavior:**
- **credentialsInterceptor** (`credentials.interceptor.ts:5-17`): only applies if `request.url.startsWith(environment.apiUrl)` (i.e. starts with `https://localhost:7182/api`). Adds `credentials: 'include'`. **Does NOT apply** to relative URLs like `/api/v1/files/...` going to origin 4200.
- **tenantInterceptor** (`tenant.interceptor.ts:9-34`): only applies if URL starts with `environment.apiUrl`. Skips if context has `SKIP_TENANT_HEADER` or header already present. Adds `X-Tenant-Id` from `authState.authResult()?.activeTenant?.tenantId`. **Does NOT apply** to requests to origin 4200.
- **errorInterceptor** (`error.interceptor.ts:13-16`): catches errors and rethrows them unchanged (no redirects, just passes through).

**No other interceptors found** with "interceptor" in filename under `src/app/core` or `src/app/interceptors`.

**Server-side redirect handling:**
- `src/server.ts` (68 lines): Express SSR server. Serves static files from browser dist with `redirect: false` (line 34). For all other requests, passes to `angularApp.handle(req)`. If Angular returns null, calls `next()`; otherwise writes response. **No explicit API proxy or redirect rules** - unhandled routes go to Angular SSR.
- `src/app/app.routes.ts:277-280`: wildcard route `**` redirects to `''` (root). This is a client/SSR route redirect.

## 4) Authentication guards/services and redirects
**Guards:**
- `src/app/core/guards/auth.guard.ts` (23 lines): waits for auth initialization, if authenticated returns true, else redirects to `/login` with `returnUrl = router.url`.
- `src/app/app.routes.ts`: root route `''` (public home, no guard). Routes under protected layout at `''` with `canActivate: [authGuard]` (line 66) protect dashboard, menus, websites, etc. Many child routes also use `permissionGuard`. Login/register/etc are public routes.

**Auth state/cookies:**
- `src/app/core/services/auth-state.service.ts` (90 lines): 
  - On init (browser): calls `authService.getCurrentUser()`. If fails with 401, tries `authService.refresh()` then fetches current user again. Sets auth state or clears it. Uses signals for state.
- `src/app/core/services/auth.service.ts` (54 lines): uses `HttpClient` to call `${environment.apiUrl}/Auth/*` endpoints (login, register, getCurrentUser, refresh, logout). All go through interceptors - credentials interceptor will add `withCredentials: true` for these (since they start with apiUrl).
- Session is cookie-based (credentials: 'include' on API requests to backend). No localStorage token handling visible.

**No interceptor/service found that does blanket redirects on 401/403 to '/'** - errorInterceptor just rethrows; auth handling is done via guards and auth state service during initialization/navigation.

## 5) Cookies/sessions management
- **Cookie transmission**: `credentialsInterceptor` adds `credentials: 'include'` only for requests where `request.url.startsWith(environment.apiUrl)` (backend API on port 7182). 
- **Session restoration**: `AuthStateService.initializeSession()` calls `GET /Auth/me`, falls back to refresh flow on 401. Runs via `provideAppInitializer` on app startup.
- **Logout**: `AuthService.logout()` POSTs to `/Auth/logout`.
- Cookies are HttpOnly/session cookies set by backend; frontend relies on browser sending them with `credentials: 'include'`.

## Root cause hypothesis for the 302 redirect to `/`
The request `https://localhost:4200/api/v1/files/tenant/.../...jfif` returns 302 to `/` because:

**Primary hypothesis (most likely):** In the menu item form, the image preview is constructed as a **relative URL** `'/api/v1/files/' + assetId` (menu-item-form.html:136). In development, the Angular dev server runs on port 4200 and there is **no API proxy configured** in `angular.json` (no proxy.conf references found). The SSR Express server in `src/server.ts` does not define routes for `/api/*` - it serves static files from browser dist, then passes all other requests to the Angular SSR engine via `angularApp.handle(req)`. When Angular SSR cannot match any route for `/api/v1/files/...`, it falls through to the wildcard route in `app.routes.ts:277-280` which does `redirectTo: ''` (root), producing a **302 redirect to `/`**.

Supporting evidence:
- menu-item-form uses relative path → goes to current origin (4200). menu-detail uses full backend URL (`${apiUrl}/v1/files/...` = 7182) and would hit the real backend. This is inconsistent.
- The failing URL is on port 4200 with path starting `/api/v1/files/...` - exactly what relative construction produces.
- No interceptors apply to non-apiUrl origins; no server-side API handling exists.
- Wildcard route redirects everything unmatched to root.

**Secondary notes about the path shape:**
The URL contains `tenant/<tenantId>/` segment (`/api/v1/files/tenant/fd2c.../a8e1....jfif`). Neither construction pattern adds this. Possibilities: (1) backend returns full/prefixed URLs in some responses and the code uses them directly elsewhere, (2) the actual `assetId` stored might already include tenant prefix in certain cases, or (3) it's constructed differently. But even if the path is odd, the redirect to `/` would still occur because the request hits the Angular server on 4200 with an unhandled `/api/*` path that doesn't match any route → wildcard redirect.

**Recommendation:** Use the full API URL (like menu-detail does) or configure a dev proxy. Specifically change menu-item-form.html line ~136 to construct the URL via `environment.apiUrl` (e.g., `[src]="apiUrl + '/v1/files/' + assetId"` and add `protected readonly apiUrl = environment.apiUrl;` to the component), or add a proxy in angular.json to forward `/api` to `https://localhost:7182`. The menu-detail pattern is correct for hitting the backend API.
