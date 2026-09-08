import { Link } from "react-router-dom";
import { mediaUrl, PLACEHOLDER_IMAGE } from "../lib/storage.js";
import { fromPrice } from "../lib/format.js";
import { useShortlist } from "../lib/shortlist.js";
import { trackProductClick, trackShortlistSaved, trackShortlistRemoved } from "../events/index.js";

// Catalog card (spec §Product Card): design name · descriptor · Natural Diamond ·
// From ₹X · Shown with X ct centre · Shortlist heart · View Design.
export default function ProductCard({ product, source = "engagement-listing" }) {
  const shortlist = useShortlist();
  const to = `/the-proposal/engagement-rings/${product.slug}`;
  const saved = shortlist.has(product.id);
  const thumb = product.media?.thumb ? mediaUrl(product.media.thumb) : PLACEHOLDER_IMAGE;

  function onShortlist(e) {
    e.preventDefault();
    const nowSaved = shortlist.toggle({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price_from: product.price_from,
      thumb: product.media?.thumb || "",
    });
    (nowSaved ? trackShortlistSaved : trackShortlistRemoved)({
      product_id: product.id,
      source,
    });
  }

  return (
    <article className="bb-pcard">
      <Link
        to={to}
        className="bb-pcard__media"
        onClick={() => trackProductClick({ product_id: product.id, category: "engagement-rings", source })}
      >
        <img
          src={thumb}
          alt={product.media?.alt || `${product.name} — ${product.shape} natural diamond engagement ring`}
          loading="lazy"
          width="1200"
          height="1500"
          onError={(e) => {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
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
      </Link>

      <div className="bb-pcard__body">
        <h3 className="bb-pcard__name">
          <Link to={to}>{product.name}</Link>
        </h3>
        <p className="bb-pcard__descriptor">{product.descriptor}</p>
        <p className="bb-pcard__meta">
          <span>Natural Diamond</span>
          {product.centre_carat_shown ? <span>Shown with {product.centre_carat_shown} ct centre</span> : null}
        </p>
        <p className="bb-pcard__price">{fromPrice(product.price_from)}</p>
        <Link to={to} className="bb-btn bb-btn--tertiary">
          View Design
        </Link>
      </div>
    </article>
  );
}
