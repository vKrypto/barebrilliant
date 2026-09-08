import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RouteTracker from "./components/RouteTracker.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ThankYouPage from "./pages/ThankYouPage.jsx";

// Only /chat and /thank-you exist today. "/" and anything unknown fall through
// to /chat; add real routes here as pages are built.
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteTracker />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
