import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import "../layout.css";

// The theme (light/dark) is global: lib/theme.js sets it on <html data-bb-theme>.
export default function Layout({ children }) {
  return (
    <div className="bb-shell">
      <a href="#bb-main" className="bb-skip">
        Skip to content
      </a>
      <Header />
      <main id="bb-main" className="bb-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}
