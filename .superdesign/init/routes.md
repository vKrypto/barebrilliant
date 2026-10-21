# Routes

Config-based routing (react-router-dom v6) in App.jsx; every route is wrapped in Layout.

| Path | Component |
|---|---|
| / | pages/HomePage.jsx — hero (Meant, Not Made.), The House 4-card grid, Belief, How We Work 6 steps, Forever lede, final CTA |
| /the-proposal/engagement-rings | pages/CatalogPage.jsx |
| /the-proposal/engagement-rings/:slug | pages/ProductPage.jsx |
| /shortlist, /cart, /checkout, /order-confirmed | Shortlist/Cart/Checkout/OrderConfirmed pages |
| /chat, /thank-you | ChatPage, ThankYouPage |
| keys of HOUSE_PAGES (content/house.js): /the-proposal, /the-vow, /the-chapters, /private-commission, /why-natural, /our-house | pages/HousePage.jsx |
| keys of STUBS (content/stubs.js) | pages/StubPage.jsx |

### `storefront/src/App.jsx`

```jsx
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
import HousePage from "./pages/HousePage.jsx";
import StubPage from "./pages/StubPage.jsx";
import { HOUSE_PAGES } from "./content/house.js";
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

          {/* full house-navigation pages (spec Pages 2, 8, 9, 10, 11, 12) */}
          {Object.keys(HOUSE_PAGES).map((path) => (
            <Route key={path} path={path} element={<HousePage />} />
          ))}

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
```
