const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export async function submitLead(payload) {
  const res = await fetch(`${apiBase}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err.message || 'We could not send that. Please try again in a moment.',
    )
  }
  return res.json()
}

/** Optional: thank-you page only, for guests who want to start in writing. */
export function buildWhatsAppUrl(lead) {
  const { name, countryCode, phone, budget, diamondPreference } = lead
  const lines = [
    "Hello — I left my details on your site and would like to follow up when it suits you.",
    `Name: ${name}`,
    `Reach me: ${countryCode} ${phone}`,
    `Rough range in mind: ${budget}`,
  ]
  if (diamondPreference && diamondPreference !== 'none') {
    const copy =
      diamondPreference === 'natural'
        ? 'Drawn to natural (earth-mined) diamonds'
        : 'Open to lab-grown'
    lines.push(copy)
  }
  const text = lines.join('\n')
  return `https://wa.me/917355437836?text=${encodeURIComponent(text)}`
}
