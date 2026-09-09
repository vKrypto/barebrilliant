// Full house-navigation pages (spec: BARE BRILLIANT WEBSITE.pdf — Pages 2, 8, 9,
// 10, 11A/11B, 12). Copy is the exact customer-facing language from the Final
// Website Design, Content & Developer Specification, with tone cross-checked
// against the Brand Narrative & House Book. Every CTA route matches that page's
// interaction map.
//
// One generic renderer (pages/HousePage.jsx) walks this shape:
//   { theme, eyebrow, title, support, cta, cta2, blocks[], closer }
//
// block types:
//   worlds   — card grid (2 or 3 up); items link out or stay static
//   features — titled rows, optionally numbered 01…NN
//   tenets   — diamond-bullet list of short lines
//   prose    — eyebrow + heading + paragraphs (anchorable via `id`)
//   pull     — one italic serif line, framed by hairlines
//   founder  — restrained founder note with a monogram portrait

const chat = (qs) => `/chat?${qs}`;

export const HOUSE_PAGES = {
  /* ─────────────────────────────── The Proposal ─────────────────────────── */
  "/the-proposal": {
    theme: "dark",
    eyebrow: "The Proposal",
    title: "One question. One person. A ring that should feel just as specific.",
    support:
      "Explore natural-diamond engagement rings, create one from the first sketch, or plan the proposal privately with us.",
    cta: { label: "Start your ring", to: chat("intent=proposal&source=proposal-hero") },
    cta2: { label: "Explore designs", to: "/the-proposal/engagement-rings" },
    blocks: [
      {
        type: "worlds",
        cols: 2,
        eyebrow: "Four ways in",
        title: "Every path starts with the person, not the stone.",
        items: [
          {
            kicker: "Engagement Rings",
            body:
              "Start with a Bare Brilliant design. Change the diamond, proportion, setting or details until it feels right.",
            to: "/the-proposal/engagement-rings",
            cta: "Explore designs",
          },
          {
            kicker: "One of One — Custom Rings",
            body:
              "No catalogue starting point. We begin with the person, the story and how the ring should feel. Then we design it. Only when the form is right do we find the natural diamond it deserves.",
            to: "/the-proposal/custom-rings",
            cta: "Create one",
          },
          {
            kicker: "Proposal Rings",
            body: "Ask now. Make the final design decision together after yes.",
            to: "/the-proposal/proposal-rings",
            cta: "Explore",
          },
          {
            kicker: "Secret Proposal Guidance",
            body:
              "Keep the surprise. Let us reduce everything you should not have to guess.",
            to: "/the-proposal/secret-guidance",
            cta: "Plan privately",
          },
        ],
      },
      { type: "pull", text: "The proposal should feel personal because the process was personal." },
    ],
    closer: {
      title: "You've found the person. Let's get the ring right.",
      support: "Tell us what you know. We'll help with what you don't.",
      cta: { label: "Start a conversation", to: chat("intent=proposal&source=proposal-close") },
      cta2: { label: "Explore engagement rings", to: "/the-proposal/engagement-rings" },
    },
  },

  /* ─────────────────────────────────── The Vow ──────────────────────────── */
  "/the-vow": {
    theme: "dark",
    eyebrow: "The Vow",
    title: "The yes becomes every day.",
    support:
      "Wedding bands, diamond bands and couple rings — designed beside your engagement ring, Bare Brilliant or otherwise.",
    cta: { label: "Design your bands", to: chat("intent=wedding-bands&source=the-vow") },
    cta2: { label: "Explore The Vow", to: "#designs" },
    blocks: [
      {
        type: "features",
        id: "designs",
        items: [
          {
            title: "Wedding Bands",
            body:
              "Clean, considered bands designed for the part nobody photographs as much: wearing them every day.",
          },
          {
            title: "Diamond Bands",
            body: "More light, without competing with the engagement ring.",
          },
          {
            title: "Couple Rings",
            body:
              "Related rather than identical. Two rings can belong together without forcing two people to have the same taste.",
          },
          {
            title: "Designed Beside Your Ring",
            body:
              "Show us the engagement ring — Bare Brilliant or otherwise. We will consider its profile, height and proportions when designing the band beside it.",
            to: chat("intent=band-pairing&upload=engagement-ring&source=the-vow"),
            cta: "Show us your engagement ring",
          },
        ],
      },
      {
        type: "pull",
        text:
          "Forever is a verb. A wedding band does not promise that nothing will change — it marks the choice to keep meeting each other through everything that does.",
      },
    ],
    closer: {
      title: "Designed beside the ring you already chose.",
      cta: { label: "Design your bands", to: chat("intent=wedding-bands&source=the-vow-close") },
    },
  },

  /* ───────────────────────────────── The Chapters ───────────────────────── */
  "/the-chapters": {
    theme: "dark",
    eyebrow: "The Chapters",
    title: "Not every milestone needs a ceremony to matter.",
    support:
      "Anniversaries, the first home with both names on the door, shared wins and the chapters that don't fit a category — jewellery for what the relationship becomes after the first promise.",
    cta: { label: "Mark a chapter", to: chat("intent=milestone&source=the-chapters") },
    cta2: { label: "Explore the chapters", to: "#stories" },
    blocks: [
      {
        type: "features",
        id: "stories",
        items: [
          {
            title: "Anniversaries",
            body: "Not because another year passed. Because of everything that happened inside it.",
          },
          {
            title: "The New Home",
            body: "The first place with both names on the door deserves its own memory.",
          },
          {
            title: "Shared Wins",
            body:
              "The business worked. The move happened. The difficult year ended. Something finally became yours.",
          },
          {
            title: "The Next Chapter",
            body:
              "Some milestones do not fit a category. Tell us what happened. We will help decide what should mark it.",
          },
        ],
      },
      { type: "pull", text: "What chapter are you in?" },
    ],
    closer: {
      title: "Tell us what happened. We'll help decide what should mark it.",
      cta: { label: "Mark a chapter", to: chat("intent=milestone&source=the-chapters-close") },
    },
  },

  /* ─────────────────────────────── Private Commission ───────────────────── */
  "/private-commission": {
    theme: "dark",
    eyebrow: "Private Commission",
    title: "When the piece does not belong in a category.",
    support:
      "Earrings, bracelets, necklaces and high jewellery — everything that begins with a person or a story rather than a catalogue requirement.",
    cta: {
      label: "Begin a private commission",
      to: chat("intent=private-commission&source=private-commission"),
    },
    blocks: [
      {
        type: "worlds",
        cols: 2,
        items: [
          {
            kicker: "Earrings",
            body:
              "From restrained natural-diamond studs to one-off drops and statement pieces developed around a person, stone or occasion.",
            to: chat("intent=private-commission&type=earrings&source=private-commission"),
            cta: "Start with earrings",
          },
          {
            kicker: "Bracelets",
            body:
              "Tennis bracelets, line bracelets and fully bespoke forms developed around proportion, wearability and natural diamonds.",
            to: chat("intent=private-commission&type=bracelets&source=private-commission"),
            cta: "Start with bracelets",
          },
          {
            kicker: "Necklaces",
            body:
              "Pendants, solitaire necklaces, line pieces and custom compositions designed from the neckline outward.",
            to: chat("intent=private-commission&type=necklaces&source=private-commission"),
            cta: "Start with necklaces",
          },
          {
            kicker: "High Jewellery",
            body:
              "Exceptional natural diamonds, ambitious scale and pieces that require their own design process.",
            to: chat("intent=private-commission&type=high-jewellery&source=private-commission"),
            cta: "Start with high jewellery",
          },
        ],
      },
      { type: "pull", text: "This deserves to exist only for me — or for us." },
    ],
    closer: {
      title: "One person. One story. One piece.",
      cta: {
        label: "Begin a private commission",
        to: chat("intent=private-commission&source=private-commission-close"),
      },
    },
  },

  /* ─────────────────────────────────── Why Natural ──────────────────────── */
  "/why-natural": {
    theme: "dark",
    eyebrow: "Why Natural",
    title: "Because origin is part of the story.",
    cta: { label: "Talk to Bare Brilliant", to: chat("intent=diamond-question&source=why-natural") },
    cta2: { label: "Explore The Proposal", to: "/the-proposal" },
    blocks: [
      {
        type: "prose",
        paras: [
          "Laboratory-grown diamonds are diamonds. Bare Brilliant does not need to deny that to explain its own choice.",
          "Natural and laboratory-grown diamonds have essentially the same core diamond material. Their growth histories are fundamentally different — and for a ring chosen to mark a connection that could not be made to specification either, that difference means something to us.",
        ],
      },
      {
        type: "features",
        numbered: true,
        items: [
          {
            title: "Ancient by origin",
            body:
              "Many natural diamonds are more than a billion years old. Their beginning had nothing to do with the person who would eventually wear them.",
          },
          {
            title: "Selected, not produced to order",
            body:
              "We do not choose the recipe from which a natural diamond forms. We choose from what nature formed — and decide which stone deserves the ring.",
          },
          {
            title: "Independently understood",
            body:
              "A grading report tells us measurable things about the stone. It does not make the buying decision for you.",
          },
          {
            title: "Meaning, not superiority",
            body:
              "Bare Brilliant choosing natural diamonds does not require somebody else's diamond choice to be wrong. This is simply the origin that belongs to our house.",
          },
        ],
      },
      { type: "pull", text: "Meant, Not Made." },
    ],
    closer: {
      title: "Have a question about origin, or a specific stone?",
      cta: {
        label: "Talk to Bare Brilliant",
        to: chat("intent=diamond-question&source=why-natural-close"),
      },
      cta2: { label: "Explore the proposal", to: "/the-proposal" },
    },
  },

  /* ─────────────────────────────────── Our House ────────────────────────── */
  "/our-house": {
    theme: "dark",
    eyebrow: "Our House",
    title: "Meant, Not Made.",
    support: "Some things can be designed perfectly. The reason you are here is not one of them.",
    cta: { label: "Start a conversation", to: chat("source=our-house") },
    cta2: { label: "Why Natural", to: "/why-natural" },
    blocks: [
      {
        type: "prose",
        eyebrow: "The Problem We Saw",
        paras: [
          "Buying an engagement ring became strangely impersonal. One of the most emotional purchases people make is often reduced to inventory, grades, discount percentages and a salesperson asking how quickly they can close the order.",
          "The customer is given more information than ever and somehow feels less certain.",
        ],
      },
      {
        type: "prose",
        eyebrow: "What We Believe",
        paras: [
          "You can manufacture an image. You can manufacture urgency. You can manufacture a perfect proposal for Instagram. You can even manufacture a diamond.",
          "What you cannot manufacture is chemistry, timing or the moment one person becomes different from everybody else.",
          "Meant, Not Made.",
        ],
      },
      {
        type: "tenets",
        eyebrow: "What That Changes",
        items: [
          "We work only with natural diamonds.",
          "We make around the person, not around inventory.",
          "We explain trade-offs instead of hiding behind grades.",
          "We do not create urgency that is not real.",
          "We show you what you are paying for.",
          "We make only after the decision is clear.",
        ],
      },
      {
        type: "worlds",
        cols: 2,
        eyebrow: "Bare / Brilliant",
        items: [
          {
            kicker: "Bare",
            body:
              "Strip away the pressure, jargon, fake urgency and things someone is trying to make you want. Start with what matters.",
          },
          {
            kicker: "Brilliant",
            body:
              "The diamond, literally. But also clarity: knowing what matters, understanding the decision and seeing it clearly.",
          },
        ],
      },
      {
        type: "prose",
        id: "why-bare-brilliant-exists",
        eyebrow: "Why Bare Brilliant Exists",
        paras: [
          "Buying a diamond has never come with more information. More certificates. More grades. More comparisons. More opinions.",
          "And yet, for something this meaningful, people often walk away with surprisingly little clarity.",
          "Bare Brilliant began with a simple observation: the customer making one of the most important purchases of their life should never be the least confident person in the room.",
          "So we built the experience differently. Start with the person. Understand the ring. Explain the diamond. Show the trade-offs. Recommend only what earns its place.",
          "No inventory to push. No manufactured urgency. No pressure to spend more simply because you can. Just better decisions around something that means a great deal.",
        ],
      },
      {
        type: "founder",
        name: "Harsh Pandey",
        role: "Founder, Bare Brilliant",
        paras: [
          "After more than six years working inside India's diamond and jewellery industry, one thing kept bothering me. Customers were being given enormous amounts of information, but very few people were helping them understand what actually mattered.",
          "I watched people compare colour grades they might never notice, clarity grades they did not need, discounts they could not properly evaluate and dozens of diamonds that only made the decision harder. The problem was not access to choice — it was knowing whom to trust when making the choice.",
          "I did not want to build another jewellery catalogue. I wanted to build the kind of place I would want on my side of the table if I were buying the ring myself. That idea became Bare Brilliant.",
          "— Harsh",
        ],
      },
    ],
    closer: {
      title: "You do not need to know diamonds before speaking to us.",
      support: "Tell us about the person you are choosing. We'll help with the rest.",
      cta: { label: "Start a conversation", to: chat("source=our-house-close") },
      cta2: { label: "A note from Harsh", to: "/founder-note" },
    },
  },
};
