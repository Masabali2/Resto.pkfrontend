import type { TemplateSectionType } from '../models/website-template-design.model';

/** Space kept between the sticky template header and the target section. */
const SECTION_SCROLL_SPACING = 12;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Scrolls to a section of the template rendered by `TemplateRenderer`.
 *
 * The target is an allow-listed `TemplateSectionType` (never free-form text), so
 * the selector is safe and there is exactly one element per section type — the
 * design parser already rejects duplicate section entries.
 *
 * The scroll position accounts for the template's sticky header, and the
 * animation respects the user's reduced-motion preference. Returns `false`
 * when the section is not rendered, so callers can leave the browser's default
 * anchor behaviour untouched instead of navigating to a nonexistent section.
 */
export function scrollToTemplateSection(
  host: Element,
  target: TemplateSectionType
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const renderer = host.closest('app-template-renderer');
  const section = renderer?.querySelector<HTMLElement>(`#${target}`) ?? null;

  if (!section) {
    return false;
  }

  const stickyHeader = renderer?.querySelector<HTMLElement>('.tpl-header') ?? null;
  const headerOffset = stickyHeader?.getBoundingClientRect().height ?? 0;
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;

  const top =
    section.getBoundingClientRect().top +
    window.scrollY -
    headerOffset -
    SECTION_SCROLL_SPACING;

  window.scrollTo({
    top: Math.max(0, top),
    // `instant` bypasses the global `html { scroll-behavior: smooth }` rule,
    // which would otherwise still animate despite the reduced-motion request.
    behavior: prefersReducedMotion ? 'instant' : 'smooth'
  });

  return true;
}
