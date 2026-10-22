
/**
 * Status of a single onboarding step rendered by the dashboard checklist.
 *
 * `unavailable` is used when the underlying data cannot be read (for example
 * the restaurants endpoint is failing). It keeps the checklist honest instead
 * of rendering a fabricated completion percentage.
 */
export type SetupStepStatus = 'completed' | 'current' | 'upcoming' | 'unavailable';

/** Stable identifiers of the onboarding journey steps. */
export type SetupStepId =
  | 'workspace'
  | 'subscription'
  | 'restaurant'
  | 'website'
  | 'menu';

/**
 * A single step of the "bring your restaurant online" journey.
 *
 * Steps are always derived from real workspace data (memberships, restaurants,
 * websites and menus) by the dashboard container — never hardcoded.
 */
export interface SetupStep {
  readonly id: SetupStepId;
  /** Short step title. */
  readonly title: string;
  /** One line supporting the title. */
  readonly description: string;
  /** Derived state of the step. */
  readonly status: SetupStepStatus;
  /** Label of the inline action rendered for the active step. */
  readonly actionLabel?: string;
  /** Verified application route opened by the inline action. */
  readonly actionRoute?: string[];
}
