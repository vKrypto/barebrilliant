import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BUDGET_OPTIONS, COUNTRY_CODES } from "../constants/budgets.js";
import { trackLeadGenerated, trackLeadSubmitted } from "../events/index.js";
import { sendEventNow } from "../events/sendEventNow.js";
import { EVENT_TYPES, EVENTS } from "../events/constants.js";
import "../chat.css";

const initial = {
  name: "",
  countryCode: "+91",
  phone: "",
  budget: "",
  diamondPreference: "none",
};

// The lightweight conversation gateway (spec: no engineered Bare Brief in this
// build). Form copied from the Bare Brilliant reference /chat; on submit the
// lead goes through the event pipeline and redirects to /thank-you. Context
// (intent, source, design) is read from the query string and passed along.
export default function ChatPage() {
  const [params] = useSearchParams();
  const context = {
    intent: params.get("intent") || "",
    source: params.get("source") || "chat",
    design: params.get("design") || "",
    items: params.get("items") || "",
    type: params.get("type") || "",
  };

  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const generatedRef = useRef(false);
  const navigate = useNavigate();

  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "We need this to reply to you personally";
    const digits = (form.phone || "").replace(/\D/g, "");
    if (digits.length < 6) e.phone = "A reachable number would help us answer";
    if (!form.budget) e.budget = "Choose the range that feels closest";
    return e;
  }, [form]);
  const isValid = Object.keys(errors).length === 0;

  function onChange(e) {
    const { name, value } = e.target;
    if (!generatedRef.current) {
      generatedRef.current = true;
      trackLeadGenerated({ ...context, path: "/chat" });
    }
    setForm((f) => ({ ...f, [name]: value }));
  }
  const onBlurField = (field) => setTouched((t) => ({ ...t, [field]: true }));

  async function onSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, phone: true, budget: true });
    if (!isValid) return;
    setFormError(null);
    setSubmitting(true);
    const lead = {
      name: form.name.trim(),
      countryCode: form.countryCode,
      phone: form.phone.replace(/\D/g, "") || form.phone.trim(),
      budget: form.budget,
      diamondPreference: form.diamondPreference,
      ...context,
    };
    try {
      await sendEventNow(EVENT_TYPES.LEAD, EVENTS.LEAD_SUBMITTED, 1, lead);
    } catch {
      trackLeadSubmitted(lead);
    } finally {
      setSubmitting(false);
    }
    navigate("/thank-you", { state: { name: lead.name, lead } });
  }

  return (
    <div className="bb-chat">
      <div className="bb-container bb-chat__grid">
        <div className="bb-chat__copy">
          <p className="bb-eyebrow">Talk to Bare Brilliant</p>
          <h1 className="bb-h1">Tell us what you're planning.</h1>
          <p className="bb-body-lg">
            No pressure. No obligation. Just a useful first conversation — a name
            and a way to reach you help us answer thoughtfully, and a sense of
            your range helps us prepare before we call or write.
          </p>
          <span className="bb-chat__rule" aria-hidden="true" />
          <p className="bb-chat__reach">
            Prefer email? <a href="mailto:care@barebrilliant.com">care@barebrilliant.com</a>
          </p>
        </div>

        <form className="bb-chat__form" onSubmit={onSubmit} noValidate>
          <h2 className="bb-h3">A word in private</h2>
          <p className="bb-chat__lede">
            <span aria-hidden="true">*</span> indicates a few things we need to be able to reply.
          </p>

          {formError && (
            <p className="bb-chat__banner" role="alert">{formError}</p>
          )}

          <div className="bb-field">
            <label htmlFor="name">
              <span>How we may address you *</span>
            </label>
            <input
              id="name"
              name="name"
              className="bb-input"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={form.name}
              onChange={onChange}
              onBlur={() => onBlurField("name")}
              aria-invalid={!!(touched.name && errors.name)}
            />
            {touched.name && errors.name && <em className="bb-field__err">{errors.name}</em>}
          </div>

          <div className="bb-field">
            <span id="phone-label"><span>Where we can reach you *</span></span>
            <div
              className="bb-chat__phone"
              data-error={!!(touched.phone && errors.phone)}
              role="group"
              aria-labelledby="phone-label"
            >
              <label htmlFor="countryCode" className="bb-visually-hidden">Country code</label>
              <select id="countryCode" name="countryCode" value={form.countryCode} onChange={onChange}>
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <label htmlFor="phone" className="bb-visually-hidden">Mobile number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Number"
                value={form.phone}
                onChange={onChange}
                onBlur={() => onBlurField("phone")}
              />
            </div>
            {touched.phone && errors.phone && <em className="bb-field__err">{errors.phone}</em>}
          </div>

          <div className="bb-field">
            <label htmlFor="budget"><span>The range that feels right for you *</span></label>
            <select
              id="budget"
              name="budget"
              className="bb-input"
              value={form.budget}
              onChange={onChange}
              onBlur={() => onBlurField("budget")}
              aria-invalid={!!(touched.budget && errors.budget)}
            >
              {BUDGET_OPTIONS.map((b, i) =>
                i === 0 ? (
                  <option key={b.label} value={b.value} disabled>{b.label}</option>
                ) : (
                  <option key={b.value} value={b.value}>{b.value}</option>
                )
              )}
            </select>
            {touched.budget && errors.budget && <em className="bb-field__err">{errors.budget}</em>}
          </div>

          <div className="bb-field">
            <span><span>Earth-mined or lab-grown (optional)</span></span>
            <div className="bb-chat__diamonds" role="radiogroup" aria-label="Diamond preference">
              {[
                { v: "none", label: "No preference" },
                { v: "natural", label: "Natural" },
                { v: "lab", label: "Lab-grown" },
              ].map((opt) => (
                <label key={opt.v} className="bb-chip" data-on={form.diamondPreference === opt.v}>
                  <input
                    type="radio"
                    name="diamondPreference"
                    value={opt.v}
                    checked={form.diamondPreference === opt.v}
                    onChange={onChange}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <button className="bb-btn bb-btn--primary bb-btn--block" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Request a private reply"}
          </button>
          <p className="bb-chat__privacy">
            We use this only to get back to you, personally — never for reselling,
            never for bulk mail. You can ask us to remove your details at any time.
          </p>
        </form>
      </div>
    </div>
  );
}
