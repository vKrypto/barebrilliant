import { useCallback, useEffect, useState } from "react";

// Tiny localStorage-backed array with cross-tab (`storage` event) and same-tab
// (`bb:local:<key>` CustomEvent) sync. Cart and wishlist are built on this —
// no backend, no login (keeps hosting cost at zero, per the brief).

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

function write(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* private mode / quota — state still lives in memory for this session */
  }
  window.dispatchEvent(new CustomEvent(`bb:local:${key}`));
}

export function useLocalList(key) {
  const [list, setList] = useState(() => read(key));

  useEffect(() => {
    const sync = () => setList(read(key));
    const onStorage = (e) => {
      if (e.key === key || e.key === null) sync();
    };
    window.addEventListener(`bb:local:${key}`, sync);
    window.addEventListener("storage", onStorage);
    sync();
    return () => {
      window.removeEventListener(`bb:local:${key}`, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const update = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(read(key)) : updater;
      write(key, next);
      setList(next);
    },
    [key]
  );

  return [list, update];
}
