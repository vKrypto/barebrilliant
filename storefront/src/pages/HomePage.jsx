import { Link } from "react-router-dom";
import { trackBannerClick } from "../events/index.js";
import "../home.css";

const HOUSE = [
  { key: "the-proposal", name: "The Proposal", line: "For the moment you ask. And the reason you ask it.", to: "/the-proposal" },
  { key: "the-vow", name: "The Vow", line: "The yes becomes every day.", to: "/the-vow" },
  { key: "the-chapters", name: "The Chapters", line: "The story continues after yes.", to: "/the-chapters" },
  { key: "private-commission", name: "Private Commission", line: "When the piece does not belong in a category.", to: "/private-commission" },
];

const HOW_WE_WORK = [
  ["The Brief", "Who is it for? What does she wear? What should the ring never feel like? What matters most? What are you comfortable spending?"],
  ["The Design", "We turn those clues into a direction: shape, proportion, setting, profile and the details that make the ring feel specific."],
  ["The Natural Diamond", "Once the design tells us what the centre stone needs to do, we source natural diamonds that make sense for its proportions and your budget."],
  ["The Reason", "We tell you what we would choose, what you are paying more for and which differences you are unlikely to see."],
  ["The Creation", "Only after design and diamond approval does making begin."],
  ["The Record", "Final specifications, independent certification, HUID, invoice and service information stay together."],
];

export default function HomePage() {
  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="bb-home-hero">
        <div className="bb-container bb-home-hero__inner">
          <p className="bb-eyebrow">Natural Diamond Engagement Rings</p>
          <h1 className="bb-hero-type">Meant, Not Made.</h1>
          <p className="bb-body-lg">
            Natural diamond engagement rings, made around the person you're choosing.
          </p>
          <div className="bb-home-hero__cta">
            <Link to="/chat?intent=proposal&source=home-hero" className="bb-btn bb-btn--primary">
              Start Your Ring
            </Link>
            <Link to="/the-proposal" className="bb-btn bb-btn--secondary">
              Explore The Proposal
            </Link>
          </div>
          <p className="bb-home-hero__trust">
            Natural Diamonds <i>·</i> GIA Solitaires <i>·</i> Made to Order <i>·</i> PAN India
          </p>
        </div>
      </section>

      {/* ---------- the house ---------- */}
      <section className="bb-section bb-house">
        <div className="bb-container">
          <div className="bb-house__head">
            <span className="bb-house__diamond" aria-hidden="true" />
            <p className="bb-eyebrow bb-eyebrow--plain">The House</p>
            <h2 className="bb-h2">Four product worlds. One relationship journey.</h2>
          </div>
          <div className="bb-house__grid">
            {HOUSE.map((h) => (
              <Link
                key={h.key}
                to={h.to}
                className="bb-house__card"
                onClick={() => trackBannerClick({ banner_id: `house-${h.key}`, source: "home" })}
              >
                <h3 className="bb-h3">{h.name}</h3>
                <p>{h.line}</p>
                <span className="bb-btn bb-btn--tertiary" aria-hidden="true">
                  Explore
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- belief ---------- */}
      <section className="bb-section bb-belief">
        <div className="bb-container bb-belief__inner">
          <p className="bb-eyebrow">The Belief</p>
          <h2 className="bb-h2">Some Things Can't Be Made.</h2>
          <p className="bb-body-lg">
            We can design the ring. We can refine every proportion. We can source
            a remarkable natural diamond. What we can't manufacture is the reason
            you're buying it — chemistry, timing, the moment one person became
            different from everyone else. Bare Brilliant exists to make the ring
            around that.
          </p>
          <Link to="/our-house" className="bb-btn bb-btn--secondary">
            Why Bare Brilliant
          </Link>
        </div>
      </section>

      {/* ---------- how we work ---------- */}
      <section className="bb-section bb-how">
        <div className="bb-container">
          <p className="bb-eyebrow">How We Work</p>
          <h2 className="bb-h2">Start with the person. The stone comes second.</h2>
          <ol className="bb-how__grid">
            {HOW_WE_WORK.map(([h, p], i) => (
              <li key={h} className="bb-card bb-how__step">
                <span className="bb-how__num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="bb-h3">{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
          <div className="bb-how__cta">
            <Link to="/how-it-works" className="bb-btn bb-btn--secondary">
              See how it works
            </Link>
            <Link to="/chat?source=home-how-we-work" className="bb-btn bb-btn--tertiary">
              Talk to Bare Brilliant
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- forever ---------- */}
      <section className="bb-section bb-forever">
        <div className="bb-container bb-forever__inner">
          <p className="bb-eyebrow">Forever Is A Verb</p>
          <p className="bb-lede">
            A proposal happens once. A relationship happens every day after it.
            Showing up. Listening. Changing. Repairing. Laughing. Choosing. Again
            and again.
          </p>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="bb-section bb-finalcta">
        <div className="bb-container bb-finalcta__inner">
          <h2 className="bb-h2">You've found the person. Let's get the ring right.</h2>
          <p className="bb-body-lg">Tell us what you know. We'll help with what you don't.</p>
          <div className="bb-finalcta__row">
            <Link to="/chat?intent=proposal&source=home-final" className="bb-btn bb-btn--primary">
              Start a conversation
            </Link>
            <Link to="/the-proposal/engagement-rings" className="bb-btn bb-btn--secondary">
              Explore engagement rings
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
