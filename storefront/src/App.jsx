import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RouteTracker from "./components/RouteTracker.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import HomePage from "./pages/HomePage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import ShortlistPage from "./pages/ShortlistPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrderConfirmedPage from "./pages/OrderConfirmedPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ThankYouPage from "./pages/ThankYouPage.jsx";
import StubPage from "./pages/StubPage.jsx";
import { STUBS } from "./content/stubs.js";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <RouteTracker />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* shopping flow (this phase) */}
          <Route path="/the-proposal/engagement-rings" element={<CatalogPage />} />
          <Route path="/the-proposal/engagement-rings/:slug" element={<ProductPage />} />
          <Route path="/shortlist" element={<ShortlistPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmed" element={<OrderConfirmedPage />} />

          {/* conversation gateway (phase 1) */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />

          {/* every other spec route — themed stub, real copy + CTAs */}
          {Object.keys(STUBS).map((path) => (
            <Route key={path} path={path} element={<StubPage />} />
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
