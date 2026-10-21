---
version: "superdesign-alpha"
name: "Condensed Cinema"
description: "Near-black editorial system built on an oversized condensed-grotesk headline face, full-bleed video cards, and a single blue-link accent inherited from browser default ink."
colors:
  background: "#0A0A0A"
  surface: "#000000"
  text-primary: "#FFFFFF"
  text-secondary: "#A1A1A1"
  accent: "#0000EE"
typography:
  display-lg:
    fontFamily: "Antonio"
    fontSize: "186px"
    fontWeight: 500
    lineHeight: "1.1"
    letterSpacing: "-11.2px"
  headline-md:
    fontFamily: "Antonio"
    fontSize: "64px"
    fontWeight: 600
    lineHeight: "1.1"
    letterSpacing: "-1.9px"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "1.4"
  label-md:
    fontFamily: "Antonio"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "1"
    letterSpacing: "-0.2px"
  accent-tight:
    fontFamily: "Inter Tight"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "1.4"
  legacy-serif:
    fontFamily: "Times New Roman"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.4"
spacing:
  base: "4px"
  gap: "16px"
  section-padding: "20px"
rounded:
  control: "9px"
  card: "9px"
  pill: "30px"
components:
  button-primary-hero:
    background: "#FFFFFF"
    text-color: "#0A0A0A"
    radius: "9px"
    height: "auto"
    note: "observed near-white solid pill/rect under the hero wordmark; not in measured set"
  button-utility-stack:
    background: "#FFFFFF"
    text-color: "#000000"
    radius: "30px"
    height: "~38px"
    shadow: "rgba(0, 0, 0, 0.15) 0px 0.602187px 1.80656px -1px, rgba(0, 0, 0, 0.14) 0px 2.28853px 6.8656px -2px, rgba(0, 0, 0, 0.1) 0px 10px 30px -3px"
  button-badge-framer:
    background: "#000000"
    text-color: "#FFFFFF"
    radius: "30px"
    border: "rgb(0, 0, 0) 0px 0px 0px 1px inset"
  navbar:
    background: "transparent"
    radius: "0px 0px 0px 0px"
    height: "37px"
    width: "100%"
  card-logo-strip:
    background: "transparent"
    radius: "0px"
    padding: "0px"
  card-project:
    background: "#000000"
    radius: "0px"
    padding: "0px"
    shadow: "rgba(0, 0, 0, 0.17) 0px 0.602187px 1.56569px -1.5px, rgba(0, 0, 0, 0.14) 0px 2.28853px 5.95019px -3px, rgba(0, 0, 0, 0.02) 0px 10px 26px -4.5px"
---
# Condensed Cinema
Source: https://amber.framer.media/

