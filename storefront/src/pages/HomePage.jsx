import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { trackBannerClick } from "../events/index.js";
import { MOMENTS } from "../content/nav.js";
import "../home.css";

const MEDIA = `${import.meta.env.BASE_URL}home`;
const CONSULTATION = "/chat?intent=consultation&source=home-consultation";

// Folds 2–5 of the home-page wireframe: one full-bleed film per product world.
const FOLDS = [
  {
    key: "the-proposal",
    eyebrow: "Engagement",
    name: "The Proposal",
    line: "For the moment you ask. And the reason you ask it.",
    to: "/the-proposal",
  },
  { key: "the-vow", eyebrow: "Wedding Bands", name: "The Vow", line: "The yes becomes every day.", to: "/the-vow" },
  {
    key: "the-chapters",
    eyebrow: "Anniversary & Milestones",
    name: "The Chapters",
    line: "The story continues after yes.",
    to: "/the-chapters",
  },
  {
    key: "private-commission",
    eyebrow: "One of One",
    name: "Private Commission",
    line: "When the piece does not belong in a category.",
    to: "/private-commission",
  },
];

// Autoplay is a nicety, not a requirement: skip it for reduced-motion and
// data-saver visitors (they keep the poster still).
function canAutoplay() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (navigator.connection?.saveData) return false;
  return true;
}

// Muted looping film that plays only while it is meaningfully on screen and
// pauses once scrolled past, so at most one or two clips decode at a time.
function FoldVideo({ name, eager = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !canAutoplay()) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className="bb-fold__media"
      poster={`${MEDIA}/${name}.webp`}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      aria-hidden="true"
    >
      <source src={`${MEDIA}/${name}.mp4`} type="video/mp4" />
    </video>
  );
}

// Fade-up on first sight for anything marked data-reveal.
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".bb-home [data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-revealed", ""));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-revealed", "");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function HomePage() {
  useReveal();

  return (
    <div className="bb-home">
      {/* ---------- 1. hero banner ---------- */}
      <section className="bb-fold bb-fold--hero" aria-label="Bare Brilliant">
        <FoldVideo name="hero" eager />
        <div className="bb-fold__scrim" aria-hidden="true" />
        <h1 className="bb-hero-mark">Bare Brilliant</h1>
        <div className="bb-slate" aria-hidden="true">
          <span>Natural Diamonds · Made to Order · PAN India</span>
          <span>Scroll ↓</span>
        </div>
      </section>

      {/* ---------- 2–5. product worlds ---------- */}
      {FOLDS.map((f) => (
        <div key={f.key}>
          <div className="bb-cut" aria-hidden="true" />
          <Link
            to={f.to}
            className="bb-fold bb-fold--world"
            onClick={() => trackBannerClick({ banner_id: `home-fold-${f.key}`, source: "home" })}
          >
            <FoldVideo name={f.key} />
            <div className="bb-fold__scrim" aria-hidden="true" />
            <div className="bb-fold__copy" data-reveal>
              <span className="bb-eyebrow">{f.eyebrow}</span>
              <h2 className="bb-fold__title">
                <span>{f.name}</span>
                <i aria-hidden="true">→</i>
              </h2>
              <p>{f.line}</p>
            </div>
          </Link>
        </div>
      ))}

      {/* ---------- 6. belief ---------- */}
      <section className="bb-quote">
        <span className="bb-quote__mark" aria-hidden="true">
          <span className="bb-diamond" />
        </span>
        <blockquote data-reveal>
          Some things in life cannot be manufactured. Some things feel significant before we ever decide
          what to call them.
        </blockquote>
      </section>

      {/* ---------- 7. shop by moment ---------- */}
      <section className="bb-moments" aria-labelledby="bb-moments-title">
        <div className="bb-container">
          <p id="bb-moments-title" className="bb-eyebrow">
            Shop by Moment
          </p>
          <ul className="bb-moments__list">
            {MOMENTS.map((m) => (
              <li key={m.to} data-reveal>
                <Link
                  to={m.to}
                  onClick={() => trackBannerClick({ banner_id: `home-moment${m.to.replace("/", "-")}`, source: "home" })}
                >
                  <span>{m.label}</span>
                  <i aria-hidden="true">→</i>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- 8. free consultation ---------- */}
      <section className="bb-consult">
        <div className="bb-ruler" aria-hidden="true" />
        <div className="bb-container bb-consult__inner" data-reveal>
          <Link
            to={CONSULTATION}
            className="bb-consult__link"
            onClick={() => trackBannerClick({ banner_id: "home-consultation", source: "home" })}
          >
            Get your free consultation today <i aria-hidden="true">→</i>
          </Link>
          <p className="bb-body">
            A conversation, not a sales pitch. Tell us what you know; we'll help with what you don't.
          </p>
        </div>
        <div className="bb-ruler" aria-hidden="true" />
      </section>
    </div>
  );
}
