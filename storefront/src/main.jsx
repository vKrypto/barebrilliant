import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./theme.css";
import "./index.css";
import { initTracker } from "./events/index.js";
import "./events/swClient.js";

// Point the CSS hero backdrop at the public asset with the correct base path
// (a bare url() in CSS would miss the /<repo>/ prefix on GitHub Pages).
document.documentElement.style.setProperty(
  "--bb-hero-image",
  `url("${import.meta.env.BASE_URL}hero-ring.jpg")`
);

initTracker();

createRoot(document.getElementById("root")).render(<App />);
