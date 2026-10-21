import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ABOUT, BARE_BRIEF, PRODUCTS_MENU } from "../content/nav.js";
import { useCart } from "../lib/cart.js";
import { useShortlist } from "../lib/shortlist.js";

const LOGO = `${import.meta.env.BASE_URL}brand/logo-diamond.png`;

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
function Chevron() {
  return (
    <svg className="bb-nav__chev" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="m3 4.5 3 3 3-3" />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const productsRef = useRef(null);
  const { pathname } = useLocation();
  const shortlist = useShortlist();
  const cart = useCart();

  // On the home page the header floats transparent over the hero video until
  // the visitor scrolls; every other page keeps the solid sticky bar.
  const overlay = pathname === "/";

  // close the mobile drawer + products menu on navigation
  useEffect(() => {
    setOpen(false);
    setProductsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!overlay) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // click outside / Escape closes the products menu
  useEffect(() => {
    if (!productsOpen) return undefined;
    const onDown = (e) => {
      if (productsRef.current && !productsRef.current.contains(e.target)) setProductsOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setProductsOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [productsOpen]);

  return (
    <header
      className="bb-header"
      data-overlay={overlay || undefined}
      data-solid={overlay && (scrolled || open) ? true : undefined}
    >
      <div className="bb-header__row">
        <Link to="/" className="bb-brand" aria-label="Bare Brilliant — home">
          <img src={LOGO} alt="" width="163" height="120" />
        </Link>

        <nav className="bb-nav" aria-label="Primary" data-open={open}>
          <div className="bb-nav__group" ref={productsRef} data-open={productsOpen}>
            <button
              type="button"
              className="bb-nav__trigger"
              aria-expanded={productsOpen}
              aria-controls="bb-products-menu"
              onClick={() => setProductsOpen((v) => !v)}
            >
              Products <Chevron />
            </button>
            <ul id="bb-products-menu" className="bb-nav__menu">
              {PRODUCTS_MENU.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </div>
          <NavLink to={ABOUT.to}>{ABOUT.label}</NavLink>
          <Link to={BARE_BRIEF} className="bb-nav__brief">
            Bare Brief
          </Link>
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
          <Link to={BARE_BRIEF} className="bb-btn bb-btn--primary bb-header__cta">
            <span>Bare Brief</span>
            <small>Free Consultation</small>
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
