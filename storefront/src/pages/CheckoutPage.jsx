import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../lib/cart.js";
import { mediaUrl, PLACEHOLDER_IMAGE } from "../lib/storage.js";
import { inr } from "../lib/format.js";
import { sendEventNow } from "../events/sendEventNow.js";
import { trackCheckoutStarted, trackOrderPlaced, EVENT_TYPES, EVENTS } from "../events/index.js";
import "../bag.css";

// No login, no payment page (keeps hosting cost at zero, per the brief). We ask
// for phone + email only, record an order_placed event, and confirm.
export default function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cart.items.length) trackCheckoutStarted({ items: cart.items.length, subtotal: cart.subtotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = useMemo(() => {
    const e = {};
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8) e.phone = "A reachable number so we can get back to you";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "An email we can reach you at";
    return e;
  }, [form]);
  const valid = Object.keys(errors).length === 0;

  if (cart.items.length === 0 && !submitting) {
    return (
      <section className="bb-section bb-container bb-bag bb-bag--empty">
        <h1 className="bb-h1">Nothing to confirm yet.</h1>
        <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--primary">Explore engagement rings</Link>
      </section>
    );
  }

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setTouched({ phone: true, email: true });
    if (!valid || submitting) return;
    setSubmitting(true);

    const reference = `BB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const payload = {
      reference,
      currency: "INR",
      estimated_total: cart.subtotal,
      contact: {
        name: form.name.trim(),
        phone: form.phone.replace(/\s+/g, ""),
        email: form.email.trim(),
      },
      items: cart.items.map((it) => ({
        id: it.id,
        slug: it.slug,
        name: it.name,
        metal: it.metal,
        size: it.size,
        qty: it.qty || 1,
        price_from: it.price_from,
      })),
      source: "checkout",
    };

    // order_placed matters — send it immediately so we can act on the response;
    // fall back to the durable queue if there's no Lambda yet.
    try {
      await sendEventNow(EVENT_TYPES.ORDER, EVENTS.ORDER_PLACED, cart.subtotal, payload);
    } catch {
      trackOrderPlaced(payload);
    }

    cart.clear();
    navigate("/order-confirmed", { state: { reference, name: payload.contact.name } });
  }

  return (
    <section className="bb-section bb-container bb-checkout">
      <header className="bb-bag__head">
        <p className="bb-eyebrow">Confirm Your Selection</p>
        <h1 className="bb-h1">A made-to-order house. No payment today.</h1>
        <p className="bb-body-lg">
          Leave a phone number and email. We'll confirm the design, the natural
          diamond and the final specification with you — then the 50% to begin.
        </p>
      </header>

      <div className="bb-checkout__layout">
        <form className="bb-checkout__form" onSubmit={submit} noValidate>
          <label className="bb-field">
            <span>Name <i>(optional)</i></span>
            <input className="bb-input" name="name" autoComplete="name" value={form.name} onChange={change} />
          </label>
          <label className="bb-field">
            <span>Phone / WhatsApp</span>
            <input
              className="bb-input"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={change}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              aria-invalid={!!(touched.phone && errors.phone)}
            />
            {touched.phone && errors.phone && <em className="bb-field__err">{errors.phone}</em>}
          </label>
          <label className="bb-field">
            <span>Email</span>
            <input
              className="bb-input"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={change}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={!!(touched.email && errors.email)}
            />
            {touched.email && errors.email && <em className="bb-field__err">{errors.email}</em>}
          </label>

          <button type="submit" className="bb-btn bb-btn--primary bb-btn--block" disabled={submitting}>
            {submitting ? "Placing your request…" : "Place the order request"}
          </button>
          <p className="bb-checkout__fine">
            No card details are taken here. We use your contact only to get back to
            you about this order.
          </p>
        </form>

        <aside className="bb-checkout__summary bb-card">
          <h2 className="bb-h3">Your selection</h2>
          <ul className="bb-checkout__items">
            {cart.items.map((it) => (
              <li key={it.key}>
                <img
                  src={it.thumb ? mediaUrl(it.thumb) : PLACEHOLDER_IMAGE}
                  alt=""
                  width="52"
                  height="65"
                  onError={(e) => {
                    if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
                <div>
                  <p className="bb-checkout__iname">{it.name}{(it.qty || 1) > 1 ? ` ×${it.qty}` : ""}</p>
                  <p className="bb-checkout__ispec">
                    {[it.metal, it.size && it.size !== "Not sure yet" ? `Size ${it.size}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span>{inr(it.price_from * (it.qty || 1))}</span>
              </li>
            ))}
          </ul>
          <div className="bb-checkout__total">
            <span>Estimated from</span>
            <span>{inr(cart.subtotal)}</span>
          </div>
          <p className="bb-bag__note">
            Final value confirmed with you. 50% to begin, 50% before insured dispatch.
          </p>
        </aside>
      </div>
    </section>
  );
}
