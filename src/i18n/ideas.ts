import type { Locale } from "@/i18n/config";

/**
 * Curated gift ideas offered in the wish editor. Some Dutch ideas also have an optional
 * concrete product; visitors choose separately whether to add it or only the general idea.
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

const EN_TITLES: Record<string, string> = {
  "scented-candle": "Scented candle", notebook: "A lovely notebook", mug: "Large coffee or tea mug",
  "puzzle-500": "500-piece puzzle", "card-game": "Card game", "plant-pot": "Indoor plant pot",
  "bath-bomb-set": "Bath bomb set", "reusable-bottle": "Reusable water bottle", "fluffy-socks": "Cosy socks", "pen-set": "Nice pen set",
  "building-blocks": "Building blocks", "picture-book": "Picture book", "board-game-family": "Family board game",
  "art-set": "Children’s art set", "play-dough": "Modelling dough set", "dress-up": "Dress-up clothes",
  "science-kit": "Science kit", "magnetic-tiles": "Magnetic building tiles", "jigsaw-kids": "Children’s jigsaw puzzle", "cuddly-toy": "Soft toy",
  headphones: "Headphones", "power-bank": "Power bank", "phone-stand": "Phone stand", sketchbook: "Sketchbook",
  "led-lights": "LED room lights", backpack: "Backpack", "card-game-party": "Party card game", hoodie: "Hoodie",
  "bluetooth-speaker": "Bluetooth speaker", "gift-voucher-cinema": "Cinema gift card",
  blanket: "Soft blanket", slippers: "Slippers", "tea-set": "Tea set", "book-light": "Reading light",
  "hot-water-bottle": "Hot water bottle", bathrobe: "Bathrobe", "jigsaw-adult": "1,000-piece puzzle",
  diffuser: "Aroma diffuser", "throw-pillow": "Cushion", "adult-colouring-book": "Colouring book",
  "chocolate-box": "Box of chocolates", "tea-selection": "Selection of teas", "coffee-beans": "Coffee beans",
  "cheese-board": "Cheese board", "spice-set": "Spice set", cookbook: "Cookbook", "baking-tin": "Baking tin",
  "hot-sauce-set": "Hot sauce set", "olive-oil": "Good olive oil", "gin-tonic-set": "Drinks set",
  "thermos-flask": "Thermos flask", "picnic-blanket": "Picnic blanket", headlamp: "Head torch",
  "sports-bottle": "Sports bottle", binoculars: "Binoculars", "bike-light-set": "Bike lights", "yoga-mat": "Yoga mat",
  "hiking-socks": "Hiking socks", frisbee: "Flying disc", "camping-mug": "Enamel camping mug",
};

const TITLES: Partial<Record<Locale, Record<string, string>>> = { nl: NL_TITLES, en: EN_TITLES };

/**
 * A concrete bol product behind an idea. Only the bol product id and a short display name
 * are stored: no price, image or description, so nothing can go stale except the product
 * itself. The link is a plain bol URL; the partner link is added when a wish is displayed.
 * Picked from bol's "Meest gewild" (most wished) results on 2026-11-17. Ideas in "under15"
 * only have a product when it cost € 15 or less on that date; re-check before changing.
 * Ideas without an entry simply add the idea title as a wish.
 */
export interface IdeaProduct {
  bolId: string;
  name: string;
}

