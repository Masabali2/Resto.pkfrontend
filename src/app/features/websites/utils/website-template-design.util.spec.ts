import {
  parseWebsiteTemplateDesign,
  isValidTemplateColor
} from './website-template-design.util';

const VALID_DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'South Asian / Desi',
  tags: ['desi', 'family-dining'],
  featured: true,
  displayOrder: 1,
  design: {
    palette: {
      background: '#FFF8EE',
      surface: '#FFFFFF',
      text: '#24352A',
      mutedText: '#667368',
      primary: '#24563A',
      accent: '#D99027',
      border: '#E9DFCE'
    },
    typography: { headingFont: 'serif-editorial', bodyFont: 'sans-modern' },
    layout: {
      header: 'centered',
      hero: 'split',
      menu: 'featured-cards',
      gallery: 'masonry',
      footer: 'multi-column',
      buttons: 'solid',
      corners: 'soft'
    },
    sections: [
      { type: 'header', enabled: true, order: 1 },
      { type: 'hero', enabled: true, order: 2 },
      { type: 'menu', enabled: true, order: 3 }
    ]
  },
  previewContent: {
    eyebrow: 'Authentic flavours',
    heroTitle: 'A Taste of Tradition',
    heroDescription: 'Comforting dishes.',
    primaryActionLabel: 'Explore Our Menu',
    sampleDishes: [{ name: 'Signature Karahi', price: 'PKR 1,650' }]
  }
});

describe('parseWebsiteTemplateDesign', () => {
  it('maps a valid document into a typed view model', () => {
    const result = parseWebsiteTemplateDesign(VALID_DESIGN);

    expect(result.error).toBeNull();
    expect(result.viewModel).not.toBeNull();
    expect(result.viewModel?.configuration.category).toBe('South Asian / Desi');
    expect(result.viewModel?.configuration.featured).toBe(true);
    expect(result.viewModel?.configuration.tags).toEqual(['desi', 'family-dining']);
    expect(result.viewModel?.configuration.design.layout.hero).toBe('split');
    expect(result.viewModel?.configuration.previewContent.sampleDishes).toHaveLength(1);
  });

  it('exposes only enabled sections in their configured order', () => {
    const document = JSON.parse(VALID_DESIGN);
    document.design.sections = [
      { type: 'menu', enabled: true, order: 3 },
      { type: 'hero', enabled: true, order: 1 },
      { type: 'gallery', enabled: false, order: 2 }
    ];

    const result = parseWebsiteTemplateDesign(JSON.stringify(document));

    expect(result.viewModel?.sections.map(section => section.type)).toEqual(['hero', 'menu']);
  });

  it('reports an actionable error for malformed JSON', () => {
    const result = parseWebsiteTemplateDesign('{ not json');

    expect(result.viewModel).toBeNull();
    expect(result.error).toContain('could not be read');
  });

  it('reports an actionable error for a missing document', () => {
    const result = parseWebsiteTemplateDesign(null);

    expect(result.viewModel).toBeNull();
    expect(result.error).toContain('does not provide a design preview');
  });

  it('rejects an unsupported schema version', () => {
    const result = parseWebsiteTemplateDesign(JSON.stringify({ schemaVersion: 99 }));

    expect(result.viewModel).toBeNull();
    expect(result.error).toContain('schema version');
  });

  it('rejects an invalid colour', () => {
    const document = JSON.parse(VALID_DESIGN);
    document.design.palette.primary = 'green';

    const result = parseWebsiteTemplateDesign(JSON.stringify(document));

    expect(result.viewModel).toBeNull();
    expect(result.error).toContain('primary');
  });

  it('rejects an unsupported layout variant', () => {
    const document = JSON.parse(VALID_DESIGN);
    document.design.layout.hero = 'holographic';

    const result = parseWebsiteTemplateDesign(JSON.stringify(document));

    expect(result.viewModel).toBeNull();
    expect(result.error).toContain('hero');
  });

  it('rejects an unsupported typography token', () => {
    const document = JSON.parse(VALID_DESIGN);
    document.design.typography.headingFont = 'comic-neue';

    const result = parseWebsiteTemplateDesign(JSON.stringify(document));

    expect(result.viewModel).toBeNull();
    expect(result.error).toContain('heading font');
  });

  it('falls back to defaults when optional blocks are missing', () => {
    const result = parseWebsiteTemplateDesign(JSON.stringify({ schemaVersion: 1 }));

    expect(result.error).toBeNull();
    expect(result.viewModel?.configuration.design.layout.hero).toBe('split');
    expect(result.viewModel?.sections.length).toBeGreaterThan(0);
  });

  it('never lets configuration text reach the CSS variables', () => {
    const document = JSON.parse(VALID_DESIGN);
    document.design.palette.primary = 'red; background: url(javascript:alert(1))';

    const result = parseWebsiteTemplateDesign(JSON.stringify(document));

    expect(result.viewModel).toBeNull();
  });

  it('exposes only controlled CSS custom properties', () => {
    const result = parseWebsiteTemplateDesign(VALID_DESIGN);
    const variables = Object.keys(result.viewModel?.cssVariables ?? {});

    expect(variables.every(name => name.startsWith('--tpl-'))).toBe(true);
    expect(variables).toContain('--tpl-primary');
    expect(variables).toContain('--tpl-heading-font');
  });
});

describe('isValidTemplateColor', () => {
  it('accepts #rgb and #rrggbb', () => {
    expect(isValidTemplateColor('#fff')).toBe(true);
    expect(isValidTemplateColor('#24563A')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidTemplateColor('red')).toBe(false);
    expect(isValidTemplateColor('#12345')).toBe(false);
    expect(isValidTemplateColor('rgb(1,2,3)')).toBe(false);
    expect(isValidTemplateColor(null)).toBe(false);
  });
});
