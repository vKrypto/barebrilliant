# Layouts

Layout wraps every route: skip link, sticky Header (brand wordmark, HOUSE_NAV, shortlist/bag icons, Start Your Ring CTA, mobile burger), main, Footer (brand blurb + 4 link columns + theme toggle).

### `storefront/src/components/Layout.jsx`

```jsx
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import "../layout.css";

// The theme (light/dark) is global: lib/theme.js sets it on <html data-bb-theme>.
export default function Layout({ children }) {
  return (
    <div className="bb-shell">
      <a href="#bb-main" className="bb-skip">
        Skip to content
      </a>
      <Header />
      <main id="bb-main" className="bb-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

### `storefront/src/components/Header.jsx`

```jsx
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { HOUSE_NAV, START_YOUR_RING } from "../content/nav.js";
import { useCart } from "../lib/cart.js";
import { useShortlist } from "../lib/shortlist.js";

function HeartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20Z" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const shortlist = useShortlist();
  const cart = useCart();

  // close the mobile drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="bb-header">
      <div className="bb-header__row">
        <Link to="/" className="bb-brand" aria-label="Bare Brilliant — home">
          Bare <span>Brilliant</span>
        </Link>

        <nav className="bb-nav" aria-label="Primary" data-open={open}>
          {HOUSE_NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="bb-header__actions">
          <Link to="/shortlist" className="bb-iconbtn" aria-label={`Your shortlist (${shortlist.count})`}>
            <HeartIcon />
            {shortlist.count > 0 && <span className="bb-iconbtn__count">{shortlist.count}</span>}
          </Link>
          <Link to="/cart" className="bb-iconbtn" aria-label={`Your bag (${cart.count})`}>
            <BagIcon />
            {cart.count > 0 && <span className="bb-iconbtn__count">{cart.count}</span>}
          </Link>
          <Link to={START_YOUR_RING} className="bb-btn bb-btn--primary bb-header__cta">
            Start Your Ring
          </Link>
          <button
            type="button"
            className="bb-iconbtn bb-burger"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
```

### `storefront/src/components/Footer.jsx`

```jsx
import { Link } from "react-router-dom";
import { FOOTER_COLUMNS, START_YOUR_RING } from "../content/nav.js";
import ThemeToggle from "./ThemeToggle.jsx";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bb-footer">
      <div className="bb-container bb-footer__top">
        <div className="bb-footer__brand">
          <h3>Bare Brilliant</h3>
          <p>Meant, Not Made.</p>
          <p className="bb-body">
            A modern Indian natural-diamond engagement-ring house. We start with
            the person and the design, then help you understand the diamond and
            the trade-offs — without pressure.
          </p>
          <Link to={START_YOUR_RING} className="bb-btn bb-btn--secondary">
            Start Your Ring
          </Link>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading} className="bb-footer__col">
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.to + l.label}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bb-container bb-footer__base">
        <span>&copy; {YEAR} Bare Brilliant. Natural diamonds only. Made to order. PAN India.</span>
        <span>We cannot manufacture the relationship. We never manufacture the sale.</span>
        <ThemeToggle />
      </div>
    </footer>
  );
}
```

### `storefront/src/content/nav.js`

```js
// Primary house navigation (spec §Site Architecture).
export const HOUSE_NAV = [
  { label: "The Proposal", to: "/the-proposal" },
  { label: "The Vow", to: "/the-vow" },
  { label: "The Chapters", to: "/the-chapters" },
  { label: "Private Commission", to: "/private-commission" },
  { label: "Why Natural", to: "/why-natural" },
  { label: "Our House", to: "/our-house" },
];

// The global-nav conversation gateway (no engineered Bare Brief in this build).
export const START_YOUR_RING = "/chat?intent=proposal&source=global-nav";

