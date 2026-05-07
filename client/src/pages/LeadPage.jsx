import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BUDGET_OPTIONS, COUNTRY_CODES } from '../constants/budgets.js'
import { submitLead } from '../api/submitLead.js'

const initial = {
  name: '',
  countryCode: '+91',
  phone: '',
  budget: '',
  diamondPreference: 'none',
}

function LeadPage() {
  const [form, setForm] = useState(initial)
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const navigate = useNavigate()

  const errors = useMemo(() => {
    const e = {}
    if (!form.name.trim()) e.name = 'We need this to reply to you personally'
    const digits = (form.phone || '').replace(/\D/g, '')
    if (digits.length < 6) e.phone = 'A reachable number would help us answer'
    if (!form.budget) e.budget = 'Choose the range that feels closest'
    return e
  }, [form])

  const isValid = Object.keys(errors).length === 0

  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function onBlurField(field) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setTouched({ name: true, phone: true, budget: true })
    if (!isValid) return
    setFormError(null)
    setSubmitting(true)
    const lead = {
      name: form.name.trim(),
      countryCode: form.countryCode,
      phone: form.phone.replace(/\D/g, '') || form.phone.trim(),
      budget: form.budget,
      diamondPreference: form.diamondPreference,
    }
    try {
      await submitLead(lead)
      navigate('/thank-you', { state: { name: lead.name, lead } })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bb-page">
      <header className="bb-topbar" role="banner">
        <Link to="/" className="bb-logo">
          Bare <span>Brilliant</span>
        </Link>
        <span className="visually-hidden">Premium engagement rings</span>
      </header>

      <div className="bb-hero">
        <div className="bb-hero__copy">
          <h1>Understated brilliance</h1>
          <p>
            Designed with restraint. Made to be remembered. This is a gentle
            first step if you are ready—we respond in person, without pressure.
          </p>
          <div className="bb-hero__accent" aria-hidden />
        </div>

        <div>
          <form className="bb-form" onSubmit={onSubmit} noValidate>
            <h2>A word in private</h2>
            <p className="bb-form__lede">
              A name and a way to reach you help us answer thoughtfully. A sense
              of your range helps us prepare before we call or write—no lists, no
              pressure.
              <span className="required-mark" aria-hidden> *</span> indicates
              a few things we need to be able to reply.
            </p>

            {formError && (
              <p className="error-banner" role="alert">
                {formError}
              </p>
            )}

            <fieldset className="bb-field">
              <label className="bb-label" htmlFor="name">
                How we may address you{' '}
                <span className="required-mark" aria-label="required">*</span>
              </label>
              <input
                id="name"
                name="name"
                className={[
                  'bb-input',
                  touched.name && errors.name ? 'bb-input--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={form.name}
                onChange={onChange}
                onBlur={() => onBlurField('name')}
              />
              {touched.name && errors.name && (
                <p className="bb-err">{errors.name}</p>
              )}
            </fieldset>

            <fieldset className="bb-field">
              <span className="bb-label" id="phone-label">
                Where we can reach you{' '}
                <span className="required-mark" aria-label="required">*</span>
              </span>
              <div
                className={[
                  'bb-phone-row',
                  'bb-phone-row--grouped',
                  touched.phone && errors.phone ? 'bb-phone-row--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="group"
                aria-labelledby="phone-label"
              >
                <div className="bb-input-wrap bb-input-wrap--code">
                  <label htmlFor="countryCode" className="visually-hidden">
                    Country code
                  </label>
                  <select
                    id="countryCode"
                    name="countryCode"
                    value={form.countryCode}
                    onChange={onChange}
                    aria-label="Country code"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bb-input-wrap bb-input-wrap--num">
                  <label htmlFor="phone" className="visually-hidden">
                    Mobile number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="bb-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Number"
                    value={form.phone}
                    onChange={onChange}
                    onBlur={() => onBlurField('phone')}
                  />
                </div>
              </div>
              {touched.phone && errors.phone && (
                <p className="bb-err">{errors.phone}</p>
              )}
            </fieldset>

            <fieldset className="bb-field">
              <span className="visually-hidden" id="bud-label">
                Budget
              </span>
              <span className="budget-hint" id="budget-hint">
                The range that feels right for you
                <span className="required-mark" aria-label="required"> *</span>
              </span>
              <label className="visually-hidden" htmlFor="budget">
                Preferred budget (required)
              </label>
              <select
                id="budget"
                name="budget"
                className={[
                  'bb-select',
                  touched.budget && errors.budget ? 'bb-input--error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                value={form.budget}
                onChange={onChange}
                onBlur={() => onBlurField('budget')}
                aria-describedby="budget-hint"
              >
                {BUDGET_OPTIONS.map((b, i) => {
                  if (i === 0) {
                    return (
                      <option key={b.label} value={b.value} disabled>
                        {b.label}
                      </option>
                    )
                  }
                  return (
                    <option key={b.value} value={b.value}>
                      {b.value}
                    </option>
                  )
                })}
              </select>
              {touched.budget && errors.budget && (
                <p className="bb-err">{errors.budget}</p>
              )}
            </fieldset>

            <fieldset className="bb-field" aria-label="Optional diamond preference">
              <div className="bb-field-legend">If it matters to you (optional)</div>
              <p className="label-like">Earth-mined or lab-grown</p>
              <div className="bb-diamond-group" role="radiogroup" aria-label="Earth-mined or lab-grown">
                {[
                  { v: 'none', label: 'No preference' },
                  { v: 'natural', label: 'Natural' },
                  { v: 'lab', label: 'Lab-grown' },
                ].map((opt) => (
                  <label key={opt.v} className="bb-diamond-row">
                    <input
                      type="radio"
                      name="diamondPreference"
                      value={opt.v}
                      checked={form.diamondPreference === opt.v}
                      onChange={onChange}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? (
                <span>
                  Sending <span className="loading-dot" />
                </span>
              ) : (
                'Request a private reply'
              )}
            </button>
            <p className="bb-privacy">
              We use this only to get back to you, personally—never for
              reselling, never for bulk mail. You can ask us to remove your
              details at any time.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LeadPage
