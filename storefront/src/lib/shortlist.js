import { useMemo } from "react";
import { useLocalList } from "./localList.js";

const KEY = "bb.shortlist";

// Wishlist = "Your Shortlist" in the spec. Saved designs only, no third-party
// contact details (spec privacy rule).
export function useShortlist() {
  const [items, setItems] = useLocalList(KEY);

  return useMemo(() => {
    const ids = new Set(items.map((it) => it.id));
    return {
      items,
      ids,
      count: items.length,
      has: (id) => ids.has(id),
      toggle(item) {
        const saved = ids.has(item.id);
        setItems((list) =>
          saved
            ? list.filter((it) => it.id !== item.id)
            : [...list, { ...item, added_at: new Date().toISOString() }]
        );
        return !saved; // true if now saved
      },
      remove(id) {
        setItems((list) => list.filter((it) => it.id !== id));
      },
      clear() {
        setItems([]);
      },
    };
  }, [items, setItems]);
}
