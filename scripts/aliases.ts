// Build-time search aliases. Each key is a canonical phrase (lowercased, words
// separated by single spaces) that the seed pipeline expects to see verbatim
// somewhere inside a merged Food's source descriptions. When a match hits, the
// synonyms are appended as tokens to that Food's `searchText` — never to the
// display `name`. Aliases apply equally to raw and cooked rows (state stays
// separate, so the cooked-weight macros stay correctly addressable via cues
// like "cooked ribeye" or "grilled london broil").
//
// Directional and one-sided by design: we map a canonical to alternates; we
// don't try to be exhaustive on every synonym pair. Ambiguous colloquials
// (e.g. UK "chips" == US "fries", but US "chips" == crisps) are excluded.

export const ALIASES: Record<string, string[]> = {
  // ─── Beef: round primal ───────────────────────────────────────────────
  "top round": ["london", "broil", "london broil", "inside round"],
  "bottom round": ["outside round", "silverside"],
  "eye of round": ["eye round"],
  "round tip": ["sirloin tip", "knuckle"],

  // ─── Beef: loin primal ────────────────────────────────────────────────
  "top sirloin": ["sirloin steak", "coulotte"],
  "top sirloin cap": ["picanha", "coulotte", "rump cap"],
  "bottom sirloin": ["ball tip"],
  "tri tip": ["santa maria steak", "triangle steak"],
  tenderloin: ["filet mignon", "filet", "fillet", "chateaubriand"],
  "short loin": ["porterhouse", "t bone", "tbone"],
  "strip steak": ["ny strip", "new york strip", "kansas city strip", "shell steak", "club steak"],

  // ─── Beef: rib primal ─────────────────────────────────────────────────
  "rib eye": ["ribeye", "delmonico", "spencer steak", "scotch fillet"],
  ribeye: ["rib eye", "delmonico", "spencer steak", "scotch fillet"],
  "prime rib": ["standing rib roast", "rib roast"],
  "rib roast": ["prime rib", "standing rib roast"],

  // ─── Beef: chuck primal ───────────────────────────────────────────────
  "chuck roast": ["pot roast"],
  "chuck eye": ["chuck eye steak", "poor mans ribeye"],
  "flat iron": ["top blade", "butlers steak"],
  "top blade": ["flat iron"],
  "denver steak": ["underblade", "denver cut"],
  "chuck tender": ["mock tender", "scotch tender"],
  "arm roast": ["shoulder roast", "ranch steak"],
  "shoulder tender": ["petite tender", "teres major", "bistro tender"],

  // ─── Beef: plate, flank, brisket ──────────────────────────────────────
  "flank steak": ["bavette"],
  "skirt steak": ["arrachera", "fajita meat", "outside skirt", "inside skirt"],
  "hanger steak": ["onglet", "butchers steak", "hanging tender"],
  brisket: ["pastrami cut", "corned beef cut"],
  "short ribs": ["flanken", "kalbi", "korean short ribs", "english short ribs"],

  // ─── Beef: shanks (fore/hind, raw + cooked variants share the token) ──
  "fore shank": ["beef shank", "shank crosscut", "osso buco"],
  "hind shank": ["beef shank", "shank crosscut"],
  "beef shank": ["fore shank", "hind shank", "osso buco"],

  // ─── Beef: ground / processed ─────────────────────────────────────────
  "ground beef": ["hamburger", "mince", "minced beef", "beef mince", "hamburg"],

  // ─── Poultry / pork / seafood ─────────────────────────────────────────
  "chicken thigh": ["dark meat chicken"],
  "chicken breast": ["white meat chicken"],
  "pork belly": ["side pork"],
  "pork shoulder": ["boston butt", "picnic shoulder", "pork butt"],
  shrimp: ["prawn", "prawns"],

  // ─── Produce (roadmap examples + common colloquials) ──────────────────
  pummelo: ["pomelo"],
  chickpea: ["garbanzo", "garbanzos", "ceci"],
  chickpeas: ["garbanzo", "garbanzos", "ceci"],
  garbanzo: ["chickpea", "chickpeas"],
  zucchini: ["courgette"],
  eggplant: ["aubergine", "brinjal"],
  arugula: ["rocket", "rucola"],
  cilantro: ["coriander leaves", "chinese parsley"],
  scallion: ["green onion", "spring onion"],
  scallions: ["green onions", "spring onions"],
  "bell pepper": ["capsicum"],
  beet: ["beetroot"],
  beets: ["beetroot"],
  "snow pea": ["mangetout"],
  "snow peas": ["mangetout"],
  rutabaga: ["swede", "yellow turnip"],
  raisin: ["sultana"],
  raisins: ["sultanas"],

  // ─── Dairy ────────────────────────────────────────────────────────────
  "cottage cheese": ["curds"],
  "heavy cream": ["double cream"],

  // ─── Grains / staples ─────────────────────────────────────────────────
  cornstarch: ["cornflour", "corn flour"],
  "powdered sugar": ["confectioners sugar", "icing sugar"],
  oatmeal: ["porridge", "porridge oats"],
  "whole wheat": ["wholemeal"],
  "all purpose flour": ["plain flour"],
  "self rising flour": ["self raising flour"],

  // ─── Prepared / snack ─────────────────────────────────────────────────
  "french fries": ["chips", "fries"],
  cookie: ["biscuit"],
  cookies: ["biscuits"],
  soda: ["pop", "soft drink", "fizzy drink"],

  // ─── Nuts / condiments ────────────────────────────────────────────────
  peanut: ["groundnut", "goober"],
  peanuts: ["groundnuts"],
  molasses: ["treacle", "black treacle"],
};

// Word-boundary regex for one canonical key, cached so seed-time expansion
// doesn't recompile per row.
const REGEX_CACHE = new Map<string, RegExp>();
function regexFor(canonical: string): RegExp {
  let re = REGEX_CACHE.get(canonical);
  if (!re) {
    re = new RegExp(`\\b${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    REGEX_CACHE.set(canonical, re);
  }
  return re;
}

// Given a Food's already-collected tokens and the raw normalized descriptions
// of its merged source rows, return the additional alias tokens to append.
// Pure — never mutates the inputs.
export function expandAliases(
  existingTokens: ReadonlySet<string>,
  normalizedDescriptions: readonly string[],
): Set<string> {
  const added = new Set<string>();
  for (const [canonical, synonyms] of Object.entries(ALIASES)) {
    const re = regexFor(canonical);
    if (!normalizedDescriptions.some((d) => re.test(d))) continue;
    for (const syn of synonyms) {
      for (const word of syn.split(" ")) {
        if (word && !existingTokens.has(word)) added.add(word);
      }
    }
  }
  return added;
}
