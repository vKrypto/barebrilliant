import { Link, useLocation, Navigate } from "react-router-dom";
import { STUBS } from "../content/stubs.js";
import "../stub.css";

// One presentational component for every spec route not fully built this phase.
// Copy comes from content/stubs.js (taken from the Final spec).
export default function StubPage() {
  const { pathname } = useLocation();
  const key = pathname.replace(/\/+$/, "") || "/";
  const s = STUBS[key];
  if (!s) return <Navigate to="/" replace />;

  return (
    <section className="bb-stub bb-section">
      <div className="bb-container bb-stub__inner">
        <p className="bb-eyebrow">{s.eyebrow}</p>
        <h1 className="bb-h1">{s.title}</h1>
        {s.support && <p className="bb-body-lg bb-stub__support">{s.support}</p>}

        {s.points?.length ? (
          <ul className="bb-stub__points">
            {s.points.map((p) => (
              <li key={p}>
                <span className="bb-diamond" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="bb-stub__cta">
          <Link to={s.cta.to} className="bb-btn bb-btn--primary">
            {s.cta.label}
          </Link>
          {s.cta2 && (
            <Link to={s.cta2.to} className="bb-btn bb-btn--secondary">
              {s.cta2.label}
            </Link>
          )}
        </div>

        <p className="bb-stub__note">
          The full version of this page is being written. The tone, routes and
          calls to action above are final.
        </p>
      </div>
    </section>
  );
}
