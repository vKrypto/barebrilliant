import { Link, useLocation } from "react-router-dom";
import "../chat.css";

export default function ThankYouPage() {
  const { state } = useLocation();
  const name = state?.name;

  return (
    <section className="bb-chat bb-thanks">
      <div className="bb-container bb-thanks__inner">
        <p className="bb-eyebrow">Received</p>
        <h1 className="bb-h1">{name ? `Thank you, ${name}.` : "Thank you."}</h1>
        <p className="bb-body-lg">
          {name
            ? "We have your note. Someone from the house will be in touch — quietly, and only about what you asked for."
            : "We've received your message. The house will respond in person when it can."}
        </p>
        <Link to="/" className="bb-btn bb-btn--secondary">
          Return home
        </Link>
      </div>
    </section>
  );
}
