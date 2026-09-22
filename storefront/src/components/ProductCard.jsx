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
