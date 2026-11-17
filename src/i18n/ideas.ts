import type { Locale } from "@/i18n/config";

/**
 * Curated gift ideas offered in the wish editor. An idea is only a short product title:
 * no price, image or fixed product page, so nothing here can go stale. The shop search
 * links are built from the title at display time.
 *
 * Category and idea ids are stable English identifiers. Idea titles are editorial content
 * per locale (not UI strings); a locale without an entry simply shows no ideas block.
 * The lists are written independently per locale, they are not translations of each other.
 */
export const IDEA_CATEGORIES = ["under15", "kids", "teens", "cosy", "food", "outdoors"] as const;
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

export const IDEA_IDS: Record<IdeaCategory, readonly string[]> = {
  under15: [
    "scented-candle", "notebook", "mug", "puzzle-500", "card-game",
    "plant-pot", "bath-bomb-set", "reusable-bottle", "fluffy-socks", "pen-set",
  ],
  kids: [
    "building-blocks", "picture-book", "board-game-family", "art-set", "play-dough",
    "dress-up", "science-kit", "magnetic-tiles", "jigsaw-kids", "cuddly-toy",
  ],
  teens: [
    "headphones", "power-bank", "phone-stand", "sketchbook", "led-lights",
    "backpack", "card-game-party", "hoodie", "bluetooth-speaker", "gift-voucher-cinema",
  ],
  cosy: [
    "blanket", "slippers", "tea-set", "book-light", "hot-water-bottle",
    "bathrobe", "jigsaw-adult", "diffuser", "throw-pillow", "adult-colouring-book",
  ],
  food: [
    "chocolate-box", "tea-selection", "coffee-beans", "cheese-board", "spice-set",
    "cookbook", "baking-tin", "hot-sauce-set", "olive-oil", "gin-tonic-set",
  ],
  outdoors: [
    "thermos-flask", "picnic-blanket", "headlamp", "sports-bottle", "binoculars",
    "bike-light-set", "yoga-mat", "hiking-socks", "frisbee", "camping-mug",
  ],
};

const NL_TITLES: Record<string, string> = {
  "scented-candle": "Geurkaars",
  notebook: "Mooi notitieboek",
  mug: "Grote koffie- of theemok",
  "puzzle-500": "Puzzel van 500 stukjes",
  "card-game": "Kaartspel",
  "plant-pot": "Plantenpot voor binnen",
  "bath-bomb-set": "Badbruisballen set",
  "reusable-bottle": "Herbruikbare drinkfles",
  "fluffy-socks": "Warme sokken",
  "pen-set": "Mooie pennen set",
  "building-blocks": "Bouwblokken",
  "picture-book": "Prentenboek",
  "board-game-family": "Bordspel voor het hele gezin",
  "art-set": "Tekenset voor kinderen",
  "play-dough": "Klei set",
  "dress-up": "Verkleedkleren",
  "science-kit": "Experimenteerdoos",
  "magnetic-tiles": "Magnetische bouwtegels",
  "jigsaw-kids": "Kinderpuzzel",
  "cuddly-toy": "Knuffel",
  headphones: "Koptelefoon",
  "power-bank": "Powerbank",
  "phone-stand": "Telefoonstandaard",
  sketchbook: "Schetsboek",
  "led-lights": "Ledlampjes voor op de kamer",
  backpack: "Rugzak",
  "card-game-party": "Partyspel voor vrienden",
  hoodie: "Hoodie",
  "bluetooth-speaker": "Bluetooth speaker",
  "gift-voucher-cinema": "Bioscoopbon",
  blanket: "Zachte plaid",
  slippers: "Pantoffels",
  "tea-set": "Theeset",
  "book-light": "Leeslampje",
  "hot-water-bottle": "Warmwaterkruik",
  bathrobe: "Badjas",
  "jigsaw-adult": "Puzzel van 1000 stukjes",
  diffuser: "Geurverspreider",
  "throw-pillow": "Sierkussen",
  "adult-colouring-book": "Kleurboek voor volwassenen",
  "chocolate-box": "Doos bonbons",
  "tea-selection": "Theeassortiment",
  "coffee-beans": "Koffiebonen",
  "cheese-board": "Kaasplank",
  "spice-set": "Kruidenset",
  cookbook: "Kookboek",
  "baking-tin": "Bakvorm",
  "hot-sauce-set": "Hotsauce set",
  "olive-oil": "Goede olijfolie",
  "gin-tonic-set": "Borrelset",
  "thermos-flask": "Thermosfles",
  "picnic-blanket": "Picknickkleed",
  headlamp: "Hoofdlamp",
  "sports-bottle": "Sportfles",
  binoculars: "Verrekijker",
  "bike-light-set": "Fietslampjes set",
  "yoga-mat": "Yogamat",
  "hiking-socks": "Wandelsokken",
  frisbee: "Frisbee",
  "camping-mug": "Emaille kampeermok",
};

const TITLES: Partial<Record<Locale, Record<string, string>>> = { nl: NL_TITLES };

export interface LocalizedIdeaCategory {
  category: IdeaCategory;
  ideas: { id: string; title: string }[];
}

/** Ideas for a locale, or an empty list when none have been written for it. */
export function ideasForLocale(locale: Locale): LocalizedIdeaCategory[] {
  const titles = TITLES[locale];
  if (!titles) return [];
  return IDEA_CATEGORIES.map((category) => ({
    category,
    ideas: IDEA_IDS[category].flatMap((id) => (titles[id] ? [{ id, title: titles[id] }] : [])),
  })).filter((entry) => entry.ideas.length > 0);
}
