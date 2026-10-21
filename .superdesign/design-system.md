# Bare Brilliant — Design System

## Product context
Bare Brilliant is a modern Indian natural-diamond fine-jewellery house ("Meant, Not Made."). Rings and pieces are made around the person and the relationship, with no sales pressure. The site sells through emotion first and specification second.

Four product worlds, each tied to a moment in a relationship:
- **The Proposal**: engagement rings, for the moment you ask (`/the-proposal`)
- **The Vow**: wedding bands, where the yes becomes every day (`/the-vow`)
- **The Chapters**: anniversary and milestone pieces, the story after yes (`/the-chapters`)
- **Private Commission**: one-of-one pieces that don't belong in a category (`/private-commission`)

Sub-collections: Gifting, Wedding Collection, Anniversary, Birthday.
Conversion goal: the **Bare Brief**, a free consultation (`/chat?source=...`).

## Visual direction
Cinematic and editorial: a film-studio portfolio rather than a jewellery catalogue. Use full-bleed video panels stacked vertically, with very little UI chrome and a lot of negative space. Type sits directly on the footage. Motion is slow and deliberate. The footage carries the emotion and the type stays quiet.

The layout reference is amber.framer.media, a creative production studio template. It uses full-viewport film tiles with titles laid over them, a minimal top bar, generous black space, small uppercase metadata, and large serif statements.

## Color (dark is the hero identity)
- Ink ground: `#0b0b0a`. Raised `#141413`, card `#21211f`
- Text on dark: `#ded8ce`. Muted `#999890`
- Ivory (light companion, CTA fill on dark): `#f4f1eb`. Card `#e8e3da`
- Gold `#b79a72` (light `#d5c1a2` on dark): **only** for hairlines, eyebrows and micro-accents. Never use it as a fill or background.
- Hairline on dark: `rgba(216,209,196,0.16)`
- Video scrims: a linear gradient from `rgba(11,11,10,0)` to `rgba(11,11,10,0.55)`, so type stays legible while the footage remains the brightest object.

## Typography
- Display: **Playfair Display** Regular 400 for every display size, including italic for quotes. The "high contrast" comes from the typeface's stroke contrast, not from weight.
- UI/body: **Inter** 400/500/600.
- Hero wordmark: Playfair 400, clamp(3rem, 9vw, 8rem), letter-spacing 0.04em, uppercase.
- Section titles over video: Playfair 400, clamp(2.2rem, 6vw, 5.5rem), uppercase, tracking 0.03em.
- Quote fold: Playfair italic 400, clamp(1.8rem, 3.6vw, 3.25rem), line-height 1.25, centered, max-width ~22ch per line block.
- Eyebrow/meta: Inter 500 11–12px, uppercase, tracking 0.2em, gold-light, with a 6px rotated-square diamond bullet.
- Nav links: Inter 500 12–13px, uppercase, tracking 0.16em.
- Buttons: Inter 600 13px, uppercase, tracking 0.12em, radius 5px, min-height 44px. Primary is ivory fill with ink text (on dark). Secondary is a transparent 1px outline at `rgba(216,209,196,0.4)`. Tertiary is text followed by a → arrow that nudges on hover.

## Layout & spacing
- Max content width 1240px; gutter clamp(20px, 5vw, 70px)
- Section padding clamp(3.5rem, 9vw, 7rem)
- Video folds: full-bleed, 100vw by 100svh for the hero, and 80–90svh for each product fold
- Radius 5px (cards), 8px (large). No heavy shadows, so depth comes from the footage and scrims.
- Motif: the rotated-square diamond (eyebrow bullet, dividers)

## Logo
- Header uses the **diamond mark only** (no wordmark), monochrome silver/black, about 36–44px tall.
- Always use the supplied Brand Asset logo image. Never substitute initials, emoji, or an invented SVG.

## Motion
- Videos autoplay muted, loop and play inline, with a poster frame
- Fold titles fade up and letter-space in slightly on scroll (600–900ms, ease-out)
- Hover on a fold title: the arrow slides 4px and a gold hairline underline draws from left to right
- Respect prefers-reduced-motion

## Composition borrowed from the reference (amber.framer.media)
Borrow only the layout from Amber. Do NOT adopt its Antonio condensed face or its link blue. Bare Brilliant keeps Playfair, Inter, ink, ivory and gold.
- **Hero as a film slate:** a full-viewport video with one enormous centered wordmark. A thin metadata row is pinned to the bottom edge, in small uppercase Inter, e.g. "NATURAL DIAMONDS · MADE TO ORDER · PAN INDIA" on the left and "SCROLL ↓" on the right.
- **Full-bleed media bands:** 0px radius, 0px padding, edge to edge, with no card chrome. Each band has a centered title set low in the frame, in the bottom third, with a small caption above or below it (the world's one-line promise). Never round these bands.
- **Black interstitials:** thin solid-ink bands (about 8–14vh) separate consecutive video bands, like hard cuts between shots.
- **Hierarchy:** one large statement per screen, one small uppercase label, and one block of body text. Avoid mid-sized clutter.
- **Footer:** ink background. A large closing CTA line, underlined, sits between two tick-mark ruler dividers (thin repeating vertical ticks in the hairline color). Below that, a slim final row of small links spread across the full width: social links, phone, email and ©.
- **Restraint:** no gradients as decoration and no colored UI. Only a soft bottom scrim is allowed where type sits on bright footage.

## Navigation
Top bar: transparent over the hero, turning solid ink on scroll. The diamond logo sits on the left. Links on the right: PRODUCTS, ABOUT, and BARE BRIEF. BARE BRIEF is styled as the primary action, with a small "Free Consultation" sub-label.
