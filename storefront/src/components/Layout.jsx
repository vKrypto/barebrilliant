import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import "../layout.css";

export default function Layout({ children }) {
  return (
    <div className="sf-shell">
      <Header />
      <main className="sf-main">{children}</main>
      <Footer />
    </div>
  );
}