## Overview
This is a dark-mode-default editorial system for motion-led portfolio work: full-bleed video surfaces carry the content, and an oversized condensed display grotesk (Antonio, tracked tight to near -11px at 186px) does the branding work that logos or color normally would. The palette is almost monochrome — near-black (#0A0A0A) ground, white ink, grey secondary — with a single accidental accent, browser-default link blue (#0000EE), the only hue in the system. It reads as Swiss-adjacent minimalism crossed with cinematic grain: ruled hairline dividers, all-caps condensed labels, and video as the primary graphic device rather than illustration or gradient.

## Composition
The first screen is a full-viewport video/photo portrait with an enormous condensed wordmark overlaid dead-center, a transparent edge-to-edge navbar above it, and a thin metadata row pinned to the bottom edge (location, time, role label) — a classic film-slate framing device. Below the fold the rhythm alternates: a horizontally-scrolling logo rail, then a sequence of full-bleed video/image bands each introduced by a small centered title + metadata caption sitting low in the frame, separated by hard cuts to solid black bands that function as breathing room/slate cards. The page closes on a dense black footer stacked with a multi-line statement, a two-column services list, a large underlined call-to-action line, a tickmark ruler divider, and a slim final link row. The deliberate choice is letting video/photo bleed completely off the viewport edges with zero card chrome (0px radius, 0px padding) rather than containing media in rounded cards — this trades polish for raw, cinematic continuity, rejecting the bento/card-grid convention common to portfolio sites.

## Colors
Background is black-dominant by pixel count (#000000 ~60%, #181818 ~7%) with cool-toned photographic blues (#486090, #607890, #487890 ~12% combined) and a dark warm pocket (#301818 ~2%) appearing only inside the embedded video/photo content, never as applied UI color. The declared UI background is #0A0A0A at ~99.9% of styled area — confirming the shell itself is unbroken near-black. Text ink is pure white (#FFFFFF) for primary copy and headlines, #A1A1A1 for secondary/muted labels, and #000000 for ink sitting on light video-still backgrounds. The sole deliberate accent is #0000EE, inherited link blue, rationed to a handful of inline text links in the footer and nowhere else — no button, badge, or icon carries brand color. Everything else — buttons, dividers, borders — stays white, grey, or black; color is something the footage brings, not the UI.

## Typography
Antonio, a tall condensed sans, is the display and label voice throughout: 186px/500 at -11.2px tracking for the hero wordmark, 64px/600 at -1.9px for mid-page section titles, and 18px/500 at -0.2px for all-caps micro-labels (section eyebrows, navbar items). Inter 16px/500 carries all running body copy and captions at 1.4 line-height — the only humanist, non-condensed voice in the system, keeping long sentences legible against the aggressive display face. Inter Tight and Times New Roman appear as incidental system/fallback faces at the same 16px/500 body size and should be treated as backup stacks, not intentional accents. The hierarchy logic is stark: one enormous condensed headline per screen, one small condensed label, one block of regular-weight Inter body — no mid-sized intermediate sizes.

## Layout
Content runs edge-to-edge (video/photo bands are full-bleed) with a generous internal max-width of 1800px reserved for text blocks and the footer grid. Spacing is tight and small-increment — 4px, 6px, 8px, 12px, 16px, 20px — consistent with a dense, caption-driven layout rather than generous whitespace. The logo strip is a horizontal scrolling rail (marquee pattern) of repeating equal-width icon marks. Card radius across the system is 0px — no rounded containers — while the few true controls (pill buttons, badges) use 30px full-pill radii, and small utility chrome uses 9–15px rounding. The footer resolves into a two-column list layout flanking a left-aligned statement, divided by a thin ruled hairline and a tickmark-pattern divider graphic — the only ornamental, non-photographic graphic device in the system.

## Components
- **Navbar** — top of every screen, edge-to-edge and sticky. Transparent fill, 37px tall, 100% viewport width (0px inset either side), square corners on all four corners (0/0/0/0) — an edge-to-edge bar, not an inset or capsule. Holds 4 items: a wordmark mark at far left, two centered text links, and one right-aligned CTA-style label.
- **Hero primary button** — bottom-right of the first screen, stacked above two secondary controls. An observed near-white solid fill with dark text, small rounded corners (~9px observed), compact height; this is the single highest-contrast clickable element on the page and the true primary action, distinct from the glass/utility stack beside it.
- **Utility button stack (secondary)** — same bottom-right cluster, two more pill-shaped (30px radius) white-fill buttons stacked below the primary, each carrying the layered shadow `rgba(0, 0, 0, 0.15) 0px 0.602187px 1.80656px -1px, rgba(0, 0, 0, 0.14) 0px 2.28853px 6.8656px -2px, rgba(0, 0, 0, 0.1) 0px 10px 30px -3px` — these are template/marketplace utility links, not the page's own primary action.
- **Badge button** — smallest of the bottom-right stack, black fill, 30px pill radius, 1px solid-black inset border (`rgb(0,0,0) 0px 0px 0px 1px inset`), carrying an attribution mark + short label.
- **Logo strip rail** — appears once, directly beneath the navbar on scroll, a horizontal scrolling row of ~14 equal-size abstract icon marks on black, transparent background, 0px radius, no padding — a scrolling rail / marquee pattern used purely as a trust/credential band.
- **Full-bleed media card (project band)** ×multiple, one per scroll section. Transparent/black background, 0px radius, 0px padding, shadow `rgba(0, 0, 0, 0.17) 0px 0.602187px 1.56569px -1.5px, rgba(0, 0, 0, 0.14) 0px 2.28853px 5.95019px -3px, rgba(0, 0, 0, 0.02) 0px 10px 26px -4.5px` on the few that float above solid black bands. Internal anatomy top-to-bottom: full-bed video or photograph covering the entire band (live surfaces are video elements; use a static gradient/photo still as a stand-in), with a centered condensed title (Antonio, ~64px) and a small Inter metadata caption (date · category) sitting low in the frame near the bottom third, scrim-free — legibility comes from a dark anchoring region of the source footage itself.
- **Solid-black interstitial band** — appears between every media section as a full-width spacer, pure #0A0A0A/#000000, no content, functioning as a cut/slate between cinematic shots.
- **Footer** — final section, background #0A0A0A. Contains a large multi-line Inter statement at upper-left, a two-column services list (label column "SERVICES" in condensed caps + two text columns of plain links) in the middle, a large underlined condensed call-to-action line center stage, a tickmark-ruler divider graphic above and below that line, and a closing row of 6 small links (attribution + 3 social + legal + copyright) split across the full width.

## Graphics & Effects
Six video elements (`video, video, video, video, video, video`) drive every full-bleed media band; when rebuilding, stand each in with a static desaturated-blue or warm-sunset gradient still matching the pixel field, since no gradient CSS was authored for these surfaces — the color comes entirely from the footage. No scrims are applied over video; legibility of overlaid type depends on positioning text over naturally dark regions of each clip. The three shadow values are soft, tightly-layered elevation stacks used only on the floating bottom-right button cluster and on media cards that sit above black interstitials — both are multi-layer (ambient + key + contact) shadows, not single flat drops. Texture is entirely photographic/filmic: grain and color variance come from the video sources themselves (cool blue studio light in the hero, warm sunset-orange sky, dim indoor amber), not from an applied noise or dot overlay — there is no synthetic texture layer in this system.

## Motion
Interaction easing is `color 0.2s cubic-bezier(0.44, 0, 0.56, 1)` for text/link hover states — a controlled, slightly eased curve rather than linear or springy. An `overflow 0.001s ease` transition is used as a near-instant layout-snap utility, likely gating clipped containers during scroll-triggered reveals. The stack runs on framer-motion for scroll-triggered section entrances and Lenis for smoothed inertial scrolling — together producing a cinematic, slightly decelerated scroll feel rather than native browser scroll snap, consistent with the full-bleed video-cut pacing of the page.

## Guardrails
- Never round the full-bleed media/project cards — they are 0px square-cornered, full-bleed, no padding; rounding them breaks the cinematic-cut identity.
- Keep color absent from UI chrome — the only hue permitted is the incidental #0000EE link blue in body copy; do not tint buttons, badges, or dividers.
- Do not substitute the hero's near-white primary button with the glass/utility pill stack's shadow or radius values — they are separate, lower-priority controls beside it.
- Preserve the navbar as an edge-to-edge, square-cornered, transparent, sticky 37px bar — never convert it into an inset, capsule, or opaque bar.
- Keep the Antonio condensed face reserved for display/label roles only; never set body paragraphs in it — Inter carries all reading copy.
- Do not add gradients or scrims to the video bands; all color must come from the underlying footage/stills.