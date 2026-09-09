import { Link, Navigate, useLocation } from "react-router-dom";
import { HOUSE_PAGES } from "../content/house.js";
import { trackBannerClick } from "../events/index.js";
import "../house.css";

// One presentational component for every full house-navigation page. Content and
// routes come from content/house.js (the Final Website spec). Mirrors StubPage's
// pathname → data lookup so App only needs a single mapped route per key.
export default function HousePage() {
  const { pathname } = useLocation();
  const key = pathname.replace(/\/+$/, "") || "/";
  const page = HOUSE_PAGES[key];
  if (!page) return <Navigate to="/" replace />;

  const src = key.replace(/^\//, "") || "home";

  return (
    <article className="bb-page">
      <section className="bb-page-hero bb-section">
        <div className="bb-container bb-page-hero__inner">
          <p className="bb-eyebrow">{page.eyebrow}</p>
          <h1 className="bb-h1">{page.title}</h1>
          {page.support && (
            <p className="bb-body-lg bb-page-hero__support">{page.support}</p>
          )}
          <div className="bb-page-hero__cta">
            <Cta link={page.cta} variant="primary" />
            {page.cta2 && <Cta link={page.cta2} variant="secondary" />}
          </div>
        </div>
      </section>

      {page.blocks?.map((block, i) => (
        <Block key={i} block={block} src={src} />
      ))}

      {page.closer && (
        <section className="bb-section bb-page-closer">
          <div className="bb-container bb-page-closer__inner">
            <h2 className="bb-h2">{page.closer.title}</h2>
            {page.closer.support && (
              <p className="bb-body-lg">{page.closer.support}</p>
            )}
            <div className="bb-page-closer__row">
              <Cta link={page.closer.cta} variant="primary" />
              {page.closer.cta2 && (
                <Cta link={page.closer.cta2} variant="secondary" />
              )}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ CTA ---- */
// Internal routes use <Link>; in-page anchors and protocol links use <a>.
function Cta({ link, variant, className, onClick, children }) {
  const cls = className ?? `bb-btn bb-btn--${variant}`;
  const label = children ?? link.label;
  const to = link.to;
  if (/^(https?:|mailto:|tel:|#)/.test(to)) {
    return (
      <a className={cls} href={to} onClick={onClick}>
        {label}
      </a>
    );
  }
  return (
    <Link className={cls} to={to} onClick={onClick}>
      {label}
    </Link>
  );
}

/* --------------------------------------------------------------- blocks ---- */
function Block({ block, src }) {
  switch (block.type) {
    case "worlds":
      return <WorldsBlock block={block} src={src} />;
    case "features":
      return <FeaturesBlock block={block} />;
    case "tenets":
      return <TenetsBlock block={block} />;
    case "prose":
      return <ProseBlock block={block} />;
    case "pull":
      return (
        <section className="bb-pull-sec">
          <div className="bb-container">
            <p className="bb-pull">{block.text}</p>
          </div>
        </section>
      );
    case "founder":
      return <FounderBlock block={block} />;
    default:
      return null;
  }
}

function BlockHead({ eyebrow, title }) {
  if (!eyebrow && !title) return null;
  return (
    <header className="bb-block-head">
      {eyebrow && <p className="bb-eyebrow">{eyebrow}</p>}
      {title && <h2 className="bb-h2">{title}</h2>}
    </header>
  );
}

function WorldsBlock({ block, src }) {
  return (
    <section className="bb-section bb-worlds-sec">
      <div className="bb-container">
        <BlockHead eyebrow={block.eyebrow} title={block.title} />
        <div className="bb-worlds" data-cols={block.cols || 2}>
          {block.items.map((w, i) => {
            const inner = (
              <>
                <p className="bb-worlds__kicker">{w.kicker}</p>
                <p className="bb-worlds__body">{w.body}</p>
                {w.cta && (
                  <span className="bb-btn bb-btn--tertiary" aria-hidden="true">
                    {w.cta}
                  </span>
                )}
              </>
            );
            if (!w.to) {
              return (
                <div key={i} className="bb-worlds__card bb-worlds__card--static">
                  {inner}
                </div>
              );
            }
            const onClick = () =>
              trackBannerClick({ banner_id: `${src}-${slug(w.kicker)}`, source: src });
            return /^(https?:|mailto:|tel:|#)/.test(w.to) ? (
              <a key={i} className="bb-worlds__card" href={w.to} onClick={onClick}>
                {inner}
              </a>
            ) : (
              <Link key={i} className="bb-worlds__card" to={w.to} onClick={onClick}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesBlock({ block }) {
  const List = block.numbered ? "ol" : "ul";
  return (
    <section id={block.id} className="bb-section bb-features-sec">
      <div className="bb-container">
        <BlockHead eyebrow={block.eyebrow} title={block.title} />
        <List className="bb-features">
          {block.items.map((f, i) => (
            <li key={i} className="bb-feature">
              {block.numbered && (
                <span className="bb-feature__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div className="bb-feature__body">
                <h3 className="bb-h3">{f.title}</h3>
                <p>{f.body}</p>
                {f.to && <Cta link={{ to: f.to, label: f.cta }} className="bb-btn bb-btn--tertiary" />}
              </div>
            </li>
          ))}
        </List>
      </div>
    </section>
  );
}

function TenetsBlock({ block }) {
  return (
    <section className="bb-section bb-tenets-sec">
      <div className="bb-container bb-tenets-sec__inner">
        <BlockHead eyebrow={block.eyebrow} title={block.title} />
        <ul className="bb-tenets">
          {block.items.map((t, i) => (
            <li key={i}>
              <span className="bb-diamond" aria-hidden="true" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProseBlock({ block }) {
  return (
    <section id={block.id} className="bb-section bb-prose-sec">
      <div className="bb-container bb-prose-sec__inner">
        {block.eyebrow && <p className="bb-eyebrow">{block.eyebrow}</p>}
        {block.title && <h2 className="bb-h2">{block.title}</h2>}
        {block.paras.map((p, i) => (
          <p key={i} className="bb-body-lg">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

function FounderBlock({ block }) {
  const initials = block.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section className="bb-section bb-founder-sec">
      <figure className="bb-container bb-founder">
        <div className="bb-founder__aside">
          <span className="bb-founder__portrait" aria-hidden="true">
            {initials}
          </span>
          <figcaption>
            <span className="bb-founder__name">{block.name}</span>
            <span className="bb-founder__role">{block.role}</span>
          </figcaption>
        </div>
        <div className="bb-founder__note">
          {block.paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </figure>
    </section>
  );
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