export const FOOTER_COLUMNS = [
  {
    heading: "The House",
    links: [
      { label: "The Proposal", to: "/the-proposal" },
      { label: "The Vow", to: "/the-vow" },
      { label: "The Chapters", to: "/the-chapters" },
      { label: "Private Commission", to: "/private-commission" },
      { label: "Engagement Rings", to: "/the-proposal/engagement-rings" },
    ],
  },
  {
    heading: "Guidance",
    links: [
      { label: "How It Works", to: "/how-it-works" },
      { label: "Craftsmanship", to: "/craftsmanship" },
      { label: "The Record", to: "/the-record" },
      { label: "Diamond Guide", to: "/diamond-guide" },
      { label: "Why Natural", to: "/why-natural" },
      { label: "FAQs", to: "/faqs" },
    ],
  },
  {
    heading: "Client Care",
    links: [
      { label: "Talk to Bare Brilliant", to: "/talk-to-us" },
      { label: "Book a Consultation", to: "/book-consultation" },
      { label: "Shipping & Delivery", to: "/shipping-delivery" },
      { label: "Aftercare", to: "/aftercare" },
      { label: "Buyback & Exchange", to: "/buyback-exchange" },
      { label: "Returns", to: "/returns" },
      { label: "Warranty & Resizing", to: "/warranty-resizing" },
    ],
  },
  {
    heading: "House",
    links: [
      { label: "Our House", to: "/our-house" },
      { label: "A Note From Harsh", to: "/founder-note" },
      { label: "Your Shortlist", to: "/shortlist" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  },
];
```

### `storefront/src/layout.css`

```css
/* App shell — header (logo left · house nav centre · shortlist + Start Your Ring
   right), routed page, footer. The theme (light/dark) is global — set on
   <html data-bb-theme> by lib/theme.js — so every token below adapts automatically. */

.bb-shell {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background: var(--bb-bg);
  color: var(--bb-text);
  overflow-x: hidden;
  position: relative;
  isolation: isolate;
}

/* Ambient ember glow — dark theme only. A quiet warm-gold wash behind every
   page (header down to footer), never a hard shape, so the product/content
   stays the brightest thing on screen. */
[data-bb-theme="dark"] .bb-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(640px 480px at 100% 0%, color-mix(in srgb, var(--bb-gold) 24%, transparent), transparent 70%),
    radial-gradient(680px 520px at 0% 100%, color-mix(in srgb, var(--bb-gold) 20%, transparent), transparent 70%);
}

.bb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* skip link */
.bb-skip {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(-120%);
  background: var(--bb-cta-bg);
  color: var(--bb-cta-fg);
  padding: 0.6rem 1rem;
  z-index: 100;
  border-radius: 0 0 var(--bb-radius) 0;
}
.bb-skip:focus {
  transform: none;
}

/* ---------------------------------------------------- header ---- */
.bb-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--bb-bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--bb-line);
}
.bb-header__row {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  min-height: 68px;
  padding: 0.75rem clamp(20px, 4vw, 48px);
}
.bb-brand {
  font: 500 1.05rem/1 var(--bb-serif);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bb-text);
  text-decoration: none;
  white-space: nowrap;
  flex: none;
}
.bb-brand span {
  color: var(--bb-accent);
}

.bb-nav {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 1.6vw, 1.5rem);
  margin-inline: auto;
}
.bb-nav a {
  font: 500 0.7rem/1 var(--bb-sans);
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--bb-text-muted);
  text-decoration: none;
  padding-block: 0.5rem;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.bb-nav a:hover,
.bb-nav a[aria-current="page"] {
  color: var(--bb-text);
}

.bb-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: none;
}
.bb-iconbtn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--bb-tap);
  height: var(--bb-tap);
  border: 1px solid transparent;
  border-radius: var(--bb-radius);
  background: none;
  color: var(--bb-text);
  text-decoration: none;
  cursor: pointer;
}
.bb-iconbtn:hover {
  border-color: var(--bb-line);
}
.bb-iconbtn__count {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  font: 600 10px/16px var(--bb-sans);
  text-align: center;
  color: var(--bb-cta-fg);
  background: var(--bb-accent);
  border-radius: 999px;
}
.bb-header__cta {
  display: inline-flex;
}
.bb-burger {
  display: none;
}

