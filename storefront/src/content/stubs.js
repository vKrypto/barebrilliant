// Themed placeholder pages for spec routes not fully built this phase. Copy is
// taken from raw_plans/BARE BRILLIANT WEBSITE.pdf so nav never dead-ends and
// the tone is already right when each page is finished.
//
// The six house-navigation pages (The Proposal, The Vow, The Chapters, Private
// Commission, Why Natural, Our House) are now fully built — see content/house.js.
//
// shape: { theme, eyebrow, title, support, points?: string[], cta, cta2? }

const chat = (qs) => `/chat?${qs}`;

export const STUBS = {
  "/the-proposal/custom-rings": {
    theme: "dark",
    eyebrow: "One of One — Custom Rings",
    title: "Start with the ring. Not the stone.",
    support:
      "A custom Bare Brilliant ring begins with how it should feel on the hand and what it should say about the person wearing it. Once the design is right, we find the natural diamond that belongs in it.",
    points: [
      "01 The Story", "02 The Direction", "03 The Sketch", "04 The Design",
      "05 The Natural Diamond", "06 The Creation",
    ],
    cta: { label: "Design a ring with us", to: chat("intent=custom-ring&source=one-of-one") },
  },
  "/the-proposal/proposal-rings": {
    theme: "dark",
    eyebrow: "Proposal Rings",
    title: "Ask now. Choose forever together.",
    support:
      "A proposal ring keeps the question yours without forcing you to guess every detail of the final engagement ring.",
    cta: { label: "Talk it through", to: chat("intent=proposal-ring&source=proposal-rings") },
    cta2: { label: "Plan it secretly", to: "/the-proposal/secret-guidance" },
  },
  "/the-proposal/secret-guidance": {
    theme: "dark",
    eyebrow: "Secret Proposal Guidance",
    title: "Keep the secret. Keep the decision intelligent.",
    support:
      "Style clues you already have, ring size without asking, one trusted friend, discreet contact and working backwards from the date.",
    cta: { label: "Plan it privately", to: chat("intent=secret-proposal&source=secret-guidance") },
  },
  "/founder-note": {
    theme: "dark",
    eyebrow: "A Note From Harsh",
    title: "You do not need to know diamonds before speaking to us.",
    support:
      "Your job is to tell us about the person you are choosing, what you are comfortable spending and anything you have already noticed about what she likes. We will help with the rest — and if something costs more without making the ring meaningfully better, I will tell you that too.",
    cta: { label: "Talk to Bare Brilliant", to: chat("source=founder-note") },
    cta2: { label: "Back to Our House", to: "/our-house" },
  },
  "/how-it-works": {
    theme: "light",
    eyebrow: "How It Works",
    title: "Start with the person. The stone comes second.",
    support: "A consultation-led house, systematic and design-first.",
    points: [
      "The Brief — the person, the occasion, the budget and what you already know.",
      "The Design — the ring's direction, before a certificate dominates the decision.",
      "The Natural Diamond — centre stones whose shape, proportion and value fit that design.",
      "The Reason — our recommendation and the trade-offs between the strongest options.",
      "The Creation — approved design, approved diamond, then making begins.",
      "The Record — final specifications, certification, HUID, price and service, kept together.",
    ],
    cta: { label: "Start a conversation", to: chat("source=how-it-works") },
  },
  "/craftsmanship": {
    theme: "dark",
    eyebrow: "Craftsmanship",
    title: "No production begins while the ring is still an idea.",
    support: "The real creation process, not a generic craftsmanship claim.",
    points: [
      "01 Design approval", "02 CAD & engineering", "03 Metal work", "04 Diamond setting",
      "05 Finishing", "06 Quality control", "07 HUID & documentation", "08 Insured dispatch",
    ],
    cta: { label: "Start a custom ring", to: chat("intent=custom-ring&source=craftsmanship") },
  },
  "/the-record": {
    theme: "light",
    eyebrow: "The Record",
    title: "Every piece leaves with its paperwork in order.",
    support: "Trust proof organised as one coherent system.",
    points: [
      "The Diamond Report — independent grading for the applicable natural centre diamond.",
      "The HUID — the traceable hallmark identity for your gold.",
      "The Design Record — final size, metal, specifications and approved custom details.",
      "The Price Record — diamond, metal, making and applicable tax.",
      "The Delivery Record — order timeline and insured dispatch.",
      "The Service Record — resizing, repairs and future service stay connected to the piece.",
    ],
    cta: { label: "Ask about certification", to: chat("intent=certification-question&source=the-record") },
  },
  "/diamond-guide": {
    theme: "light",
    eyebrow: "Diamond Guide",
    title: "Learn only the decisions that change the ring.",
    support:
      "Cut and proportion, carat versus visual size, how metal and shape change colour, whether an inclusion is actually visible, and what a certificate does and does not tell you.",
    cta: { label: "Ask a diamond question", to: chat("intent=diamond-question&source=diamond-guide") },
  },
  "/faqs": {
    theme: "light",
    eyebrow: "FAQs",
    title: "Organised by the decision you're making.",
    support:
      "Choosing the ring, natural diamonds, ordering and aftercare — not one giant random accordion.",
    cta: { label: "Ask us directly", to: chat("intent=question&source=faq") },
  },
  "/shipping-delivery": {
    theme: "light",
    eyebrow: "Shipping & Delivery",
    title: "Creation time and transit time are not the same thing.",
    support:
      "Standard made-to-order pieces currently target approximately 15 days after final confirmation, then insured PAN-India dispatch.",
    cta: { label: "Talk about my timeline", to: chat("intent=timeline&source=shipping") },
  },
  "/talk-to-us": {
    theme: "dark",
    eyebrow: "Talk to Bare Brilliant",
    title: "Tell us what you're planning.",
    support:
      "No pressure. No obligation. Just a useful first conversation — WhatsApp for screenshots and references, a call for budget and timing, or a virtual consultation to compare on screen.",
    cta: { label: "Start a conversation", to: chat("source=talk-to-us") },
    cta2: { label: "Book a consultation", to: "/book-consultation" },
  },
  "/book-consultation": {
    theme: "light",
    eyebrow: "Private Consultation",
    title: "A useful conversation can save weeks of guessing.",
    support:
      "15 minutes for one focused question, 30 for a ring consultation, 45 for a private commission.",
    cta: { label: "Choose a time", to: chat("intent=consultation&source=book-consultation") },
  },
  "/aftercare": {
    theme: "light",
    eyebrow: "Aftercare",
    title: "Made to be lived with.",
    support:
      "Resizing, cleaning and inspection, repair and service history — part of the relationship, not an afterthought.",
    cta: { label: "Request aftercare", to: chat("intent=aftercare&source=aftercare") },
  },
  "/buyback-exchange": {
    theme: "light",
    eyebrow: "Lifetime Buyback & Exchange",
    title: "A simple value framework you can calculate.",
    support:
      "Lifetime exchange: 100% of prevailing assessed precious-metal value + 90% of assessed natural-diamond value. Cash buyback: 100% of metal + 80% of diamond. Making charges, GST and original discounts are excluded from material value.",
    cta: { label: "Check my exchange value", to: chat("intent=exchange&source=buyback-exchange") },
  },
  "/returns": {
    theme: "light",
    eyebrow: "Returns",
    title: "A 7-day confidence window for eligible standard pieces.",
    support:
      "Eligible standard designs may be returned within 7 calendar days of delivery, subject to inspection. One of One, engraved and structurally modified pieces are not eligible for change-of-mind return.",
    cta: { label: "Start a return", to: chat("intent=return&source=returns") },
  },
  "/warranty-resizing": {
    theme: "light",
    eyebrow: "Lifetime Manufacturing Warranty & Resizing",
    title: "Long-term support, clearly defined.",
    support:
      "Verified manufacturing defects are covered for the lifetime of the piece. One complimentary resize within 90 days, subject to the design's safe adjustment range. Every ring page states Resizable: Yes / Limited / No.",
    cta: { label: "Request warranty service", to: chat("intent=warranty&source=warranty-resizing") },
  },
  "/privacy": {
    theme: "light",
    eyebrow: "Privacy",
    title: "Your story is not ours to misuse.",
    support:
      "What Bare Brilliant collects, why it is needed, how it is used and what choices you have. We do not collect a third party's phone number to share a shortlist, or a full delivery address at the first enquiry.",
    cta: { label: "Talk to us", to: "/talk-to-us" },
  },
  "/terms": {
    theme: "light",
    eyebrow: "Terms & Conditions",
    title: "The commercial basics, in plain language first.",
    support:
      "50% advance to begin, remaining 50% before insured dispatch. Final design, diamond, size, order value and timeline are approved before creation begins. Taxes and price breakup are shown transparently.",
    cta: { label: "Contact support", to: "/talk-to-us" },
  },
};
