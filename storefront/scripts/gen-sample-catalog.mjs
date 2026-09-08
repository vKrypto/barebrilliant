// Generates the sample storefront data + placeholder media under
// public/storage/. Output is committed (it is sample content, not a build
// artifact) — re-run after editing the PRODUCTS table below, or just drop real
// files in and delete this script.
//
//   storage/catalog/catalog.json              facets + sorts + product cards
//   storage/products/<id>.json                full PDP payload per product
//   storage/products_media/<ix>_<hash6>_<w>x<h>.webp   gallery + thumb images
//   storage/product_placeholder.webp          fallback image
//   storage/products_raw_media/.gitkeep       drop untouched source uploads here
//
// Run:  node scripts/gen-sample-catalog.mjs

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "public/storage");

const hash6 = (s) => createHash("sha1").update(s).digest("hex").slice(0, 6);

// ------------------------------------------------------------------ facets ----
const SHAPES = ["Round", "Oval", "Emerald", "Pear", "Marquise", "Cushion", "Radiant"];
const STYLES = ["Solitaire", "Hidden Halo", "Halo", "Three Stone", "Side Stone", "Bezel", "Contemporary"];
const BUDGET = [
  { label: "Under ₹1L", min: 0, max: 99999 },
  { label: "₹1L – ₹1.5L", min: 100000, max: 150000 },
  { label: "₹1.5L – ₹2L", min: 150001, max: 200000 },
  { label: "₹2L & above", min: 200001, max: 99999999 },
];
const CARAT = [
  { label: "Under 0.70 ct", min: 0, max: 0.69 },
  { label: "0.70 – 0.89 ct", min: 0.7, max: 0.89 },
  { label: "0.90 – 1.09 ct", min: 0.9, max: 1.09 },
  { label: "1.10 ct & above", min: 1.1, max: 99 },
];

const METALS = ["18K White Gold", "18K Yellow Gold", "18K Rose Gold", "Platinum 950"];
const TRUST = ["Natural Diamond", "HUID Gold", "Made to Order", "Insured PAN-India Delivery"];
const MTO_NOTE =
  "Made to order. Final value depends on the natural diamond and specifications you choose.";
const VARIATION_NOTE =
  "Carat weight, accent-stone count, metal weight and dimensions may vary with ring size, centre stone and custom configuration.";
const CAN_CHANGE = [
  "Shape", "Centre-stone carat", "Colour", "Clarity", "Band width", "Setting height",
  "Prong style", "Hidden halo", "Side diamonds", "Engraving", "Gold colour", "Supported karatage",
];
const COMES_WITH = [
  "GIA report for the applicable centre solitaire",
  "HUID gold",
  "Final price & specification record",
  "Insured PAN-India shipping",
  "Bare Brilliant packaging",
  "Service & aftercare information",
];

