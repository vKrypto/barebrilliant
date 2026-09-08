import { Link } from "react-router-dom";

const YEAR = new Date().getFullYear();

// Deep ink footer, warm ivory text, restrained links (design guide §7).
export default function Footer() {
  return (
    <footer className="sf-footer" id="craft">
      <div className="sf-footer__inner">
        <div className="sf-footer__brand">
          <h3>Bare Brilliant</h3>
          <p>
            Premium engagement rings with quiet confidence. Crafted for
            significance, not excess — considered from proportion and finish to
            how the ring feels when worn.
          </p>
        </div>

        <div className="sf-footer__col">
          <h4>Explore</h4>
          <ul>
            <li>
              <Link to="/chat">Book a consultation</Link>
            </li>
            <li>
              <a href="#craft">Craftsmanship</a>
            </li>
            <li>
              <a href="#craft">Materials &amp; certification</a>
            </li>
          </ul>
        </div>

        <div className="sf-footer__col">
          <h4>Studio</h4>
          <ul>
            <li>
              <a href="mailto:care@barebrilliant.com">care@barebrilliant.com</a>
            </li>
            <li>
              <a href="#craft">Appointments</a>
            </li>
            <li>
              <a href="#craft">Care &amp; returns</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="sf-footer__base">
        <span>&copy; {YEAR} Bare Brilliant. All rights reserved.</span>
        <span>Designed with restraint. Made to be remembered.</span>
      </div>
    </footer>
  );
}
