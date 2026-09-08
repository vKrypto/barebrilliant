import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { HOUSE_NAV, START_YOUR_RING } from "../content/nav.js";
import { useCart } from "../lib/cart.js";
import { useShortlist } from "../lib/shortlist.js";

function HeartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20Z" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const shortlist = useShortlist();
  const cart = useCart();

  // close the mobile drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="bb-header">
      <div className="bb-header__row">
        <Link to="/" className="bb-brand" aria-label="Bare Brilliant — home">
          Bare <span>Brilliant</span>
        </Link>

        <nav className="bb-nav" aria-label="Primary" data-open={open}>
          {HOUSE_NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="bb-header__actions">
          <Link to="/shortlist" className="bb-iconbtn" aria-label={`Your shortlist (${shortlist.count})`}>
            <HeartIcon />
            {shortlist.count > 0 && <span className="bb-iconbtn__count">{shortlist.count}</span>}
          </Link>
          <Link to="/cart" className="bb-iconbtn" aria-label={`Your bag (${cart.count})`}>
            <BagIcon />
            {cart.count > 0 && <span className="bb-iconbtn__count">{cart.count}</span>}
          </Link>
          <Link to={START_YOUR_RING} className="bb-btn bb-btn--primary bb-header__cta">
            Start Your Ring
          </Link>
          <button
            type="button"
            className="bb-iconbtn bb-burger"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
