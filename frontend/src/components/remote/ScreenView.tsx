import { forwardRef, useEffect, useRef } from "react";

interface Props {
  /** Live MediaStream from a WebRTC connection — takes precedence over imgUrl. */
  stream?:    MediaStream | null;
  connected:  boolean;
  isTransmitting?: boolean;
  mousePos?: { x: number; y: number; w: number; h: number } | null;
}

/**
 * Renders the desktop frame. Picks the right element based on the source:
 *
 *     stream  → <video> (WebRTC)
 *     socket  → <img>   (JPEG over WS / MJPEG updated directly via DOM Ref in parent)
 */
export const ScreenView = forwardRef<HTMLElement, Props>(function ScreenView(
  { stream, connected, isTransmitting, mousePos },
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

  // To get the image's bounds:
  const getImgLayout = () => {
    const img = ref && 'current' in ref ? (ref.current as HTMLImageElement | null) : null;
    if (!img || !mousePos || mousePos.w === 0 || mousePos.h === 0) return null;

    const containerWidth = img.clientWidth;
    const containerHeight = img.clientHeight;
    const monitorRatio = mousePos.w / mousePos.h;
    const containerRatio = containerWidth / containerHeight;

    let width = containerWidth;
    let height = containerHeight;
    let left = 0;
    let top = 0;

    if (containerRatio > monitorRatio) {
      // Container is wider than the monitor -> height is 100%, width is limited
      width = containerHeight * monitorRatio;
      left = (containerWidth - width) / 2;
    } else {
      // Container is taller than the monitor -> width is 100%, height is limited
      height = containerWidth / monitorRatio;
      top = (containerHeight - height) / 2;
    }

    const cursorX = left + (mousePos.x / mousePos.w) * width;
    const cursorY = top + (mousePos.y / mousePos.h) * height;

    return { x: cursorX, y: cursorY };
  };

  const layout = getImgLayout();

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
      {isTransmitting && layout && (
        <svg
          style={{
            position: 'absolute',
            left: layout.x,
            top: layout.y,
            width: 16,
            height: 23,
            transform: 'translate(0px, 0px)', // Tip of arrow aligns with coordinate
            pointerEvents: 'none',
            zIndex: 100
          }}
          viewBox="0 0 14 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0V18.5L4.5 14L8 20L11 18L7.5 12.5H13L0 0Z"
            fill="white"
            stroke="black"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
});
