import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/**
 * Blocks navigation away from a form route while the form is dirty, so the
 * user cannot lose unsaved changes by accident. The form component is
 * responsible for marking the form pristine on cancel and after a successful
 * save, which allows navigation to proceed.
 */
export const unsavedChangesGuard: CanDeactivateFn<unknown> = (component) => {
  const form =
    (component as { form?: { dirty: boolean } | null })?.form ?? null;

  if (form?.dirty) {
    return false;
  }

  return true;
};
