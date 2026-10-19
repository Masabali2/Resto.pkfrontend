/**
 * Typed data structures shared by public-website marketing sections
 * (currently used by the "How It Works" section).
 */

/** Identifies which scoped-CSS illustration a step card renders. */
export type HowItWorksVisual = 'template-picker' | 'menu-editor' | 'device-launch';

/** A single step in the "get online with Resto.pk" workflow. */
export interface MarketingStep {
  /** 1-based position of the step within the flow. */
  readonly number: number;
  /** Short, scannable step title. */
  readonly title: string;
  /** One-sentence supporting description. */
  readonly description: string;
  /** Decorative icon glyph shown in the step badge. */
  readonly icon: string;
  /** Accessible label describing what the decorative icon means. */
  readonly iconLabel: string;
  /** Selects the CSS/SVG illustration rendered for this step. */
  readonly visual: HowItWorksVisual;
}
