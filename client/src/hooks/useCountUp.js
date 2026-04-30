import { useEffect, useRef, useState } from "react";

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Tweens a number from its previous value (or 0 on mount) to `value` over
 * `duration` ms with ease-out cubic. Re-runs whenever value changes.
 */
export function useCountUp(value, { duration = 900, integer = true } = {}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);
  const startRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = fromRef.current;
    if (target === from) {
      setDisplay(integer ? Math.round(target) : target);
      return undefined;
    }

    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOut(t);
      const cur = from + (target - from) * eased;
      setDisplay(integer ? Math.round(cur) : Number(cur.toFixed(2)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, integer]);

  return display;
}

export default useCountUp;
