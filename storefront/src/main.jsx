// Base layer first (tokens + reset), so page/component stylesheets imported
// later through the module graph can override cleanly regardless of Vite's
// concatenation order.
import "./theme.css";
import "./index.css";

import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initTracker } from "./events/index.js";
import "./events/swClient.js";

initTracker();

createRoot(document.getElementById("root")).render(<App />);
