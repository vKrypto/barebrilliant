import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Accordion from "../components/Accordion.jsx";
import Media, { posterOrThumb } from "../components/Media.jsx";
import { fetchProduct } from "../lib/storage.js";
import { inr, fromPrice } from "../lib/format.js";
import { useCart } from "../lib/cart.js";
import { useShortlist } from "../lib/shortlist.js";
import {
  trackProductView,
  trackAddToCart,
  trackShortlistSaved,
  trackShortlistRemoved,
  trackEvent,
  EVENT_TYPES,
} from "../events/index.js";
import "../pdp.css";

const RING_SIZES = ["Not sure yet", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [imgIx, setImgIx] = useState(0);
  const [metal, setMetal] = useState("");
  const [size, setSize] = useState(RING_SIZES[0]);
  const [added, setAdded] = useState(false);

  const cart = useCart();
  const shortlist = useShortlist();

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchProduct(slug)
      .then((data) => {
        if (!alive) return;
        setProduct(data);
        setMetal(data.metal_default || data.metals?.[0] || "");
        setImgIx(0);
        setStatus("ready");
        trackProductView({ product_id: data.id, category: "engagement-rings", source: "product-detail" });
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [slug]);

  const gallery = useMemo(
    () =>
      product?.gallery?.length
        ? product.gallery
        : [{ type: "image", placeholder: true, alt: product?.name }],
    [product]
  );

  if (status === "loading") {
    return <section className="bb-section bb-container"><p className="bb-body">Loading…</p></section>;
  }
  if (status === "error" || !product) {
    return (
      <section className="bb-section bb-container bb-pdp__missing">
        <h1 className="bb-h2">We couldn't find that design.</h1>
        <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--primary">Back to engagement rings</Link>
      </section>
    );
  }

  const saved = shortlist.has(product.id);
  const thumb = gallery[0]?.src || gallery[0]?.poster || "";

  function addToBag() {
    cart.add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      metal,
      size,
      price_from: product.price_from,
      thumb,
    });
    trackAddToCart({ product_id: product.id, metal, size, qty: 1, price_from: product.price_from, source: "product-detail" });
    setAdded(true);
  }

  function toggleShortlist() {
    const nowSaved = shortlist.toggle({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price_from: product.price_from,
      thumb,
    });
    (nowSaved ? trackShortlistSaved : trackShortlistRemoved)({ product_id: product.id, source: "product-detail" });
  }

  const detailExpand = (name) => (open) =>
    open && trackEvent(EVENT_TYPES.SHOP, "detail_expand", 1, { product_id: product.id, section: name });

  return (
    <article className="bb-pdp">
      <div className="bb-container bb-pdp__top">
        {/* ---------------- gallery ---------------- */}
        <div className="bb-pdp__gallery">
          <div className="bb-pdp__stage">
            <Media
              key={imgIx}
              media={gallery[imgIx]}
              sizes={gallery[imgIx]?.sizes || "(max-width:900px) 100vw, 560px"}
              eager
              autoPlay={gallery[imgIx]?.type === "video"}
              onClick={
                gallery[imgIx]?.type === "video"
                  ? (e) => {
                      const v = e.currentTarget;
                      if (v.paused) v.play().catch(() => {});
                      else v.pause();
                    }
                  : undefined
              }
            />
          </div>
          {gallery.length > 1 && (
            <div className="bb-pdp__thumbs">
              {gallery.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  className="bb-pdp__thumb"
                  data-on={i === imgIx}
                  aria-label={`View ${m.type === "video" ? "video" : "image"} ${i + 1}`}
                  onClick={() => setImgIx(i)}
                >
                  <img src={posterOrThumb(m)} alt="" width="160" height="160" loading="lazy" />
                  {m.type === "video" && (
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>▶</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- buy column ---------------- */}
        <div className="bb-pdp__buy">
          <p className="bb-eyebrow">The {product.name.replace(/^The\s+/i, "")}</p>
          <h1 className="bb-h1 bb-pdp__title">{product.name}</h1>
          <p className="bb-pdp__subtitle">{product.subtitle}</p>
          <p className="bb-pdp__price">{fromPrice(product.price_from)}</p>
          <p className="bb-pdp__mto">{product.made_to_order_note}</p>

          {product.trust_line?.length ? (
            <ul className="bb-pdp__trust">
              {product.trust_line.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}

          {product.metals?.length ? (
            <label className="bb-pdp__field">
              <span>Metal</span>
              <select value={metal} onChange={(e) => setMetal(e.target.value)}>
                {product.metals.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="bb-pdp__field">
            <span>Ring size</span>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {RING_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="bb-pdp__actions">
            <button type="button" className="bb-btn bb-btn--primary bb-btn--block" onClick={addToBag}>
              {added ? "Added to bag ✓" : "Add to bag"}
            </button>
            <Link
              to={`/chat?intent=proposal&design=${product.slug}&source=product-detail`}
              className="bb-btn bb-btn--secondary bb-btn--block"
            >
              Start With This Design
            </Link>
          </div>
          {added && (
            <p className="bb-pdp__added">
              <Link to="/cart" className="bb-btn bb-btn--tertiary">View bag</Link>
            </p>
          )}

          <div className="bb-pdp__minor">
            <button type="button" className="bb-pdp__save" data-saved={saved} onClick={toggleShortlist}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20Z" />
              </svg>
              {saved ? "Saved to shortlist" : "Add to shortlist"}
            </button>
            <Link
              to={`/chat?intent=diamond-guidance&design=${product.slug}&source=product-detail`}
              className="bb-btn bb-btn--tertiary"
            >
              Help me choose the diamond
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------- design expertise ---------------- */}
      <div className="bb-container bb-pdp__detail">
        <section className="bb-pdp__prose">
          <h2 className="bb-h3">About the ring</h2>
          <p>{product.about}</p>
        </section>
        <section className="bb-pdp__prose">
          <h2 className="bb-h3">Why this design works</h2>
          <p>{product.why_this_works}</p>
        </section>
        {product.wedding_band_fit && (
          <section className="bb-pdp__prose">
            <h2 className="bb-h3">Wedding band compatibility</h2>
            <p>{product.wedding_band_fit}</p>
          </section>
        )}

        <div className="bb-pdp__accordions">
          {product.price_breakup?.length ? (
            <Accordion title="Price breakup" onToggle={detailExpand("price_breakup")}>
              <table className="bb-pdp__table">
                <tbody>
                  {product.price_breakup.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{inr(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bb-pdp__table-total">
                    <td>Total</td>
                    <td>{inr(product.total ?? product.price_from)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="bb-pdp__fineprint">
                Made to order. Final value depends on the natural diamond and specifications you choose.
              </p>
            </Accordion>
          ) : null}

          {product.specifications ? (
            <Accordion title="Design specifications" onToggle={detailExpand("specifications")}>
              <table className="bb-pdp__table">
                <tbody>
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                      <td>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {product.variation_note && <p className="bb-pdp__fineprint">{product.variation_note}</p>}
            </Accordion>
          ) : null}

          {product.what_can_change?.length ? (
            <Accordion title="What can change" onToggle={detailExpand("what_can_change")}>
              <ul className="bb-pdp__taglist">
                {product.what_can_change.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Accordion>
          ) : null}

          {product.what_comes_with?.length ? (
            <Accordion title="What comes with it" onToggle={detailExpand("what_comes_with")}>
              <ul className="bb-pdp__checklist">
                {product.what_comes_with.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Accordion>
          ) : null}
        </div>

        <section className="bb-pdp__diamond bb-card">
          <h2 className="bb-h3">The natural diamond</h2>
          <p>
            The design is only half the decision. Once you know the ring, we can
            help choose the centre diamond around its proportions, your priorities
            and total budget.
          </p>
          <Link
            to={`/chat?intent=diamond-guidance&design=${product.slug}&source=product-detail`}
            className="bb-btn bb-btn--secondary"
          >
            Help me choose the diamond
          </Link>
        </section>
      </div>
    </article>
  );
}
