import {
  isSafeTemplateAssetId,
  isSafeTemplateAssetUrl,
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

const ASSETS = [
  {
    assetId: 'sg-hero',
    url: '/assets/images/SpiceGarden/spicegarden1.png',
    alt: 'A shared feast on a linen table',
    width: 2400,
    height: 1792
  },
  {
    assetId: 'sg-about',
    url: '/assets/images/SpiceGarden/spicegarden2.png',
    alt: 'A chef garnishing a copper karahi',
    width: 2400,
    height: 1792
  },
  {
    assetId: 'sg-gallery-first',
    url: '/assets/images/SpiceGarden/spicegarden8.png',
    alt: 'A softly lit dining room',
    width: 2528,
    height: 1696
  },
  {
    assetId: 'sg-gallery-second',
    url: '/assets/images/SpiceGarden/spicegarden3.png',
    alt: 'Brass bowls of spices',
    width: 2528,
    height: 1696
  }
];

function withAssets(
  assets: unknown,
  previewContent: Record<string, unknown> = {}
): string {
  const document = JSON.parse(VALID_DESIGN);

  document.assets = assets;
  document.previewContent = { ...document.previewContent, ...previewContent };

  return JSON.stringify(document);
}

describe('parseWebsiteTemplateDesign asset registry', () => {
  it('resolves hero, about and gallery references against the registry', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets(ASSETS, {
        heroAssetId: 'sg-hero',
        aboutAssetId: 'sg-about',
        galleryAssetIds: ['sg-gallery-first', 'sg-gallery-second']
      })
    );

    expect(result.error).toBeNull();
    expect(result.viewModel?.configuration.assets.map(asset => asset.assetId)).toEqual([
      'sg-hero',
      'sg-about',
      'sg-gallery-first',
      'sg-gallery-second'
    ]);
    expect(result.viewModel?.media.hero?.url).toBe(
      '/assets/images/SpiceGarden/spicegarden1.png'
    );
    expect(result.viewModel?.media.about?.alt).toBe('A chef garnishing a copper karahi');
    expect(result.viewModel?.media.gallery.map(asset => asset.assetId)).toEqual([
      'sg-gallery-first',
      'sg-gallery-second'
    ]);
  });

  it('preserves the configured gallery order instead of the registry order', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets(ASSETS, {
        galleryAssetIds: ['sg-gallery-second', 'sg-gallery-first']
      })
    );

    expect(result.viewModel?.media.gallery.map(asset => asset.assetId)).toEqual([
      'sg-gallery-second',
      'sg-gallery-first'
    ]);
  });

  it('keeps templates without a registry byte-for-byte compatible', () => {
    const result = parseWebsiteTemplateDesign(VALID_DESIGN);

    expect(result.error).toBeNull();
    expect(result.viewModel?.configuration.assets).toEqual([]);
    expect(result.viewModel?.media).toEqual({ hero: null, about: null, gallery: [] });
  });

  it('treats a missing or malformed registry as no images at all', () => {
    expect(parseWebsiteTemplateDesign(withAssets(undefined)).viewModel?.configuration.assets).toEqual([]);
    expect(parseWebsiteTemplateDesign(withAssets('not-an-array')).viewModel?.media.gallery).toEqual([]);
    expect(parseWebsiteTemplateDesign(withAssets({ assetId: 'sg-hero' })).viewModel?.media.hero).toBeNull();
  });

  it('drops unsafe asset URLs without failing the whole template', () => {
    const unsafeUrls = [
      'javascript:alert(1)',
      'https://cdn.example.com/hero.png',
      '//cdn.example.com/hero.png',
      '/assets/../secrets/hero.png',
      '/assets\\hero.png',
      'data:image/png;base64,AAAA',
      '/assets/hero.png?cache=1'
    ];

    const result = parseWebsiteTemplateDesign(
      withAssets(
        [
          ...unsafeUrls.map((url, index) => ({
            assetId: `unsafe-${index}`,
            url,
            alt: 'Unsafe image'
          })),
          ...ASSETS
        ],
        { heroAssetId: 'sg-hero' }
      )
    );

    expect(result.error).toBeNull();
    expect(result.viewModel?.configuration.assets.map(asset => asset.assetId)).toEqual([
      'sg-hero',
      'sg-about',
      'sg-gallery-first',
      'sg-gallery-second'
    ]);
    expect(result.viewModel?.media.hero?.assetId).toBe('sg-hero');
  });

  it('drops duplicate asset IDs and duplicate URLs, keeping the first entry', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets([
        ASSETS[0],
        { ...ASSETS[1], assetId: 'sg-hero' },
        { ...ASSETS[2], url: ASSETS[0].url }
      ])
    );

    expect(result.viewModel?.configuration.assets).toHaveLength(1);
    expect(result.viewModel?.configuration.assets[0].alt).toBe(ASSETS[0].alt);
  });

  it('rejects entries without usable alt text', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets([
        { assetId: 'no-alt', url: '/assets/a.png' },
        { assetId: 'blank-alt', url: '/assets/b.png', alt: '   ' },
        { assetId: 'markup-alt', url: '/assets/c.png', alt: '<script>x</script>' },
        { assetId: 'not-a-string-alt', url: '/assets/d.png', alt: 42 }
      ])
    );

    expect(result.viewModel?.configuration.assets).toEqual([]);
  });

  it('trims alt text and drops unusable image dimensions', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets([
        {
          assetId: 'sg-hero',
          url: '/assets/images/SpiceGarden/spicegarden1.png',
          alt: '  A shared feast  ',
          width: 0,
          height: 1792.5
        },
        { ...ASSETS[1], width: '2400', height: 20000 }
      ])
    );

    expect(result.viewModel?.configuration.assets[0].alt).toBe('A shared feast');
    expect(result.viewModel?.configuration.assets[0].width).toBeNull();
    expect(result.viewModel?.configuration.assets[0].height).toBeNull();
    expect(result.viewModel?.configuration.assets[1].width).toBeNull();
    expect(result.viewModel?.configuration.assets[1].height).toBe(20000);
  });

  it('accepts only slug-shaped asset references', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets(ASSETS, {
        heroAssetId: '/assets/images/SpiceGarden/spicegarden1.png',
        aboutAssetId: 'SG-ABOUT',
        galleryAssetIds: ['sg-hero', 'not a slug', '../escape']
      })
    );

    expect(result.viewModel?.media.hero).toBeNull();
    expect(result.viewModel?.media.about).toBeNull();
    expect(result.viewModel?.media.gallery.map(asset => asset.assetId)).toEqual(['sg-hero']);
  });

  it('drops dangling references but keeps the references that resolve', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets(ASSETS, {
        heroAssetId: 'missing-hero',
        aboutAssetId: 'sg-about',
        galleryAssetIds: ['missing-one', 'sg-gallery-second', 'sg-gallery-second']
      })
    );

    expect(result.error).toBeNull();
    expect(result.viewModel?.media.hero).toBeNull();
    expect(result.viewModel?.media.about?.assetId).toBe('sg-about');
    expect(result.viewModel?.media.gallery.map(asset => asset.assetId)).toEqual([
      'sg-gallery-second'
    ]);
  });

  it('caps the gallery at twelve distinct references', () => {
    const assets = Array.from({ length: 14 }, (_, index) => ({
      assetId: `sg-image-${index}`,
      url: `/assets/images/gallery/${index}.png`,
      alt: `Gallery image ${index}`
    }));
    const result = parseWebsiteTemplateDesign(
      withAssets(
        assets,
        { galleryAssetIds: assets.map(asset => asset.assetId) }
      )
    );

    expect(result.viewModel?.media.gallery).toHaveLength(12);
  });
});

