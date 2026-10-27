import { vi } from 'vitest';

import { scrollToTemplateSection } from './template-section-navigation.util';
import type { TemplateSectionType } from '../models/website-template-design.model';

const SECTION_SCROLL_SPACING = 12;

function rects(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    height,
    x: 0,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

/**
 * Builds the same DOM shape the renderer produces:
 * `app-template-renderer > header.tpl-header + section#<type>` with the
 * section component (and its host element) nested inside the renderer.
 */
function buildRenderer(options: {
  section?: TemplateSectionType;
  sectionTop?: number;
  headerHeight?: number;
} = {}): Element {
  const {
    section: sectionType = 'menu',
    sectionTop = 500,
    headerHeight = 60
  } = options;

  const renderer = document.createElement('app-template-renderer');

  if (headerHeight > 0) {
    const header = document.createElement('header');
    header.className = 'tpl-header';
    header.getBoundingClientRect = () => rects(0, headerHeight);
    renderer.appendChild(header);
  }

  const section = document.createElement('section');
  section.id = sectionType;
  section.getBoundingClientRect = () => rects(sectionTop, 320);
  renderer.appendChild(section);

  const host = document.createElement('app-renderer-header');
  renderer.appendChild(host);
  document.body.appendChild(renderer);

  return host;
}

describe('scrollToTemplateSection', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;
  let reducedMotion = false;

  beforeEach(() => {
    reducedMotion = false;
    document.body.innerHTML = '';

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: reducedMotion,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    scrollTo.mockRestore();
    document.body.innerHTML = '';
  });

  it('offsets the target by the sticky header height', () => {
    const host = buildRenderer({ sectionTop: 500, headerHeight: 64 });

    expect(scrollToTemplateSection(host, 'menu')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 500 - 64 - SECTION_SCROLL_SPACING,
      behavior: 'smooth'
    });
  });

  it('uses the section top when no sticky header is rendered', () => {
    const host = buildRenderer({ sectionTop: 320, headerHeight: 0 });

    expect(scrollToTemplateSection(host, 'menu')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 320 - SECTION_SCROLL_SPACING,
      behavior: 'smooth'
    });
  });

  it('does not scroll to a section that is not rendered', () => {
    const host = buildRenderer({ section: 'about' });

    expect(scrollToTemplateSection(host, 'menu')).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('never produces a negative scroll position', () => {
    const host = buildRenderer({ sectionTop: 10, headerHeight: 80 });

    expect(scrollToTemplateSection(host, 'menu')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    });
  });

  it('jumps instantly when the visitor prefers reduced motion', () => {
    reducedMotion = true;
    const host = buildRenderer({ sectionTop: 500, headerHeight: 64 });

    expect(scrollToTemplateSection(host, 'menu')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 500 - 64 - SECTION_SCROLL_SPACING,
      behavior: 'instant'
    });
  });
});
