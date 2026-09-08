import { NavLink, Link } from "react-router-dom";

// Understated ink-black navigation (design guide §7). Only the routes that
// exist today; more land here as pages are built.
export default function Header() {
  return (
    <header className="sf-header">
      <Link to="/chat" className="sf-brand">
        Bare <span>Brilliant</span>
      </Link>
      <nav className="sf-nav" aria-label="Primary">
        <NavLink to="/chat">Enquire</NavLink>
        <a href="#craft">Craft</a>
      </nav>
    </header>
  );
}
