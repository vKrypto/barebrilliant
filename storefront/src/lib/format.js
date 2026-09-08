// Indian numbering, no decimals: 92000 -> "₹92,000", 1250000 -> "₹12,50,000".
const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function inr(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? inrFmt.format(n) : "";
}

// "from" price line used on cards and PDP title blocks.
export function fromPrice(amount) {
  return `From ${inr(amount)}`;
}
