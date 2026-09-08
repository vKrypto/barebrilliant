import { Link } from "react-router-dom";
import { useShortlist } from "../lib/shortlist.js";
import { mediaUrl, PLACEHOLDER_IMAGE } from "../lib/storage.js";
import { fromPrice } from "../lib/format.js";
import { trackShortlistRemoved } from "../events/index.js";
import "../bag.css";

// "Your Shortlist" (spec §Page 19). Saved designs only — no third-party contact
// details. Sharing uses the native Web Share API where available.
export default function ShortlistPage() {
  const shortlist = useShortlist();

  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: "Bare Brilliant — my shortlist", url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }

  if (shortlist.count === 0) {
    return (
      <section className="bb-section bb-container bb-bag bb-bag--empty">
        <h1 className="bb-h1">Things worth another look.</h1>
        <p className="bb-body-lg">
          Save designs with the heart on any ring. They stay here on this device —
          talk them through with us, or share a private link.
        </p>
        <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--primary">
          Explore engagement rings
        </Link>
      </section>
    );
  }

  const ids = shortlist.items.map((it) => it.id).join(",");

  return (
    <section className="bb-section bb-container bb-bag">
      <header className="bb-bag__head">
        <p className="bb-eyebrow">Your Shortlist</p>
        <h1 className="bb-h1">Things worth another look.</h1>
        <div className="bb-shortlist__actions">
          <Link to={`/chat?intent=shortlist&items=${ids}&source=shortlist`} className="bb-btn bb-btn--primary">
            Talk through my shortlist
          </Link>
          <button type="button" className="bb-btn bb-btn--secondary" onClick={share}>
            Share my shortlist
          </button>
        </div>
      </header>

      <div className="bb-shortlist__grid">
        {shortlist.items.map((it) => (
          <article key={it.id} className="bb-pcard">
            <Link to={`/the-proposal/engagement-rings/${it.slug}`} className="bb-pcard__media">
              <img
                src={it.thumb ? mediaUrl(it.thumb) : PLACEHOLDER_IMAGE}
                alt={it.name}
                width="1200"
                height="1500"
                loading="lazy"
                onError={(e) => {
                  if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />
            </Link>
            <div className="bb-pcard__body">
              <h2 className="bb-pcard__name">
                <Link to={`/the-proposal/engagement-rings/${it.slug}`}>{it.name}</Link>
              </h2>
              <p className="bb-pcard__price">{fromPrice(it.price_from)}</p>
              <div className="bb-shortlist__card-actions">
                <Link to={`/chat?intent=product-question&design=${it.slug}&source=shortlist`} className="bb-btn bb-btn--tertiary">
                  Ask about this design
                </Link>
                <button
                  type="button"
                  className="bb-btn bb-btn--tertiary"
                  onClick={() => {
                    trackShortlistRemoved({ product_id: it.id, source: "shortlist" });
                    shortlist.remove(it.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
