import { useMemo } from "react";
import { useLocalList } from "./localList.js";

const KEY = "bb.cart";

// Line identity: same design + metal + size = one line (qty increments).
const lineKey = (it) => [it.id, it.metal || "", it.size || ""].join("|");

export function useCart() {
  const [items, setItems] = useLocalList(KEY);

  const api = useMemo(() => {
    const count = items.reduce((n, it) => n + (it.qty || 1), 0);
    const subtotal = items.reduce((n, it) => n + (it.price_from || 0) * (it.qty || 1), 0);

    return {
      items,
      count,
      subtotal,
      add(item, qty = 1) {
        const key = lineKey(item);
        setItems((list) => {
          const i = list.findIndex((it) => lineKey(it) === key);
          if (i === -1) {
            return [...list, { ...item, key, qty, added_at: new Date().toISOString() }];
          }
          const next = list.slice();
          next[i] = { ...next[i], qty: (next[i].qty || 1) + qty };
          return next;
        });
      },
      setQty(key, qty) {
        setItems((list) =>
          qty <= 0
            ? list.filter((it) => it.key !== key)
            : list.map((it) => (it.key === key ? { ...it, qty } : it))
        );
      },
      remove(key) {
        setItems((list) => list.filter((it) => it.key !== key));
      },
      clear() {
        setItems([]);
      },
    };
  }, [items, setItems]);

  return api;
}
