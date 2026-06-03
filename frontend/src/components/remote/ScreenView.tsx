import { forwardRef, useEffect, useRef, useState } from "react";
import { getSocket } from "../../services/socketService";

interface Props {
  /** Live MediaStream from a WebRTC connection — takes precedence over imgUrl. */
  stream?:    MediaStream | null;
  connected:  boolean;
  onFrameReceived?: () => void;
}

/**
 * Renders the desktop frame. Picks the right element based on the source:
 *
 *     stream  → <video> (WebRTC)
 *     socket  → <img>   (JPEG over WS / MJPEG updated directly via DOM Ref)
 *
 * The forwarded ref always points at the rendered media element so
 * TouchController can read its bounding rect. Letterbox is browser-
 * managed via `object-contain`.
 */
export const ScreenView = forwardRef<HTMLElement, Props>(function ScreenView(
  { stream, connected, onFrameReceived },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    if (stream) return;

    const socket = getSocket();
    const handleFrame = (base64Frame: string) => {
      if (imgRef.current) {
        imgRef.current.src = `data:image/jpeg;base64,${base64Frame}`;
        if (!hasFrame) {
          setHasFrame(true);
          if (onFrameReceived) {
            onFrameReceived();
          }
        }
      }
    };

    socket.on('screen_frame', handleFrame);
    return () => {
      socket.off('screen_frame', handleFrame);
    };
  }, [stream, hasFrame, onFrameReceived]);

  useEffect(() => {
    if (!connected) {
      setHasFrame(false);
    }
  }, [connected]);

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
    imgRef.current = el;
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
      {!hasFrame && (
        <div className="flex h-full w-full items-center justify-center text-sm text-text-secondary">
          {connected ? "Aguardando primeiro frame..." : "Conectando..."}
        </div>
      )}
      <img
        ref={setImgRef}
        alt="desktop"
        draggable={false}
        style={{ display: hasFrame ? 'block' : 'none' }}
        className="h-full w-full select-none object-contain"
      />
    </div>
  );
});
