import { Link } from "react-router-dom";
import { useCart } from "../lib/cart.js";
import { mediaUrl, PLACEHOLDER_IMAGE } from "../lib/storage.js";
import { inr } from "../lib/format.js";
import { trackRemoveFromCart } from "../events/index.js";
import "../bag.css";

export default function CartPage() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <section className="bb-section bb-container bb-bag bb-bag--empty">
        <h1 className="bb-h1">Your bag is empty.</h1>
        <p className="bb-body-lg">Every design can move from where it starts — begin with one that feels close.</p>
        <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--primary">
          Explore engagement rings
        </Link>
      </section>
    );
  }

  return (
    <section className="bb-section bb-container bb-bag">
      <header className="bb-bag__head">
        <p className="bb-eyebrow">Your Bag</p>
        <h1 className="bb-h1">Ready when you are.</h1>
      </header>

      <div className="bb-bag__layout">
        <ul className="bb-bag__lines">
          {cart.items.map((it) => (
            <li key={it.key} className="bb-bag__line">
              <Link to={`/the-proposal/engagement-rings/${it.slug}`} className="bb-bag__thumb">
                <img
                  src={it.thumb ? mediaUrl(it.thumb) : PLACEHOLDER_IMAGE}
                  alt={it.name}
                  width="120"
                  height="150"
                  onError={(e) => {
                    if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
              </Link>
              <div className="bb-bag__info">
                <h2 className="bb-h3">
                  <Link to={`/the-proposal/engagement-rings/${it.slug}`}>{it.name}</Link>
                </h2>
                <p className="bb-bag__spec">
                  {[it.metal, it.size && it.size !== "Not sure yet" ? `Size ${it.size}` : null]
                    .filter(Boolean)
                    .join(" · ") || "Specifications confirmed with you"}
                </p>
                <p className="bb-bag__from">{inr(it.price_from)} <span>from</span></p>
                <div className="bb-bag__lineactions">
                  <div className="bb-qty">
                    <button type="button" aria-label="Decrease quantity" onClick={() => cart.setQty(it.key, (it.qty || 1) - 1)}>–</button>
                    <span>{it.qty || 1}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => cart.setQty(it.key, (it.qty || 1) + 1)}>+</button>
                  </div>
                  <button
                    type="button"
                    className="bb-btn bb-btn--tertiary"
                    onClick={() => {
                      trackRemoveFromCart({ product_id: it.id, source: "cart" });
                      cart.remove(it.key);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="bb-bag__summary bb-card">
          <h2 className="bb-h3">Summary</h2>
          <dl className="bb-bag__totals">
            <div>
              <dt>Estimated from</dt>
              <dd>{inr(cart.subtotal)}</dd>
            </div>
          </dl>
          <p className="bb-bag__note">
            Made to order. The final value is confirmed with you once the design,
            natural diamond and specifications are settled — 50% to begin, 50%
            before insured dispatch.
          </p>
          <Link to="/checkout" className="bb-btn bb-btn--primary bb-btn--block">
            Continue to checkout
          </Link>
          <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--tertiary">
            Keep exploring
          </Link>
        </aside>
      </div>
    </section>
  );
}
