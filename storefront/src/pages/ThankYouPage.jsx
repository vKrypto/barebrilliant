import { Link, useLocation } from "react-router-dom";
import "../lead.css";

// Copied from the Bare Brilliant reference ThankYouPage; the optional WhatsApp
// hand-off is dropped (not part of this build).
export default function ThankYouPage() {
  const { state } = useLocation();
  const name = state?.name;

  return (
    <div className="thank">
      <main className="thank__inner">
        <h1>{name ? `Thank you, ${name}.` : "Thank you."}</h1>
        <p>
          {name
            ? "We have your note. Someone from the studio will be in touch—quietly, and only about what you asked for."
            : "We've received your message. The studio will respond in person when they can."}
        </p>
        <Link to="/" className="btn-secondary">
          Return home
        </Link>
      </main>
    </div>
  );
}
