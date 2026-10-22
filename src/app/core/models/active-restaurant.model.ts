
/**
 * State of the restaurant context shown in the navbar.
 *
 * `idle`      — no active tenant, so no restaurant is displayed.
 * `loading`   — the restaurants of the active tenant are being read.
 * `resolved`  — a restaurant is selected and can be displayed.
 * `empty`     — the active tenant has no restaurant yet.
 * `forbidden` — the caller may not read the restaurants of this tenant.
 * `error`     — the restaurants could not be read.
 */
export type ActiveRestaurantState =
  | 'idle'
  | 'loading'
  | 'resolved'
  | 'empty'
  | 'forbidden'
  | 'error';
