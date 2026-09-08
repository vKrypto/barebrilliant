import { Link } from "react-router-dom";
import { FOOTER_COLUMNS, START_YOUR_RING } from "../content/nav.js";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bb-footer">
      <div className="bb-container bb-footer__top">
        <div className="bb-footer__brand">
          <h3>Bare Brilliant</h3>
          <p>Meant, Not Made.</p>
          <p className="bb-body">
            A modern Indian natural-diamond engagement-ring house. We start with
            the person and the design, then help you understand the diamond and
            the trade-offs — without pressure.
          </p>
          <Link to={START_YOUR_RING} className="bb-btn bb-btn--secondary">
            Start Your Ring
          </Link>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading} className="bb-footer__col">
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.to + l.label}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bb-container bb-footer__base">
        <span>&copy; {YEAR} Bare Brilliant. Natural diamonds only. Made to order. PAN India.</span>
        <span>We cannot manufacture the relationship. We never manufacture the sale.</span>
      </div>
    </footer>
  );
}
