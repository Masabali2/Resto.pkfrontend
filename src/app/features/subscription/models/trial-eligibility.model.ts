/**
 * Whether the active workspace may still consume its free trial.
 *
 * Mirrors `TrialEligibilityDto`. `trialUsed` stays true forever once the
 * workspace has a subscription row, so a consumed trial can never be replayed.
 */
export interface TrialEligibility {
  readonly eligible: boolean;
  readonly trialUsed: boolean;
  /** Length of the free trial in days (30). */
  readonly trialDurationDays: number;
  /** Human readable explanation shown when the trial cannot be started. */
  readonly reason: string | null;
}