@media (max-width: 1200px) {
  .bb-nav {
    position: fixed;
    inset: 68px 0 auto 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    margin: 0;
    padding: 0.5rem var(--bb-gutter) 1.5rem;
    background: var(--bb-bg);
    border-bottom: 1px solid var(--bb-line);
    transform: translateY(-130%);
    transition: transform 0.25s ease;
    max-height: calc(100svh - 68px);
    overflow-y: auto;
  }
  .bb-nav[data-open="true"] {
    transform: none;
  }
  .bb-nav a {
    padding-block: 0.9rem;
    border-bottom: 1px solid var(--bb-line);
    font-size: 0.8rem;
  }
  .bb-header .bb-burger {
    display: inline-flex;
  }
  .bb-header .bb-header__cta {
    display: none;
  }
}
@media (max-width: 560px) {
  .bb-brand {
    font-size: 0.95rem;
    letter-spacing: 0.12em;
  }
}

/* ---------------------------------------------------- footer ---- */
.bb-footer {
  background: var(--bb-surface);
  color: var(--bb-text);
  border-top: 1px solid var(--bb-line);
}
.bb-footer a {
  color: var(--bb-text);
  text-decoration: none;
}
.bb-footer a:hover {
  color: var(--bb-accent);
}
.bb-footer__top {
  display: grid;
  gap: 2.5rem clamp(1.5rem, 4vw, 3.5rem);
  grid-template-columns: 1.6fr repeat(4, 1fr);
  padding-block: clamp(3rem, 6vw, 4.5rem) 2.5rem;
}
.bb-footer__brand h3 {
  color: var(--bb-text);
  font-size: 1.4rem;
  letter-spacing: 0.04em;
  margin-bottom: 0.75rem;
}
.bb-footer__brand p {
  font: italic 400 1.05rem/1.5 var(--bb-serif);
  color: var(--bb-accent);
  margin: 0 0 1.25rem;
}
.bb-footer__brand .bb-body {
  color: var(--bb-text-muted);
  font-size: 0.85rem;
}
.bb-footer__col h4 {
  font: 600 0.66rem/1 var(--bb-sans);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bb-text-muted);
  margin-bottom: 1rem;
}
.bb-footer__col ul {
  display: grid;
  gap: 0.6rem;
}
.bb-footer__col a {
  font-size: 0.85rem;
}
.bb-footer__base {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
  justify-content: space-between;
  padding-block: 1rem 1.5rem;
  border-top: 1px solid var(--bb-line);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--bb-text-muted);
}

/* light/dark switch (footer) — the button keeps a 44px tap target, the track is the visible part */
.bb-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--bb-tap);
  min-height: var(--bb-tap);
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
}
.bb-theme-toggle__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 52px;
  height: 28px;
  padding: 0 7px;
  border: 1px solid var(--bb-line);
  border-radius: 999px;
  background: var(--bb-raised);
  transition: border-color 0.15s ease;
}
.bb-theme-toggle:hover .bb-theme-toggle__track {
  border-color: var(--bb-text-muted);
}
.bb-theme-toggle:focus-visible {
  outline: none;
}
.bb-theme-toggle:focus-visible .bb-theme-toggle__track {
  outline: 2px solid var(--bb-accent);
  outline-offset: 2px;
}
.bb-theme-toggle svg {
  position: relative;
  z-index: 1;
  width: 14px;
  height: 14px;
  color: var(--bb-text-muted);
  transition: color 0.2s ease;
}
.bb-theme-toggle__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bb-text);
  transition: transform 0.2s ease;
}
.bb-theme-toggle[aria-checked="true"] .bb-theme-toggle__knob {
  transform: translateX(24px);
}
/* the icon under the knob takes the page colour so it stays legible */
.bb-theme-toggle[aria-checked="false"] .bb-theme-toggle__sun,
.bb-theme-toggle[aria-checked="true"] .bb-theme-toggle__moon {
  color: var(--bb-bg);
}
@media (max-width: 900px) {
  .bb-footer__top {
    grid-template-columns: 1fr 1fr;
  }
  .bb-footer__brand {
    grid-column: 1 / -1;
  }
}
@media (max-width: 520px) {
  .bb-footer__top {
    grid-template-columns: 1fr;
  }
}

/* house notice strip (spec §Campaigns — CMS slot, hidden when inactive) */
.bb-notice {
  background: var(--bb-raised);
  color: var(--bb-text);
  border-bottom: 1px solid var(--bb-line);
  font: 500 0.75rem/1.4 var(--bb-sans);
  letter-spacing: 0.06em;
  text-align: center;
  padding: 0.6rem 1rem;
}
.bb-notice a {
  color: var(--bb-accent);
}
```
