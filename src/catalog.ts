export interface Category {
  id: string;
  name: string;
  nameMl: string;
  prompt: string;
  emoji: string;
  defaultName: string;
  tagline: string;
  blurbMl: string;
  detail: string;
  hashtags: readonly string[];
}

/**
 * CLIP prompts are concrete product photos, not outdoor labels.
 * Each one is a niche the seller can list on WhatsApp.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'banana-chips',
    name: 'Banana chips & snacks',
    nameMl: 'കായ ചിപ്സ്',
    prompt: 'crispy banana chips or murukku savory snacks',
    emoji: '🍌',
    defaultName: 'Homemade Banana Chips',
    tagline: 'crispy & fresh',
    blurbMl: 'വീട്ടിൽ ഉണ്ടാക്കിയ കായ ചിപ്സ് — കുരുകുരുപ്പ്',
    detail: '250g pack · Made in Kochi',
    hashtags: ['#KeralaSnacks', '#BananaChips', '#Homemade', '#Kochi', '#SupportLocal'],
  },
  {
    id: 'pickles',
    name: 'Pickles & preserves',
    nameMl: 'അച്ചാർ',
    prompt: 'a jar of Indian pickle or preserved vegetables',
    emoji: '🫙',
    defaultName: 'Homemade Pickle',
    tagline: 'tangy & fresh',
    blurbMl: 'വീട്ടിൽ ഉണ്ടാക്കിയ അച്ചാർ — പുളിയും രുചിയും',
    detail: 'Glass jar · Made in Kerala',
    hashtags: ['#KeralaPickle', '#Achar', '#Homemade', '#KeralaFood', '#SupportLocal'],
  },
  {
    id: 'spices',
    name: 'Spices & powders',
    nameMl: 'മസാല',
    prompt: 'ground turmeric chili or masala spice powder',
    emoji: '🌶️',
    defaultName: 'Homemade Spice Mix',
    tagline: 'aromatic & fresh ground',
    blurbMl: 'വീട്ടിൽ അരച്ച മസാല — മണവും രുചിയും',
    detail: '100g pack · Made in Kerala',
    hashtags: ['#KeralaSpices', '#Masala', '#Homemade', '#Kochi', '#SupportLocal'],
  },
  {
    id: 'coconut',
    name: 'Coconut products',
    nameMl: 'തേങ്ങ',
    prompt: 'coconut oil, copra, or grated coconut',
    emoji: '🥥',
    defaultName: 'Kerala Coconut Product',
    tagline: 'fresh from the coast',
    blurbMl: 'കേരളത്തിലെ തേങ്ങ — ശുദ്ധവും പുതുമയുള്ളതും',
    detail: 'Farm packed · Made in Kerala',
    hashtags: ['#Coconut', '#KeralaCoconut', '#Homemade', '#SupportLocal', '#Nalikeram'],
  },
  {
    id: 'handloom',
    name: 'Handloom & textiles',
    nameMl: 'കൈത്തറി',
    prompt: 'handwoven fabric, saree, or handloom textile',
    emoji: '🧵',
    defaultName: 'Handloom Weave',
    tagline: 'woven by hand',
    blurbMl: 'കൈത്തറി — കൈകൊണ്ട് നെയ്തത്',
    detail: 'Cotton weave · Made in Kerala',
    hashtags: ['#Handloom', '#KeralaHandloom', '#Kaithari', '#SupportLocal', '#Handmade'],
  },
  {
    id: 'bakery',
    name: 'Bakery & sweets',
    nameMl: 'ബേക്കറി',
    prompt: 'bakery cake, cookies, or Indian sweets',
    emoji: '🍰',
    defaultName: 'Fresh Bakery Sweet',
    tagline: 'soft & just baked',
    blurbMl: 'ബേക്കറി മിഠായി — അടുപ്പിൽ നിന്ന് പുതിയത്',
    detail: 'Fresh batch · Made in Kochi',
    hashtags: ['#KeralaBakery', '#Sweets', '#Homemade', '#Kochi', '#SupportLocal'],
  },
  {
    id: 'produce',
    name: 'Fresh produce',
    nameMl: 'പച്ചക്കറി',
    prompt: 'fresh vegetables or ripe fruit',
    emoji: '🥬',
    defaultName: 'Fresh Produce',
    tagline: 'picked today',
    blurbMl: 'പുതിയ പച്ചക്കറിയും പഴവും — ഇന്ന് പറിച്ചത്',
    detail: 'Farm fresh · From Kerala',
    hashtags: ['#FreshProduce', '#KeralaVeg', '#Pachakkari', '#SupportLocal', '#FarmFresh'],
  },
  {
    id: 'crafts',
    name: 'Pottery & crafts',
    nameMl: 'കരകൗശലം',
    prompt: 'handmade clay pottery or a craft object',
    emoji: '🏺',
    defaultName: 'Handmade Craft',
    tagline: 'shaped by hand',
    blurbMl: 'കരകൗശലം — കൈകൊണ്ട് ഉണ്ടാക്കിയത്',
    detail: 'One of a kind · Made in Kerala',
    hashtags: ['#Handmade', '#KeralaCrafts', '#Pottery', '#SupportLocal', '#Karakaaushalam'],
  },
  {
    id: 'beauty',
    name: 'Beauty & oils',
    nameMl: 'എണ്ണ',
    prompt: 'a bottle of hair oil or skin oil',
    emoji: '💧',
    defaultName: 'Pure Hair Oil',
    tagline: 'light & homemade',
    blurbMl: 'ശുദ്ധമായ എണ്ണ — മുടിക്കും ചർമ്മത്തിനും',
    detail: '200ml bottle · Made in Kerala',
    hashtags: ['#HairOil', '#KeralaBeauty', '#CoconutOil', '#Homemade', '#SupportLocal'],
  },
  {
    id: 'other',
    name: 'Other / general product',
    nameMl: 'മറ്റുള്ളവ',
    prompt: 'an unrelated household object that is not food or fabric',
    emoji: '🛍️',
    defaultName: 'Homemade Product',
    tagline: 'made with care',
    blurbMl: 'വീട്ടിൽ ഉണ്ടാക്കിയ സാധനം — ശ്രദ്ധയോടെ',
    detail: 'Handmade · Made in Kerala',
    hashtags: ['#Homemade', '#Kerala', '#SupportLocal', '#SmallBusiness', '#MadeInKerala'],
  },
];

export const DEFAULT_CATEGORY_ID = 'banana-chips';

const byId = new Map(CATEGORIES.map((category) => [category.id, category]));
const byPrompt = new Map(CATEGORIES.map((category) => [category.prompt, category]));

export function categoryById(id: string): Category | undefined {
  return byId.get(id);
}

export function categoryByPrompt(prompt: string): Category | undefined {
  return byPrompt.get(prompt);
}

/** Prompts sent to CLIP. The manual "other" niche is seller-only, not a model label. */
export function nichePrompts(): string[] {
  return CATEGORIES.filter((category) => category.id !== 'other').map((category) => category.prompt);
}

export function resolveCategoryId(id: string | null | undefined): string {
  if (id && byId.has(id)) return id;
  return DEFAULT_CATEGORY_ID;
}

/** Target prompt first, then every other catalog niche. No outdoor labels. */
export function classificationLabels(overrideId?: string | null): {
  target: string;
  distractors: string[];
} {
  const chosen = overrideId ? categoryById(overrideId) : undefined;
  const clipNiches = CATEGORIES.filter((category) => category.id !== 'other');
  const target =
    chosen && chosen.id !== 'other'
      ? chosen.prompt
      : clipNiches[0]?.prompt ?? '';
  const distractors = clipNiches
    .filter((category) => category.prompt !== target)
    .map((category) => category.prompt);
  return { target, distractors };
}