const EMBER_ASSETS = [
  {
    assetId: 'ember-oak-ember1-png',
    url: '/assets/images/Ember%26Oak/ember1.png',
    alt: 'A dimly lit fine-dining room',
    width: 900,
    height: 600
  },
  {
    assetId: 'ember-oak-ember7-png',
    url: '/assets/images/Ember%26Oak/ember7.png',
    alt: 'Sliced dry-aged steak on a wooden board',
    width: 600,
    height: 338
  },
  {
    assetId: 'ember-oak-ember2-png',
    url: '/assets/images/Ember%26Oak/ember2.png',
    alt: 'A waterside dining terrace at sunset',
    width: 600,
    height: 450
  }
];

const URBAN_ASSETS = [
  {
    assetId: 'urban-slice-urban-slice1-png',
    url: '/assets/images/Urban-Slice/urban-slice1.png',
    alt: 'A slice of pepperoni pizza',
    width: 1120,
    height: 400
  },
  {
    assetId: 'urban-slice-urban-slice4-png',
    url: '/assets/images/Urban-Slice/urban-slice4.png',
    alt: 'A pepperoni pizza fresh from the oven',
    width: 390,
    height: 270
  },
  {
    assetId: 'urban-slice-urban-slice2-png',
    url: '/assets/images/Urban-Slice/urban-slice2.png',
    alt: 'A crispy chicken burger',
    width: 168,
    height: 180
  },
  {
    assetId: 'urban-slice-urban-slice3-png',
    url: '/assets/images/Urban-Slice/urban-slice3.png',
    alt: 'A double chicken burger',
    width: 168,
    height: 180
  }
];

