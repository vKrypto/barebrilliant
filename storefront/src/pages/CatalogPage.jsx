import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { fetchCatalog } from "../lib/storage.js";
import { trackFilterChange, trackSortChange } from "../events/index.js";
import "../catalog.css";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];
const INLINE_CTA_EVERY = 8;

function parseList(v) {
  return v ? v.split(",").filter(Boolean) : [];
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCatalog()
      .then((data) => alive && (setCatalog(data), setStatus("ready")))
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  const shapes = parseList(params.get("shape"));
  const styles = parseList(params.get("style"));
  const budgetIx = params.get("budget");
  const caratIx = params.get("centreCarat");
  const sort = params.get("sort") || "recommended";
  const q = params.get("q") || "";

  function patch(next, meta) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) p.delete(k);
      else p.set(k, Array.isArray(v) ? v.join(",") : String(v));
    });
    setParams(p, { replace: true });
    if (meta) trackFilterChange(meta);
  }

  function toggleIn(list, value, key) {
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    patch({ [key]: next }, { filter: key, value, active: next });
  }

  const budgetBand = catalog && budgetIx != null ? catalog.facets.budget[+budgetIx] : null;
  const caratBand = catalog && caratIx != null ? catalog.facets.centre_carat[+caratIx] : null;

  const results = useMemo(() => {
    if (!catalog) return [];
    let list = catalog.products.slice();
    if (shapes.length) list = list.filter((p) => shapes.includes(p.shape));
    if (styles.length) list = list.filter((p) => styles.includes(p.style));
    if (budgetBand) list = list.filter((p) => p.price_from >= budgetBand.min && p.price_from <= budgetBand.max);
    if (caratBand) list = list.filter((p) => (p.centre_carat_shown ?? 0) >= caratBand.min && (p.centre_carat_shown ?? 0) <= caratBand.max);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) =>
        [p.name, p.descriptor, p.shape, p.style].join(" ").toLowerCase().includes(needle)
      );
    }
    switch (sort) {
      case "newest":
        list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        break;
      case "price-asc":
        list.sort((a, b) => a.price_from - b.price_from);
        break;
      case "price-desc":
        list.sort((a, b) => b.price_from - a.price_from);
        break;
      default:
        list.sort((a, b) => (b.sort_weight || 0) - (a.sort_weight || 0));
    }
    return list;
  }, [catalog, shapes, styles, budgetBand, caratBand, q, sort]);

  const activeCount =
    shapes.length + styles.length + (budgetBand ? 1 : 0) + (caratBand ? 1 : 0) + (q ? 1 : 0);

  return (
    <section className="bb-catalog bb-section">
      <div className="bb-container">
        <header className="bb-catalog__head">
          <p className="bb-eyebrow">The Proposal</p>
          <h1 className="bb-h1">Engagement Rings</h1>
          <p className="bb-body-lg">A place to begin. Every design can move from here.</p>
        </header>

        <div className="bb-catalog__bar">
          <input
            type="search"
            className="bb-input"
            placeholder="Search designs"
            defaultValue={q}
            aria-label="Search designs"
            onChange={(e) => patch({ q: e.target.value })}
          />
          <label className="bb-catalog__sort">
            <span className="bb-visually-hidden">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                patch({ sort: e.target.value });
                trackSortChange({ sort: e.target.value });
              }}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="bb-btn bb-btn--secondary bb-catalog__filtertoggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filters{activeCount ? ` (${activeCount})` : ""}
          </button>
        </div>

        {status === "loading" && <p className="bb-catalog__msg">Loading designs…</p>}
        {status === "error" && (
          <p className="bb-catalog__msg">
            We couldn't load the designs just now. <button className="bb-btn bb-btn--tertiary" onClick={() => location.reload()}>Retry</button>
          </p>
        )}

        {status === "ready" && catalog && (
          <div className="bb-catalog__layout">
            <aside className="bb-catalog__filters" data-open={filtersOpen}>
              <FilterGroup
                title="Centre Stone Shape"
                options={catalog.facets.shape}
                selected={shapes}
                onToggle={(v) => toggleIn(shapes, v, "shape")}
              />
              <FilterGroup
                title="Design Style"
                options={catalog.facets.style}
                selected={styles}
                onToggle={(v) => toggleIn(styles, v, "style")}
              />
              <BandGroup
                title="Budget"
                bands={catalog.facets.budget}
                activeIx={budgetIx}
                onPick={(ix) => patch({ budget: ix }, { filter: "budget", value: ix })}
              />
              <BandGroup
                title="Centre Stone Carat"
                note="Applies only to the centre stone, never total ring carat weight."
                bands={catalog.facets.centre_carat}
                activeIx={caratIx}
                onPick={(ix) => patch({ centreCarat: ix }, { filter: "centreCarat", value: ix })}
              />
              {activeCount > 0 && (
                <button
                  className="bb-btn bb-btn--tertiary"
                  onClick={() => setParams(new URLSearchParams(sort !== "recommended" ? { sort } : {}), { replace: true })}
                >
                  Clear all filters
                </button>
              )}
            </aside>

            <div className="bb-catalog__results">
              <p className="bb-catalog__count">
                {results.length} design{results.length === 1 ? "" : "s"}
              </p>
              {results.length === 0 ? (
                <div className="bb-catalog__empty">
                  <p className="bb-body">Nothing matches those filters yet.</p>
                  <Link to="/chat?intent=ring-guidance&source=engagement-listing" className="bb-btn bb-btn--primary">
                    Tell us what you're imagining
                  </Link>
                </div>
              ) : (
                <div className="bb-catalog__grid">
                  {results.map((p, i) => (
                    <FragmentWithCta key={p.id} index={i}>
                      <ProductCard product={p} />
                    </FragmentWithCta>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  function FragmentWithCta({ index, children }) {
    const showCta = index > 0 && index % INLINE_CTA_EVERY === 0;
    return (
      <>
        {showCta && (
          <aside className="bb-pcard bb-catalog__inlinecta">
            <h3 className="bb-h3">Not sure what matters?</h3>
            <p>Tell us the budget and the kind of ring you're imagining. We'll show you where the money makes a visible difference.</p>
            <Link to="/chat?intent=ring-guidance&source=engagement-listing" className="bb-btn bb-btn--primary">
              Ask Bare Brilliant
            </Link>
          </aside>
        )}
        {children}
      </>
    );
  }
}

function FilterGroup({ title, options, selected, onToggle }) {
  return (
    <fieldset className="bb-fgroup">
      <legend>{title}</legend>
      <div className="bb-fgroup__chips">
        {options.map((opt) => (
          <label key={opt} className="bb-chip" data-on={selected.includes(opt)}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BandGroup({ title, note, bands, activeIx, onPick }) {
  return (
    <fieldset className="bb-fgroup">
      <legend>{title}</legend>
      {note && <p className="bb-fgroup__note">{note}</p>}
      <div className="bb-fgroup__chips">
        {bands.map((b, ix) => (
          <label key={b.label} className="bb-chip" data-on={String(ix) === activeIx}>
            <input
              type="radio"
              name={title}
              checked={String(ix) === activeIx}
              onChange={() => onPick(String(ix) === activeIx ? null : ix)}
              onClick={() => String(ix) === activeIx && onPick(null)}
            />
            {b.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
