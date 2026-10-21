# Pages

## / (Home Page)
Entry: storefront/src/pages/HomePage.jsx
Dependencies:
- storefront/src/home.css
- storefront/src/events/index.js (trackBannerClick)
- storefront/src/components/Layout.jsx
  - storefront/src/components/Header.jsx
    - storefront/src/content/nav.js
    - storefront/src/lib/cart.js
    - storefront/src/lib/shortlist.js
  - storefront/src/components/Footer.jsx
    - storefront/src/components/ThemeToggle.jsx
      - storefront/src/lib/theme.js
  - storefront/src/layout.css
- storefront/src/theme.css, storefront/src/index.css

## /the-proposal etc. (House Page)
Entry: storefront/src/pages/HousePage.jsx
Dependencies:
- storefront/src/content/house.js
- storefront/src/house.css
- storefront/src/components/Media.jsx
  - storefront/src/lib/storage.js

## /the-proposal/engagement-rings (Catalog)
Entry: storefront/src/pages/CatalogPage.jsx
Dependencies:
- storefront/src/components/ProductCard.jsx
  - storefront/src/components/Media.jsx
  - storefront/src/lib/shortlist.js
- storefront/src/catalog.css

## /the-proposal/engagement-rings/:slug (Product)
Entry: storefront/src/pages/ProductPage.jsx
Dependencies:
- storefront/src/components/Media.jsx
- storefront/src/components/Accordion.jsx
- storefront/src/lib/cart.js, storefront/src/lib/shortlist.js, storefront/src/lib/format.js
- storefront/src/pdp.css

### `storefront/src/pages/HomePage.jsx`

```jsx
import { Link } from "react-router-dom";
import { trackBannerClick } from "../events/index.js";
import "../home.css";

const HOUSE = [
  { key: "the-proposal", name: "The Proposal", line: "For the moment you ask. And the reason you ask it.", to: "/the-proposal" },
  { key: "the-vow", name: "The Vow", line: "The yes becomes every day.", to: "/the-vow" },
  { key: "the-chapters", name: "The Chapters", line: "The story continues after yes.", to: "/the-chapters" },
  { key: "private-commission", name: "Private Commission", line: "When the piece does not belong in a category.", to: "/private-commission" },
];

const HOW_WE_WORK = [
  ["The Brief", "Who is it for? What does she wear? What should the ring never feel like? What matters most? What are you comfortable spending?"],
  ["The Design", "We turn those clues into a direction: shape, proportion, setting, profile and the details that make the ring feel specific."],
  ["The Natural Diamond", "Once the design tells us what the centre stone needs to do, we source natural diamonds that make sense for its proportions and your budget."],
  ["The Reason", "We tell you what we would choose, what you are paying more for and which differences you are unlikely to see."],
  ["The Creation", "Only after design and diamond approval does making begin."],
  ["The Record", "Final specifications, independent certification, HUID, invoice and service information stay together."],
];

export default function HomePage() {
  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="bb-home-hero">
        <div className="bb-container bb-home-hero__inner">
          <p className="bb-eyebrow">Natural Diamond Engagement Rings</p>
          <h1 className="bb-hero-type">Meant, Not Made.</h1>
          <p className="bb-body-lg">
            Natural diamond engagement rings, made around the person you're choosing.
          </p>
          <div className="bb-home-hero__cta">
            <Link to="/chat?intent=proposal&source=home-hero" className="bb-btn bb-btn--primary">
              Start Your Ring
            </Link>
            <Link to="/the-proposal" className="bb-btn bb-btn--secondary">
              Explore The Proposal
            </Link>
          </div>
          <p className="bb-home-hero__trust">
            Natural Diamonds <i>·</i> GIA Solitaires <i>·</i> Made to Order <i>·</i> PAN India
          </p>
        </div>
      </section>

      {/* ---------- the house ---------- */}
      <section className="bb-section bb-house">
        <div className="bb-container">
          <div className="bb-house__head">
            <span className="bb-house__diamond" aria-hidden="true" />
            <p className="bb-eyebrow bb-eyebrow--plain">The House</p>
            <h2 className="bb-h2">Four product worlds. One relationship journey.</h2>
          </div>
          <div className="bb-house__grid">
            {HOUSE.map((h) => (
              <Link
                key={h.key}
                to={h.to}
                className="bb-house__card"
                onClick={() => trackBannerClick({ banner_id: `house-${h.key}`, source: "home" })}
              >
                <h3 className="bb-h3">{h.name}</h3>
                <p>{h.line}</p>
                <span className="bb-btn bb-btn--tertiary" aria-hidden="true">
                  Explore
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- belief ---------- */}
      <section className="bb-section bb-belief">
        <div className="bb-container bb-belief__inner">
          <p className="bb-eyebrow">The Belief</p>
          <h2 className="bb-h2">Some Things Can't Be Made.</h2>
          <p className="bb-body-lg">
            We can design the ring. We can refine every proportion. We can source
            a remarkable natural diamond. What we can't manufacture is the reason
            you're buying it — chemistry, timing, the moment one person became
            different from everyone else. Bare Brilliant exists to make the ring
            around that.
          </p>
          <Link to="/our-house" className="bb-btn bb-btn--secondary">
            Why Bare Brilliant
          </Link>
        </div>
      </section>

      {/* ---------- how we work ---------- */}
      <section className="bb-section bb-how">
        <div className="bb-container">
          <p className="bb-eyebrow">How We Work</p>
          <h2 className="bb-h2">Start with the person. The stone comes second.</h2>
          <ol className="bb-how__grid">
            {HOW_WE_WORK.map(([h, p], i) => (
              <li key={h} className="bb-card bb-how__step">
                <span className="bb-how__num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="bb-h3">{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
          <div className="bb-how__cta">
            <Link to="/how-it-works" className="bb-btn bb-btn--secondary">
              See how it works
            </Link>
            <Link to="/chat?source=home-how-we-work" className="bb-btn bb-btn--tertiary">
              Talk to Bare Brilliant
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- forever ---------- */}
      <section className="bb-section bb-forever">
        <div className="bb-container bb-forever__inner">
          <p className="bb-eyebrow">Forever Is A Verb</p>
          <p className="bb-lede">
            A proposal happens once. A relationship happens every day after it.
            Showing up. Listening. Changing. Repairing. Laughing. Choosing. Again
            and again.
          </p>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="bb-section bb-finalcta">
        <div className="bb-container bb-finalcta__inner">
          <h2 className="bb-h2">You've found the person. Let's get the ring right.</h2>
          <p className="bb-body-lg">Tell us what you know. We'll help with what you don't.</p>
          <div className="bb-finalcta__row">
            <Link to="/chat?intent=proposal&source=home-final" className="bb-btn bb-btn--primary">
              Start a conversation
            </Link>
            <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--secondary">
              Explore engagement rings
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

### `storefront/src/home.css`

```css
/* Homepage — dark. "One idea per screen", large negative space (spec §Apple-
   Inspired Design Language). The helix is represented as a static rotating
   diamond motif; no WebGL. */

