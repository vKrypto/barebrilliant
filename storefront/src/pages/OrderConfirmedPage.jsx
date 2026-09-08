import { Link, useLocation } from "react-router-dom";
import "../bag.css";

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const reference = state?.reference;
  const name = state?.name;

  return (
    <section className="bb-section bb-container bb-confirmed">
      <span className="bb-confirmed__diamond" aria-hidden="true" />
      <p className="bb-eyebrow">It's begun</p>
      <h1 className="bb-h1">
        {name ? `Thank you, ${name}.` : "Thank you for the order."}
      </h1>
      <p className="bb-body-lg">
        We'll get back to you shortly. Someone from the house will confirm the
        design, the natural diamond and the final specification — then the 50% to
        begin creation. No payment was taken today.
      </p>
      {reference && (
        <p className="bb-confirmed__ref">
          Your reference <b>{reference}</b>
        </p>
      )}
      <div className="bb-confirmed__cta">
        <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--primary">
          Keep exploring
        </Link>
        <Link to="/chat?intent=order-question&source=order-confirmed" className="bb-btn bb-btn--secondary">
          Ask a question
        </Link>
      </div>
    </section>
  );
}
