# Components

Framework: React 18 + Vite 5, react-router-dom 6. No component library; vanilla CSS with `bb-` BEM-ish classes and CSS custom properties (theme.css). Shared primitives are CSS classes (.bb-btn primary/secondary/tertiary, .bb-card, .bb-input, .bb-chip, .bb-eyebrow, .bb-diamond) plus these React components.

### `storefront/src/components/Media.jsx`

```jsx
import { mediaUrl, PLACEHOLDER_IMAGE } from "../lib/storage.js";

// The dashboard publisher emits a media OBJECT per image / video:
//   image: { type:"image", src, srcset:"path 320w, …", sizes, width, height, alt }
//   video: { type:"video", poster, sources:[{src,type,media?}], width, height, alt }
//   none : { type:"image", placeholder:true, src:"product_placeholder.webp" }
// `src`/`srcset`/`poster`/`sources[].src` are storage-relative; resolve through
// MEDIA_BASE here so JSON and media can live on different hosts / a CDN.

export function resolveSrcset(srcset) {
  if (!srcset) return undefined;
  return srcset
    .split(",")
    .map((part) => {
      const [path, descriptor] = part.trim().split(/\s+/);
      return `${mediaUrl(path)} ${descriptor || ""}`.trim();
    })
    .join(", ");
}

// Small still for a gallery thumbnail strip: a video's poster, else the
// narrowest image rung, else the object's own src.
export function posterOrThumb(media) {
  if (!media) return PLACEHOLDER_IMAGE;
  if (media.type === "video") return media.poster ? mediaUrl(media.poster) : PLACEHOLDER_IMAGE;
  const firstRung = media.srcset ? media.srcset.split(",")[0].trim().split(/\s+/)[0] : null;
  return mediaUrl(firstRung || media.src || "");
}

export default function Media({ media, sizes, className, preview = false, autoPlay = false, eager = false, ...rest }) {
  if (!media) {
    return (
      <img className={className} src={PLACEHOLDER_IMAGE} alt="" width="1080" height="1080"
           loading={eager ? "eager" : "lazy"} {...rest} />
    );
  }

  if (media.type === "video" && Array.isArray(media.sources) && media.sources.length) {
    return (
      <video
        className={className}
        poster={media.poster ? mediaUrl(media.poster) : undefined}
        width={media.width}
        height={media.height}
        muted
        playsInline
        loop
        autoPlay={autoPlay || undefined}
        controls={!preview && !autoPlay}
        preload={autoPlay ? "auto" : preview ? "none" : "metadata"}
        {...rest}
      >
        {media.sources.map((s, i) => (
          <source key={i} src={mediaUrl(s.src)} type={s.type} media={s.media || undefined} />
        ))}
      </video>
    );
  }

  const isPlaceholder = media.placeholder || !media.src;
  const src = isPlaceholder ? PLACEHOLDER_IMAGE : mediaUrl(media.src);
  return (
    <img
      className={className}
      src={src}
      srcSet={isPlaceholder ? undefined : resolveSrcset(media.srcset)}
      sizes={isPlaceholder ? undefined : sizes || media.sizes || undefined}
      alt={media.alt || ""}
      width={media.width || 1080}
      height={media.height || 1080}
      loading={eager ? "eager" : "lazy"}
      onError={(e) => {
        if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
          e.currentTarget.srcset = "";
          e.currentTarget.src = PLACEHOLDER_IMAGE;
        }
      }}
      {...rest}
    />
  );
}
```

### `storefront/src/components/ThemeToggle.jsx`

```jsx
import { useTheme } from "../lib/theme.js";

// One small switch for the whole site (footer). Sun/moon icons sit under a sliding knob.
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="bb-theme-toggle"
      onClick={toggle}
    >
      <span className="bb-theme-toggle__track" aria-hidden="true">
        <svg className="bb-theme-toggle__sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="8" cy="8" r="2.8" />
          <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
        </svg>
        <svg className="bb-theme-toggle__moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z" />
        </svg>
        <span className="bb-theme-toggle__knob" />
      </span>
    </button>
  );
}
```

### `storefront/src/components/Accordion.jsx`

```jsx
import { useId, useState } from "react";

// Inline expand/collapse used for PDP price breakup, specifications, FAQ, etc.
// Fires onToggle(open) so the page can emit detail_expand / faq_expand.
export default function Accordion({ title, children, defaultOpen = false, onToggle }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  function toggle() {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }

  return (
    <div className="bb-accordion" data-open={open}>
      <button
        type="button"
        className="bb-accordion__head"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <span>{title}</span>
        <span className="bb-accordion__sign" aria-hidden="true">
          {open ? "–" : "+"}
        </span>
      </button>
      <div id={id} className="bb-accordion__body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
```

### `storefront/src/components/ProductCard.jsx`

```jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import Media from "./Media.jsx";
import { fromPrice } from "../lib/format.js";
import { useShortlist } from "../lib/shortlist.js";
import { trackProductClick, trackShortlistSaved, trackShortlistRemoved } from "../events/index.js";

// Catalog card (spec §Product Card): design name · descriptor · Natural Diamond ·
// From ₹X · Shown with X ct centre · Shortlist heart. No separate "View Design"
// control — the card itself is the affordance; the whole thing opens the PDP,
// with a price-row arrow that reveals on hover/focus as the only extra hint.
export default function ProductCard({ product, source = "engagement-listing" }) {
  const shortlist = useShortlist();
  const [hovered, setHovered] = useState(false);
  const to = `/the-proposal/engagement-rings/${product.slug}`;
  const saved = shortlist.has(product.id);

  const primary = product.media?.primary || null;
  const secondary = product.media?.secondary || null;
  const secondaryIsVideo = secondary?.type === "video";

  function onShortlist(e) {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = shortlist.toggle({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price_from: product.price_from,
      thumb: primary?.src || "",
    });
    (nowSaved ? trackShortlistSaved : trackShortlistRemoved)({
      product_id: product.id,
      source,
    });
  }

  return (
    <article
      className="bb-pcard"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={to}
        className="bb-pcard__link"
        onClick={() => trackProductClick({ product_id: product.id, category: "engagement-rings", source })}
      >
        <div className="bb-pcard__media">
          <Media media={primary} preview />
          {hovered && secondary && (
            // second slot prefers a video (publisher: video[0] || image[1]); on
            // hover it mounts and — if a video — muted-autoplays over the primary.
            <Media
              media={secondary}
              className="bb-pcard__hover"
              preview={!secondaryIsVideo}
              autoPlay={secondaryIsVideo}
            />
          )}
        </div>

        <div className="bb-pcard__body">
          <h3 className="bb-pcard__name">{product.name}</h3>
          <p className="bb-pcard__descriptor">{product.descriptor}</p>
          <p className="bb-pcard__price">
            {fromPrice(product.price_from)}
            <span className="bb-pcard__arrow" aria-hidden="true">→</span>
          </p>
          <p className="bb-pcard__meta">
            <span>Natural Diamond</span>
            {product.centre_carat_shown ? <span>Shown with {product.centre_carat_shown} ct centre</span> : null}
          </p>
        </div>
      </Link>

      <button
        type="button"
        className="bb-pcard__heart"
        data-saved={saved}
        aria-pressed={saved}
        aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
        onClick={onShortlist}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20Z" />
        </svg>
      </button>
    </article>
  );
}
```
