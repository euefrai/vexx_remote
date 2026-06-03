import { forwardRef, useEffect, useRef } from "react";

interface Props {
  /** Live MediaStream from a WebRTC connection — takes precedence over imgUrl. */
  stream?:    MediaStream | null;
  connected:  boolean;
  isTransmitting?: boolean;
}

/**
 * Renders the desktop frame. Picks the right element based on the source:
 *
 *     stream  → <video> (WebRTC)
 *     socket  → <img>   (JPEG over WS / MJPEG updated directly via DOM Ref in parent)
 */
export const ScreenView = forwardRef<HTMLElement, Props>(function ScreenView(
  { stream, connected, isTransmitting },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream && v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    } else if (!stream && v.srcObject) {
      v.srcObject = null;
    }
  }, [stream]);

  // Forward whichever element is currently rendered.
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
  };
  const setImgRef = (el: HTMLImageElement | null) => {
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
  };

  if (stream) {
    return (
      <video
        ref={setVideoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full select-none object-contain"
      />
    );
  }

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      {!isTransmitting && (
        <div className="flex h-full w-full items-center justify-center text-sm text-text-secondary">
          {connected ? "Aguardando primeiro frame..." : "Conectando..."}
        </div>
      )}
      <img
        ref={setImgRef}
        alt="desktop"
        draggable={false}
        style={{ display: isTransmitting ? 'block' : 'none' }}
        className="h-full w-full select-none object-contain"
      />
    </div>
  );
});
