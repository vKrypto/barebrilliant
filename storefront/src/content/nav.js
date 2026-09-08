// Primary house navigation (spec §Site Architecture).
export const HOUSE_NAV = [
  { label: "The Proposal", to: "/the-proposal" },
  { label: "The Vow", to: "/the-vow" },
  { label: "The Chapters", to: "/the-chapters" },
  { label: "Private Commission", to: "/private-commission" },
  { label: "Why Natural", to: "/why-natural" },
  { label: "Our House", to: "/our-house" },
];

// The global-nav conversation gateway (no engineered Bare Brief in this build).
export const START_YOUR_RING = "/chat?intent=proposal&source=global-nav";

export const FOOTER_COLUMNS = [
  {
    heading: "The House",
    links: [
      { label: "The Proposal", to: "/the-proposal" },
      { label: "The Vow", to: "/the-vow" },
      { label: "The Chapters", to: "/the-chapters" },
      { label: "Private Commission", to: "/private-commission" },
      { label: "Engagement Rings", to: "/the-proposal/engagement-rings" },
    ],
  },
  {
    heading: "Guidance",
    links: [
      { label: "How It Works", to: "/how-it-works" },
      { label: "Craftsmanship", to: "/craftsmanship" },
      { label: "The Record", to: "/the-record" },
      { label: "Diamond Guide", to: "/diamond-guide" },
      { label: "Why Natural", to: "/why-natural" },
      { label: "FAQs", to: "/faqs" },
    ],
  },
  {
    heading: "Client Care",
    links: [
      { label: "Talk to Bare Brilliant", to: "/talk-to-us" },
      { label: "Book a Consultation", to: "/book-consultation" },
      { label: "Shipping & Delivery", to: "/shipping-delivery" },
      { label: "Aftercare", to: "/aftercare" },
      { label: "Buyback & Exchange", to: "/buyback-exchange" },
      { label: "Returns", to: "/returns" },
      { label: "Warranty & Resizing", to: "/warranty-resizing" },
    ],
  },
  {
    heading: "House",
    links: [
      { label: "Our House", to: "/our-house" },
      { label: "A Note From Harsh", to: "/founder-note" },
      { label: "Your Shortlist", to: "/shortlist" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  },
];