// ---------------------------------------------------------------- products ----
// [id, name, descriptor, shape, style, price_from, carat, resizable, about, why, bandFit, tint]
const PRODUCTS = [
  ["the-aria", "The Aria", "Cathedral oval solitaire", "Oval", "Solitaire", 92000, 0.7, "Limited",
    "An oval centre stone sits above a clean, restrained band with cathedral shoulders rising into the basket. From above, the ring remains almost entirely about the diamond. From the side, the architecture becomes visible.",
    "The cathedral shoulders rise gradually toward the centre setting, which makes the diamond feel integrated into the ring rather than placed on top of it. The band narrows slightly as it approaches the centre, increasing the diamond's visual dominance without making the ring feel delicate.",
    "A straight band sits closely with a small, intentional gap at the centre; a shaped contour band closes it completely.", 28],
  ["the-lumen", "The Lumen", "Hidden-halo round", "Round", "Hidden Halo", 128000, 0.9, "Yes",
    "A round brilliant rests in a plain four-prong head. Beneath it, a concealed halo of small natural diamonds circles the girdle — invisible from the front, catching light from the side.",
    "The hidden halo lifts the centre stone a fraction and adds brightness at the collar without widening the ring's footprint. From above the design stays minimal; the detail is a reward for looking closely.",
    "A straight band sits flush against the basket.", 24],
  ["the-vera", "The Vera", "Emerald three-stone", "Emerald", "Three Stone", 176000, 1.0, "Limited",
    "An emerald-cut centre is flanked by two tapered baguettes, all four corners protected by fine prongs. The step cuts line up along a single axis so the ring reads as one continuous plane of light.",
    "Three step-cut stones share the same cutting language, so the eye moves across the ring without interruption. The tapered side stones lengthen the hand and let the centre stone feel larger than its weight.",
    "Needs a shaped or contour band to sit closely against the side stones.", 22],
  ["the-isla", "The Isla", "Bezel-set pear", "Pear", "Bezel", 84000, 0.6, "Limited",
    "A pear-shaped natural diamond is held in a full bezel, its point protected by the metal rather than exposed. The band is slim and rounded, comfortable for everyday wear.",
    "The bezel makes the pear shape feel deliberate and modern, and it shields the most vulnerable part of the stone. Less light enters from the sides, so the cut has to be excellent — which is where we spend the budget.",
    "A straight band sits closely with no gap.", 18],
  ["the-nova", "The Nova", "Classic round halo", "Round", "Halo", 149000, 1.0, "Yes",
    "A round brilliant centre is ringed by a single row of claw-set natural diamonds, carried on a thin pavé band. The halo is kept tight so the ring still reads as one stone from a distance.",
    "A visible halo adds noticeable spread for the budget and frames the centre stone with continuous light. Keeping the halo narrow and the band thin stops the ring from looking larger than the hand.",
    "A straight pavé band matches the shoulder closely; a plain band leaves a slight gap.", 20],
  ["the-sona", "The Sona", "Cushion solitaire", "Cushion", "Solitaire", 112000, 0.8, "Yes",
    "A cushion-cut centre with soft corners sits in a low double-claw setting on a softly rounded band. The proportions are kept classic so the ring feels timeless rather than of a particular year.",
    "The low setting keeps the stone close to the finger, which reads as understated and wears well under gloves and sleeves. Soft corners on the cushion cut make the shape forgiving across a range of hand sizes.",
    "A straight band sits flush.", 19],
  ["the-wren", "The Wren", "Marquise side-stone", "Marquise", "Side Stone", 96000, 0.75, "Limited",
    "A marquise centre is set north–south with two small round natural diamonds on the shoulders, each in its own bezel. The long axis of the marquise stretches the finger.",
    "The two side stones echo the centre without competing with it, and their bezels keep the profile low. The marquise's length gives the most visual size per carat of any shape we set.",
    "Needs a contour band to clear the points of the marquise.", 17],
  ["the-elle", "The Elle", "Radiant contemporary", "Radiant", "Contemporary", 205000, 1.2, "No",
    "A radiant-cut centre is suspended between two flat, architectural bands that never meet — an open-shank design finished with a matte surface and polished edges.",
    "The split shank draws the eye straight to the centre stone and makes a large radiant feel weightless on the hand. The matte-and-polish contrast keeps a big diamond from tipping into showiness.",
    "Requires a bespoke band shaped to the open shank.", 26],
];

// ------------------------------------------------------------------ build -----
mkdirSync(resolve(OUT, "catalog"), { recursive: true });
mkdirSync(resolve(OUT, "products"), { recursive: true });
mkdirSync(resolve(OUT, "products_media"), { recursive: true });
mkdirSync(resolve(OUT, "products_raw_media"), { recursive: true });
rmSync(resolve(OUT, "products_media"), { recursive: true, force: true });
mkdirSync(resolve(OUT, "products_media"), { recursive: true });
writeFileSync(resolve(OUT, "products_raw_media/.gitkeep"), "");

