import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import { routeTheme } from "../lib/routeTheme.js";
import "../layout.css";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const theme = routeTheme(pathname);

  // Drive the token swap from <html> so the browser chrome / body ground match.
  useEffect(() => {
    document.documentElement.setAttribute("data-bb-theme", theme);
  }, [theme]);

  return (
    <div className="bb-shell" data-bb-theme={theme}>
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