.bb-home-hero {
  padding-block: clamp(3.5rem, 11vh, 6rem);
  border-bottom: 1px solid var(--bb-line);
  position: relative;
  overflow: hidden;
}
.bb-home-hero::after {
  content: "";
  position: absolute;
  width: min(46vw, 460px);
  aspect-ratio: 1;
  right: -8%;
  top: 12%;
  border: 1px solid color-mix(in srgb, var(--bb-accent) 26%, transparent);
  transform: rotate(45deg);
  pointer-events: none;
}
.bb-home-hero__inner {
  position: relative;
  z-index: 1;
  max-width: 52rem;
}
.bb-home-hero .bb-eyebrow {
  margin-bottom: 1.5rem;
}
.bb-home-hero .bb-body-lg {
  margin-top: 1.5rem;
}
.bb-home-hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2.25rem;
}
.bb-home-hero__trust {
  margin-top: 2.5rem;
  font: 500 0.72rem/1.6 var(--bb-sans);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bb-text-muted);
}
.bb-home-hero__trust i {
  color: var(--bb-accent);
  font-style: normal;
  margin-inline: 0.5rem;
}

/* ---- the house ---- */
.bb-house__head {
  text-align: center;
  max-width: 40rem;
  margin: 0 auto clamp(2.5rem, 6vw, 4rem);
}
.bb-house__head .bb-eyebrow {
  margin: 1.25rem 0 0.75rem;
}
.bb-house__diamond {
  width: 40px;
  height: 40px;
  border: 1px solid var(--bb-accent);
  transform: rotate(45deg);
  margin: 0 auto;
  display: block;
  animation: bb-spin 26s linear infinite;
}
@keyframes bb-spin {
  to {
    transform: rotate(405deg);
  }
}
.bb-house__grid {
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(2, 1fr);
  background: var(--bb-line);
  border: 1px solid var(--bb-line);
  border-radius: var(--bb-radius);
  overflow: hidden;
}
.bb-house__card {
  background: var(--bb-bg);
  padding: clamp(1.75rem, 4vw, 3rem);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: background 0.2s ease;
}
.bb-house__card:hover {
  background: var(--bb-surface);
}
.bb-house__card p {
  font: 400 0.95rem/1.6 var(--bb-sans);
  color: var(--bb-text-muted);
  flex: 1;
}
@media (max-width: 720px) {
  .bb-house__grid {
    grid-template-columns: 1fr;
  }
}

/* ---- belief / forever / final ---- */
.bb-belief__inner,
.bb-forever__inner,
.bb-finalcta__inner {
  max-width: 44rem;
}
.bb-belief .bb-eyebrow,
.bb-how .bb-eyebrow,
.bb-forever .bb-eyebrow {
  margin-bottom: 1rem;
}
.bb-belief .bb-h2 {
  margin-bottom: 1.5rem;
}
.bb-belief .bb-btn--secondary {
  margin-top: 2rem;
}
.bb-forever {
  border-block: 1px solid var(--bb-line);
}

/* ---- how we work ---- */
.bb-how .bb-h2 {
  margin: 1rem 0 2.5rem;
  max-width: 34rem;
}
.bb-how__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, 1fr);
}
.bb-how__step {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.bb-how__num {
  font: 600 0.75rem/1 var(--bb-sans);
  letter-spacing: 0.12em;
  color: var(--bb-accent);
}
.bb-how__step p {
  font: 400 0.9rem/1.6 var(--bb-sans);
  color: var(--bb-text-muted);
}
.bb-how__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}
@media (max-width: 900px) {
  .bb-how__grid {
    grid-template-columns: 1fr;
  }
}

.bb-finalcta__inner {
  text-align: center;
  margin-inline: auto;
}
.bb-finalcta__inner .bb-body-lg {
  margin: 1rem auto 2rem;
}
.bb-finalcta__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}
```
