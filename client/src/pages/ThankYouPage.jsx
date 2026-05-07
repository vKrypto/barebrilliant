import { Link, useLocation } from 'react-router-dom'
import { buildWhatsAppUrl } from '../api/submitLead.js'

function ThankYouPage() {
  const { state } = useLocation()
  const name = state?.name
  const lead = state?.lead

  const optionalChatUrl =
    lead && typeof lead.name === 'string' ? buildWhatsAppUrl(lead) : null

  return (
    <div className="thank">
      <header className="bb-topbar" role="banner">
        <Link to="/" className="bb-logo">
          Bare <span>Brilliant</span>
        </Link>
      </header>
      <main className="thank__inner">
        <h1>{name ? `Thank you, ${name}.` : 'Thank you.'}</h1>
        <p>
          {name
            ? 'We have your note. Someone from the studio will be in touch—quietly, and only about what you asked for.'
            : "We've received your message. The studio will respond in person when they can."}
        </p>
        {optionalChatUrl && (
          <p className="thank-optional">
            <a href={optionalChatUrl} target="_blank" rel="noopener noreferrer">
              Prefer to say hello in chat first?
            </a>{' '}
            <span className="thank-optional__muted">—optional; same care.</span>
          </p>
        )}
        <Link to="/" className="btn-secondary">
          Return home
        </Link>
      </main>
    </div>
  )
}

export default ThankYouPage