// placeholder SVG -> webp
function tile({ w, h, name, descriptor, tint = 20 }) {
  const accent = "#b79a72";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(${tint}, 8%, 11%)"/><stop offset="1" stop-color="hsl(${tint}, 10%, 7%)"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g fill="none" stroke="${accent}" stroke-opacity="0.28">
    <rect x="${w / 2 - w * 0.19}" y="${h / 2 - w * 0.19}" width="${w * 0.38}" height="${w * 0.38}" transform="rotate(45 ${w / 2} ${h / 2})"/>
    <rect x="${w / 2 - w * 0.12}" y="${h / 2 - w * 0.12}" width="${w * 0.24}" height="${w * 0.24}" transform="rotate(45 ${w / 2} ${h / 2})"/>
  </g>
  <text x="${w / 2}" y="${h * 0.12}" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="${w * 0.028}" letter-spacing="${w * 0.006}">BARE BRILLIANT</text>
  <text x="${w / 2}" y="${h * 0.84}" text-anchor="middle" fill="#f4f1eb" font-family="Georgia, serif" font-size="${w * 0.07}">${name}</text>
  <text x="${w / 2}" y="${h * 0.89}" text-anchor="middle" fill="#999890" font-family="sans-serif" font-size="${w * 0.026}">${descriptor}</text>
  <text x="${w / 2}" y="${h * 0.95}" text-anchor="middle" fill="#73736e" font-family="sans-serif" font-size="${w * 0.02}" letter-spacing="${w * 0.004}">SAMPLE IMAGE · REPLACE IN storage/</text>
</svg>`);
}

async function webp(svg, file) {
  await sharp(svg).webp({ quality: 72 }).toFile(resolve(OUT, file));
}

// Product photography is mostly square (1:1); object-fit: cover in the UI
// absorbs the occasional off-square crop.
await webp(
  tile({ w: 1200, h: 1200, name: "Bare Brilliant", descriptor: "Natural diamond engagement rings", tint: 20 }),
  "product_placeholder.webp"
);

const cards = [];
for (const [id, name, descriptor, shape, style, price_from, carat, resizable, about, why, bandFit, tint] of PRODUCTS) {
  const h = hash6(id);
  const thumb = `products_media/0_${h}_1200x1200.webp`;
  const gallery = [0, 1, 2].map((ix) => ({
    src: `products_media/${ix}_${h}_1600x1600.webp`,
    type: "image",
    alt: `${name} — ${shape.toLowerCase()} natural diamond engagement ring, view ${ix + 1}`,
  }));

  // media — square
  await webp(tile({ w: 1200, h: 1200, name, descriptor, tint }), thumb);
  for (let ix = 0; ix < 3; ix++) {
    await webp(tile({ w: 1600, h: 1600, name, descriptor: `${descriptor} · ${["front", "profile", "on hand"][ix]}`, tint }), gallery[ix].src);
  }

  const breakup = {
    "Centre Natural Diamond": Math.round(price_from * 0.56),
    "Accent Diamonds": Math.round(price_from * 0.07),
    "Gold / Platinum": Math.round(price_from * 0.22),
    "Making / Crafting": Math.round(price_from * 0.1),
    GST: Math.round(price_from * 0.05),
  };
  const total = Object.values(breakup).reduce((a, b) => a + b, 0);

  cards.push({
    id, slug: id, name, descriptor, shape, style, price_from,
    centre_carat_shown: carat, metal_default: METALS[0], badges: ["Natural Diamond"],
    media: { thumb, alt: gallery[0].alt },
    created_at: new Date(2026, 7, 1 + cards.length).toISOString().slice(0, 10),
    sort_weight: 100 - cards.length * 7,
  });

  const product = {
    id, slug: id, name,
    subtitle: `${shape} Natural Diamond Engagement Ring`,
    price_from, currency: "INR", made_to_order_note: MTO_NOTE, trust_line: TRUST,
    shape, style, metals: METALS, metal_default: METALS[0],
    gallery, about, why_this_works: why, wedding_band_fit: bandFit,
    price_breakup: Object.entries(breakup).map(([label, amount]) => ({ label, amount })),
    total,
    specifications: {
      band_width_mm: (1.6 + (tint % 6) * 0.1).toFixed(1),
      setting_height_mm: (5.4 + (carat - 0.6) * 3).toFixed(1),
      centre_shape: shape,
      side_diamond_weight_ct: (0.08 + (tint % 5) * 0.03).toFixed(2),
      accent_diamond_count: 10 + (tint % 7) * 6,
      accent_colour_clarity: "F–G / VS",
      metal_purity: "18K / 950",
      approx_metal_weight_g: (2.8 + (carat - 0.6) * 1.6).toFixed(1),
      resizable,
      wedding_band_fit: bandFit,
    },
    variation_note: VARIATION_NOTE,
    what_can_change: CAN_CHANGE,
    what_comes_with: COMES_WITH,
    related: PRODUCTS.filter((p) => p[0] !== id).slice(0, 3).map((p) => p[0]),
  };
  writeFileSync(resolve(OUT, `products/${id}.json`), JSON.stringify(product, null, 2) + "\n");
}

const catalog = {
  generated_at: new Date().toISOString(),
  currency: "INR",
  facets: { shape: SHAPES, style: STYLES, budget: BUDGET, centre_carat: CARAT },
  sorts: ["recommended", "newest", "price-asc", "price-desc"],
  products: cards,
};
writeFileSync(resolve(OUT, "catalog/catalog.json"), JSON.stringify(catalog, null, 2) + "\n");

console.log(`[gen-sample-catalog] ${cards.length} products, ${cards.length * 4 + 1} webp files -> public/storage/`);