const NL_PRODUCTS: Record<string, IdeaProduct> = {
  notebook: { bolId: "9300000045174131", name: "Peter Pauper Bookbound notitieboek – Gilded Tree of Life" },
  "puzzle-500": { bolId: "9300000277775995", name: "Jan van Haasteren – Een hondenleven (500 stukjes)" },
  "card-game": { bolId: "1004004006487381", name: "Beverbende (999 Games)" },
  "bath-bomb-set": { bolId: "9300000137888270", name: "Funky Fizzers – 8 badbruisballen" },
  "fluffy-socks": { bolId: "9300000125974638", name: "Warme huissokken, 5 paar" },
  "pen-set": { bolId: "9300000246113027", name: "BIC Cristal Pastel balpennen, 10 stuks" },
  "building-blocks": { bolId: "9300000181455762", name: "Little Dutch bouwblokken – Fairy Garden" },
  "picture-book": { bolId: "9300000174510838", name: "Het Grote Gevoelenshotel" },
  "board-game-family": { bolId: "9300000222631585", name: "Pictionary (Mattel)" },
  "play-dough": { bolId: "9300000166567045", name: "Play-Doh Fun Factory startset" },
  "science-kit": { bolId: "9300000151777642", name: "Clementoni Super Scheikunde experimenteerdoos" },
  "magnetic-tiles": { bolId: "9300000183681628", name: "PlayMix magnetische bouwtegels, 62 stuks" },
  "jigsaw-kids": { bolId: "9300000152168596", name: "Ravensburger Bluey 4-in-1 kinderpuzzels" },
  "cuddly-toy": { bolId: "9300000229495664", name: "Little Dutch knuffelhond Jackie" },
  headphones: { bolId: "9300000151669587", name: "JBL Live 770NC noise-cancelling koptelefoon" },
  "power-bank": { bolId: "9300000438193571", name: "Siltcon powerbank 20.000 mAh" },
  "phone-stand": { bolId: "9300000026187935", name: "Verstelbare telefoonstandaard voor op bureau" },
  sketchbook: { bolId: "9300000106767455", name: "Oxford schetsboek A4, 50 vel" },
  "led-lights": { bolId: "9300000309901668", name: "USB LED-strip 5 meter, warm wit" },
  "card-game-party": { bolId: "9300000003122902", name: "Throw Throw Burrito" },
  "bluetooth-speaker": { bolId: "9300000252617209", name: "JBL Go 5 mini speaker" },
  blanket: { bolId: "9300000161640643", name: "Komfortec fleece plaid 150×200 cm" },
  "tea-set": { bolId: "9300000102289112", name: "Mingtea theeset met glazen theepot" },
  "book-light": { bolId: "9300000187288214", name: "Sounix oplaadbaar leeslampje met klem" },
  bathrobe: { bolId: "9300000227127490", name: "LINNICK teddy fleece badjas" },
  "jigsaw-adult": { bolId: "9300000277775712", name: "Jan van Haasteren – Leve de Middellandse Zee (1000 stukjes)" },
  diffuser: { bolId: "9300000183986540", name: "Boncy Bonfire aroma-diffuser met vlameffect" },
  "throw-pillow": { bolId: "9300000264897582", name: "Dutch Decor Mart sierkussen 45×45 cm" },
  "adult-colouring-book": { bolId: "9300000220472853", name: "Coco Wyo – Cozy Cuties kleurboek" },
  "chocolate-box": { bolId: "9300000019648354", name: "Raffaello geschenkdoos 300 g" },
  "tea-selection": { bolId: "9300000239566022", name: "Pukka Tea Discovery Box" },
  "coffee-beans": { bolId: "9000000012512898", name: "Lavazza Crema e Aroma koffiebonen" },
  "cheese-board": { bolId: "9300000226712029", name: "Villux ronde borrelplank met kaasmesjes" },
  cookbook: { bolId: "9300000258651028", name: "Even simpel – Yotam Ottolenghi" },
  "baking-tin": { bolId: "9300000230858662", name: "Ronde bakvormen, 6-delige set" },
  "thermos-flask": { bolId: "9300000243226604", name: "Owala FreeSip 710 ml" },
  "picnic-blanket": { bolId: "9300000159252202", name: "Benson waterdicht picknickkleed 150×130 cm" },
  headlamp: { bolId: "9300000250840359", name: "Besjaar oplaadbare LED-hoofdlamp" },
  "sports-bottle": { bolId: "9300000265715962", name: "Cabau Bloom drinkfles 1 liter" },
  binoculars: { bolId: "9300000169798461", name: "Freek Vonk × Bresser verrekijker voor kinderen" },
  "bike-light-set": { bolId: "9300000152579540", name: "Inlustro LED-fietslampenset, oplaadbaar" },
  "yoga-mat": { bolId: "9300000155058975", name: "Tunturi yogamat 8 mm" },
  "hiking-socks": { bolId: "9300000194409811", name: "Danish Endurance merino wandelsokken" },
  frisbee: { bolId: "9200000081916400", name: "Jobber frisbee 25 cm" },
  "camping-mug": { bolId: "9300000291487457", name: "Cheqo emaille kampeermokken, set van 2" },
};

const PRODUCTS: Partial<Record<Locale, Record<string, IdeaProduct>>> = { nl: NL_PRODUCTS };

export function bolProductUrl(bolId: string): string {
  return `https://www.bol.com/nl/nl/p/product/${bolId}/`;
}

export interface LocalizedIdea {
  id: string;
  title: string;
  product?: { name: string; url: string };
}

export interface LocalizedIdeaCategory {
  category: IdeaCategory;
  ideas: LocalizedIdea[];
}

/** Ideas for a locale, or an empty list when none have been written for it. */
export function ideasForLocale(locale: Locale): LocalizedIdeaCategory[] {
  const titles = TITLES[locale];
  if (!titles) return [];
  return IDEA_CATEGORIES.map((category) => ({
    category,
    ideas: IDEA_IDS[category].flatMap((id): LocalizedIdea[] => {
      if (!titles[id]) return [];
      const product = PRODUCTS[locale]?.[id];
      return [{ id, title: titles[id], ...(product ? { product: { name: product.name, url: bolProductUrl(product.bolId) } } : {}) }];
    }),
  })).filter((entry) => entry.ideas.length > 0);
}

/** Folds case, accents, spaces and punctuation so "notitie boek" finds "notitieboek" and "cafe" finds "café". */
export function normalizeIdeaSearch(value: string, locale: Locale): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(locale).replace(/[^\p{L}\p{N}]+/gu, "");
}
