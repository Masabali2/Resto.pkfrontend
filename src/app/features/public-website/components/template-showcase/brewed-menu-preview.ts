/**
 * Static demo data for the Brewed & Co. template mockup shown inside the
 * Resto.pk public website template showcase.
 *
 * This is a temporary visual showcase only — it is intentionally kept in a
 * single, self-contained file so the whole mockup can be removed or replaced
 * later without touching unrelated public website sections.
 */

export type BrewedCategoryId = 'coffee' | 'cold-brew' | 'tea' | 'bakery';

export interface BrewedCategory {
  id: BrewedCategoryId;
  label: string;
}

export interface BrewedProduct {
  name: string;
  description: string;
  price: string;
  category: BrewedCategoryId;
  /** Emoji used as a graceful fallback when the product photo fails to load. */
  icon: string;
  imageSrc: string;
  imageAlt: string;
}

export interface BrewedReview {
  quote: string;
  author: string;
  detail: string;
  rating: number;
}

export const BREWED_CATEGORIES: readonly BrewedCategory[] = [
  { id: 'coffee', label: 'Coffee' },
  { id: 'cold-brew', label: 'Cold Brew' },
  { id: 'tea', label: 'Tea' },
  { id: 'bakery', label: 'Bakery' }
];

export const BREWED_PRODUCTS: readonly BrewedProduct[] = [
  {
    name: 'Espresso',
    description: 'A bold double shot pulled from our house dark roast.',
    price: '$3.50',
    category: 'coffee',
    icon: '☕',
    imageSrc: 'https://images.unsplash.com/photo-1510702082221-64c9d083186b?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A small cup of espresso with a rich crema on a wooden bar counter'
  },
  {
    name: 'Cappuccino',
    description: 'Velvety steamed milk over espresso, dusted with cocoa.',
    price: '$4.75',
    category: 'coffee',
    icon: '🥛',
    imageSrc: 'https://images.unsplash.com/photo-1572442388709-812118940923?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A cappuccino with latte art in a ceramic cup on a saucer'
  },
  {
    name: 'Caramel Latte',
    description: 'Espresso and silky micro-foam finished with caramel.',
    price: '$5.25',
    category: 'coffee',
    icon: '🍮',
    imageSrc: 'https://images.unsplash.com/photo-1559496414-e01fbc9ba8ad?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A tall glass of caramel latte drizzled with golden caramel'
  },
  {
    name: 'Classic Cold Brew',
    description: 'Steeped 18 hours for a smooth, low-acidity finish.',
    price: '$4.50',
    category: 'cold-brew',
    icon: '🧊',
    imageSrc: 'https://images.unsplash.com/photo-1517701550922-221a4c62fdab?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A glass of cold brew coffee over ice with condensation on the side'
  },
  {
    name: 'Nitro Cold Brew',
    description: 'Cascading nitrogen pour with a naturally sweet cream head.',
    price: '$5.50',
    category: 'cold-brew',
    icon: '🫧',
    imageSrc: 'https://images.unsplash.com/photo-1461029506026-14b1a6fc5f6f?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'Nitro cold brew being poured, with a creamy cascading head'
  },
  {
    name: 'Jasmine Green Tea',
    description: 'Delicate floral leaves, steeped to order at 80 °C.',
    price: '$4.00',
    category: 'tea',
    icon: '🍵',
    imageSrc: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A clear cup of pale green jasmine tea on a light table'
  },
  {
    name: 'Masala Chai Latte',
    description: 'House-blended spices simmered with frothed milk.',
    price: '$4.95',
    category: 'tea',
    icon: '🌶️',
    imageSrc: 'https://images.unsplash.com/photo-1571934811356-5cc061b682aa?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A spiced masala chai latte in a mug beside cinnamon sticks'
  },
  {
    name: 'Almond Croissant',
    description: 'Twice-baked laminated pastry filled with frangipane.',
    price: '$4.25',
    category: 'bakery',
    icon: '🥐',
    imageSrc: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A golden almond croissant topped with flaked almonds'
  },
  {
    name: 'Butter Bagel',
    description: 'Fresh-baked daily, toasted and spread by hand.',
    price: '$3.75',
    category: 'bakery',
    icon: '🥯',
    imageSrc: 'https://images.unsplash.com/photo-1509444471361-2a8d42febebe?auto=format&fit=crop&w=480&q=70',
    imageAlt: 'A sliced bagel with butter on a rustic plate'
  }
];

export const BREWED_GALLERY_IMAGES: readonly { src: string; alt: string }[] = [
  {
    src: 'assets/images/hero-food-preview.jpg',
    alt: 'Warmly plated café food photographed for the Brewed & Co. gallery'
  },
  {
    src: 'https://images.unsplash.com/photo-1442512555767-162abf5db2a4?auto=format&fit=crop&w=480&q=70',
    alt: 'Barista pouring steamed milk into a coffee cup at the counter'
  },
  {
    src: 'https://images.unsplash.com/photo-1521308832624-9e381abec613?auto=format&fit=crop&w=480&q=70',
    alt: 'Roasted coffee beans resting in a burlap sack'
  },
  {
    src: 'https://images.unsplash.com/photo-1501339860247-c1e12dbd6b83?auto=format&fit=crop&w=480&q=70',
    alt: 'Two coffee cups on a cafe table in soft morning light'
  }
];

export const BREWED_REVIEWS: readonly BrewedReview[] = [
  {
    quote: 'The cold brew alone is worth the trip — and ordering ahead on their site saves me ten minutes every morning.',
    author: 'Amara K.',
    detail: 'Regular since 2023',
    rating: 5
  },
  {
    quote: 'Cosiest corner of the city. The almond croissants sell out fast, so I book mine online before work.',
    author: 'Dani R.',
    detail: 'Verified order',
    rating: 5
  },
  {
    quote: 'Beautiful space, knowledgeable staff, and a menu that actually tells you where the beans come from.',
    author: 'Sofia M.',
    detail: 'Neighbourhood local',
    rating: 4
  }
];
