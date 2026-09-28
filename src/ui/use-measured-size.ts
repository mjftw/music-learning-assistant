import { useEffect, useRef, useState } from "react";

// design-loop variant (007 round 5) — measures an element's own rendered
// content box via ResizeObserver: `null` before the first measurement, and
// always in this repo's test environment (jsdom implements no layout and no
// ResizeObserver), so a caller's own fallback to today's fixed geometry is
// exercised untouched by every existing test. Shared by TunerStave's
// width-fit (Part 1, unconditional — the card must never run off the side)
// and TunerLevel's height-following geometry ("flex"/"flex-compact", Part 2).
export function useMeasuredSize<T extends Element>(): {
  readonly ref: React.RefObject<T | null>;
  readonly size: { readonly width: number; readonly height: number } | null;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{
    readonly width: number;
    readonly height: number;
  } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      const box = entry.contentBoxSize?.[0];
      setSize(
        box !== undefined
          ? { width: box.inlineSize, height: box.blockSize }
          : {
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
