"use client";

import { RefObject, useEffect, useRef } from "react";

export type RemoteInputEvent =
  | { type: "move";     deltaX: number; deltaY: number }
  | { type: "click";    button: "left" | "right" | "middle" }
  | { type: "down";     button: "left" }
  | { type: "up";       button: "left" }
  | { type: "scroll";   deltaX: number; deltaY: number };

interface Props {
  imgRef:   RefObject<HTMLImageElement | null>;
  screenW:  number;
  screenH:  number;
  onInput:  (event: RemoteInputEvent) => void;
}

export function TouchController({ imgRef, screenW, screenH, onInput }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const pointersRef = useRef<
    Map<number, { lx: number; ly: number; sx: number; sy: number; t0: number; maxDist: number }>
  >(new Map());
  const draggingRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const SENSITIVITY_MOUSE = 2.0;
    const SENSITIVITY_SCROLL = 3.5;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      try { overlay.setPointerCapture(e.pointerId); } catch {}
      
      pointersRef.current.set(e.pointerId, {
        lx: e.clientX, ly: e.clientY,
        sx: e.clientX, sy: e.clientY,
        t0: performance.now(),
        maxDist: 0,
      });

      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = pointersRef.current.get(e.pointerId);
      if (!pt) return;

      const dx = e.clientX - pt.lx;
      const dy = e.clientY - pt.ly;
      pt.lx = e.clientX;
      pt.ly = e.clientY;

      const distFromStart = Math.hypot(e.clientX - pt.sx, e.clientY - pt.sy);
      pt.maxDist = Math.max(pt.maxDist, distFromStart);

      const numPointers = pointersRef.current.size;

      if (numPointers === 1) {
        // Drag detection for Left Click hold (must hold still for 400ms)
        const dt = performance.now() - pt.t0;

        if (!draggingRef.current && dt > 400 && pt.maxDist < 10) {
          draggingRef.current = true;
          onInput({ type: "down", button: "left" });
          // Optional: Could trigger vibration here: navigator.vibrate?.(50)
        }

        if (dx !== 0 || dy !== 0) {
          onInput({ type: "move", deltaX: dx * SENSITIVITY_MOUSE, deltaY: dy * SENSITIVITY_MOUSE });
        }
      } else if (numPointers === 2) {
        // 2-finger scroll
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          onInput({ type: "scroll", deltaX: dx * SENSITIVITY_SCROLL, deltaY: dy * SENSITIVITY_SCROLL });
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const pt = pointersRef.current.get(e.pointerId);
      const numPointers = pointersRef.current.size;
      pointersRef.current.delete(e.pointerId);
      try { overlay.releasePointerCapture(e.pointerId); } catch {}

      if (!pt) return;

      if (draggingRef.current && pointersRef.current.size === 0) {
        draggingRef.current = false;
        onInput({ type: "up", button: "left" });
        return;
      }

      const dt = performance.now() - pt.t0;
      const dist = Math.hypot(e.clientX - pt.sx, e.clientY - pt.sy);

      // Tap detection (quick, very little movement during the whole touch)
      if (dt < 250 && pt.maxDist < 15) {
        if (numPointers === 1 && pointersRef.current.size === 0) {
          // Wait briefly in case it's a double tap or multi-finger tap sequence
          clickTimerRef.current = window.setTimeout(() => {
            onInput({ type: "click", button: "left" });
          }, 50);
        } else if (numPointers === 2) {
          // 2-finger tap -> Right Click
          onInput({ type: "click", button: "right" });
        } else if (numPointers === 3) {
          // 3-finger tap -> Middle Click
          onInput({ type: "click", button: "middle" });
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    overlay.addEventListener("pointerdown",   onPointerDown);
    overlay.addEventListener("pointermove",   onPointerMove);
    overlay.addEventListener("pointerup",     onPointerUp);
    overlay.addEventListener("pointercancel", onPointerUp);
    overlay.addEventListener("contextmenu",   onContextMenu);

    return () => {
      overlay.removeEventListener("pointerdown",   onPointerDown);
      overlay.removeEventListener("pointermove",   onPointerMove);
      overlay.removeEventListener("pointerup",     onPointerUp);
      overlay.removeEventListener("pointercancel", onPointerUp);
      overlay.removeEventListener("contextmenu",   onContextMenu);
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    };
  }, [imgRef, screenW, screenH, onInput]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10"
      style={{ touchAction: "none" }}
    />
  );
}
