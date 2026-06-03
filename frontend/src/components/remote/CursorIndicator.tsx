"use client";

import { RefObject, useEffect, useState } from "react";

interface Props {
  /** Element holding the rendered frame (img/video). Used for letterbox math. */
  mediaRef: RefObject<HTMLElement | null>;
  /** Normalized cursor position (0..1), or null to hide. */
  pos:      { x: number; y: number } | null;
  screenW:  number;
  screenH:  number;
}

/**
 * Visual ring that shows where the next click would land. Coordinates come
 * from the local touch stream, mapped through the same letterbox math the
 * input pipeline uses, so the ring lines up with the actual cursor target.
 *
 * Pure DOM overlay — never blocks input (pointer-events: none).
 */
export function CursorIndicator({ mediaRef, pos, screenW, screenH }: Props) {
  const [px, setPx] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!pos) { setPx(null); return; }
    const el = mediaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    // Reverse the letterbox: place the ring inside the visible image area.
    const rectAR = r.width / r.height;
    const imgAR  = screenW / screenH;
    let iw = r.width, ih = r.height, ox = 0, oy = 0;
    if (rectAR > imgAR) {
      iw = r.height * imgAR;
      ox = (r.width - iw) / 2;
    } else if (rectAR < imgAR) {
      ih = r.width / imgAR;
      oy = (r.height - ih) / 2;
    }
    setPx({
      left: r.left + ox + pos.x * iw,
      top:  r.top  + oy + pos.y * ih,
    });
  }, [pos, mediaRef, screenW, screenH]);

  if (!px) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-30"
      style={{
        left: px.left, top: px.top,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="h-7 w-7 rounded-full border-2 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
      <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300" />
    </div>
  );
}
