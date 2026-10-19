/**
 * Typed data model for the public-website template showcase.
 *
 * These entries describe marketing previews of Resto.pk restaurant templates.
 * They are NOT production websites — see `previewKind` for what each Preview
 * action actually opens.
 */

export type TemplateId = 'elegance' | 'brew-and-bean' | 'flame-grill' | 'bella-pizza';

/** What the "Preview" action shows for a template. */
export type TemplatePreviewKind =
  /** Static concept preview rendered inside the showcase modal. */
  | 'concept';

export interface TemplateCardModel {
  id: TemplateId;
  name: string;
  category: string;
  icon: string;
  description: string;
  /** Verified remote image URL (Unsplash CDN, w=640 crops). */
  imageSrc: string;
  imageAlt: string;
  /** Emoji shown if the image fails to load or is still loading. */
  fallbackIcon: string;
  previewKind: TemplatePreviewKind;
  /** Accent colour used by the card badge / concept preview (visual identity). */
  accentColor: string;
}

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=70`;

export const TEMPLATE_CARDS: readonly TemplateCardModel[] = [
  {
    id: 'elegance',
    name: 'Elegance',
    category: 'Fine Dining',
    icon: '🍷',
    description:
      'Sophisticated design with large photography and elegant typography.',
    imageSrc: UNSPLASH('photo-1414235077428-338989a2e8c0'),
    imageAlt:
      'Candle-lit fine-dining table setting with wine glasses, inspiration for the Elegance template',
    fallbackIcon: '🍷',
    previewKind: 'concept',
    accentColor: '#7c2d3a'
  },
  {
    id: 'brew-and-bean',
    name: 'Brew & Bean',
    category: 'Cafe & Coffee',
    icon: '☕',
    description: 'Warm, minimalist design perfect for coffee shops.',
    imageSrc: UNSPLASH('photo-1495474472287-4d71bcdd2085'),
    imageAlt:
      'Latte with heart art on a wooden café counter, inspiration for the Brew & Bean template',
    fallbackIcon: '☕',
    previewKind: 'concept',
    accentColor: '#a0622d'
  },
  {
    id: 'flame-grill',
    name: 'Flame Grill',
    category: 'Burger & Grill',
    icon: '🍔',
    description: 'Bold, energetic design with promotional sections.',
    imageSrc: UNSPLASH('photo-1571091718767-18b5b1457add'),
    imageAlt:
      'Juicy gourmet burger with melted cheese, inspiration for the Flame Grill template',
    fallbackIcon: '🍔',
    previewKind: 'concept',
    accentColor: '#d95204'
  },
  {
    id: 'bella-pizza',
    name: 'Bella Pizza',
    category: 'Pizza',
    icon: '🍕',
    description: 'Colorful, appetizing design with category-based menus.',
    imageSrc: UNSPLASH('photo-1513104890138-7c749659a591'),
    imageAlt:
      'Wood-fired margherita pizza topped with basil, inspiration for the Bella Pizza template',
    fallbackIcon: '🍕',
    previewKind: 'concept',
    accentColor: '#1f7a43'
  }
];
