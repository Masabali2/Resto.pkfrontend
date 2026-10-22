
/** Icon shown on a quick action card. */
export type QuickActionIcon = 'workspace' | 'restaurant' | 'website' | 'menu';

/**
 * A shortcut to an existing application route.
 *
 * Routes are taken from app.routes.ts; actions the signed-in account cannot
 * use (missing permission or missing prerequisites) stay visible but are
 * disabled with an explanation.
 */
export interface QuickAction {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: QuickActionIcon;
  /** Verified application route the action opens. */
  readonly route: string[];
  /** Set when the action cannot run right now; explains why to the user. */
  readonly disabledReason?: string;
  /**
   * Set when the action must be handled by the container instead of
   * navigating on its own. Used for actions that are guarded by the
   * workspace subscription state: the container decides whether the action
   * opens the guarded page or the shared subscription experience.
   */
  readonly handledByContainer?: boolean;
}
