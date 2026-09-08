import { useId, useState } from "react";

// Inline expand/collapse used for PDP price breakup, specifications, FAQ, etc.
// Fires onToggle(open) so the page can emit detail_expand / faq_expand.
export default function Accordion({ title, children, defaultOpen = false, onToggle }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  function toggle() {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }

  return (
    <div className="bb-accordion" data-open={open}>
      <button
        type="button"
        className="bb-accordion__head"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <span>{title}</span>
        <span className="bb-accordion__sign" aria-hidden="true">
          {open ? "–" : "+"}
        </span>
      </button>
      <div id={id} className="bb-accordion__body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