describe('multi-template asset registries', () => {
  it('resolves an Ember & Oak registry with a percent-encoded directory URL', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets(EMBER_ASSETS, {
        heroAssetId: 'ember-oak-ember1-png',
        aboutAssetId: 'ember-oak-ember7-png',
        galleryAssetIds: ['ember-oak-ember2-png']
      })
    );

    expect(result.error).toBeNull();
    expect(result.viewModel?.media.hero).toEqual(EMBER_ASSETS[0]);
    expect(result.viewModel?.media.about).toEqual(EMBER_ASSETS[1]);
    expect(result.viewModel?.media.gallery).toEqual([EMBER_ASSETS[2]]);
  });

  it('preserves Urban Slice gallery order through the same resolver', () => {
    const result = parseWebsiteTemplateDesign(
      withAssets(URBAN_ASSETS, {
        heroAssetId: 'urban-slice-urban-slice1-png',
        aboutAssetId: 'urban-slice-urban-slice4-png',
        galleryAssetIds: [
          'urban-slice-urban-slice3-png',
          'urban-slice-urban-slice2-png'
        ]
      })
    );

    expect(result.viewModel?.media.hero?.assetId).toBe('urban-slice-urban-slice1-png');
    expect(result.viewModel?.media.about?.assetId).toBe('urban-slice-urban-slice4-png');
    expect(result.viewModel?.media.gallery.map(asset => asset.assetId)).toEqual([
      'urban-slice-urban-slice3-png',
      'urban-slice-urban-slice2-png'
    ]);
  });

  it('accepts the percent-encoded ampersand URL used by Ember & Oak', () => {
    expect(isSafeTemplateAssetUrl('/assets/images/Ember%26Oak/ember1.png')).toBe(true);
  });
});

describe('asset guards', () => {
  it('accepts lower-case slug asset IDs only', () => {
    expect(isSafeTemplateAssetId('sg-spicegarden1-png')).toBe(true);
    expect(isSafeTemplateAssetId('sg-1')).toBe(true);
    expect(isSafeTemplateAssetId('Sg-Hero')).toBe(false);
    expect(isSafeTemplateAssetId('-sg-hero')).toBe(false);
    expect(isSafeTemplateAssetId('sg hero')).toBe(false);
    expect(isSafeTemplateAssetId('')).toBe(false);
    expect(isSafeTemplateAssetId(null)).toBe(false);
  });

  it('accepts same-origin root-relative URLs only', () => {
    expect(isSafeTemplateAssetUrl('/assets/images/hero.png')).toBe(true);
    expect(isSafeTemplateAssetUrl('/assets/images/SpiceGarden/spicegarden1.png')).toBe(true);
    expect(isSafeTemplateAssetUrl('https://example.com/hero.png')).toBe(false);
    expect(isSafeTemplateAssetUrl('//example.com/hero.png')).toBe(false);
    expect(isSafeTemplateAssetUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeTemplateAssetUrl('/assets/../hero.png')).toBe(false);
    expect(isSafeTemplateAssetUrl('/assets\\hero.png')).toBe(false);
    expect(isSafeTemplateAssetUrl('assets/hero.png')).toBe(false);
    expect(isSafeTemplateAssetUrl('')).toBe(false);
    expect(isSafeTemplateAssetUrl(undefined)).toBe(false);
  });
});
