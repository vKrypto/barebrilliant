# Extractable Components

## Layout Components

## NavBar
- Source: `storefront/src/components/Header.jsx`
- Category: layout
- Description: Sticky header — "Bare Brilliant" wordmark, primary house nav, shortlist/bag icon buttons, "Start Your Ring" primary CTA, mobile burger drawer
- Extractable props: activeItem (string, default: ""), shortlistCount (number, default: 0), bagCount (number, default: 0)
- Hardcoded: wordmark, nav labels, icon SVGs, CTA label, all CSS

## Footer
- Source: `storefront/src/components/Footer.jsx`
- Category: layout
- Description: Brand blurb + secondary CTA, four link columns, base row with legal line and theme toggle
- Extractable props: none
- Hardcoded: column headings/links, copy, toggle

## Basic Components

## Button
- Source: `storefront/src/theme.css` (.bb-btn--primary / --secondary / --tertiary)
- Category: basic
- Description: Uppercase tracked button; filled, outline, or text-with-arrow
- Extractable props: variant (primary|secondary|tertiary), label

## Eyebrow
- Source: `storefront/src/theme.css` (.bb-eyebrow)
- Category: basic
- Description: Uppercase gold micro-label with rotated-diamond bullet
- Extractable props: label

## ProductCard
- Source: `storefront/src/components/ProductCard.jsx`
- Category: basic
- Description: Product tile with media, name, price, shortlist toggle
- Extractable props: isShortlisted (boolean, default: false)
