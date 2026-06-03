import sys
import time
import base64
import ctypes

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

def get_mouse_pos():
    pt = POINT()
    ctypes.windll.user32.GetCursorPos(ctypes.byref(pt))
    return pt.x, pt.y

try:
    import mss
    import cv2
    import numpy as np
except ImportError:
    sys.stderr.write("Missing dependencies: mss, cv2, numpy\n")
    sys.exit(1)

FPS = 30
QUALITY = 65
SCALE = 0.8
interval = 1.0 / FPS

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        
        while True:
            t0 = time.monotonic()
            
            try:
                raw = sct.grab(monitor)
                img = np.array(raw, dtype=np.uint8)[:, :, :3].copy()
                
                # Draw cursor
                mx, my = get_mouse_pos()
                mx -= monitor["left"]
                my -= monitor["top"]
                if 0 <= mx < img.shape[1] and 0 <= my < img.shape[0]:
                    # Draw a white arrow with black border
                    pts = np.array([[mx, my], [mx, my+15], [mx+4, my+11], [mx+9, my+18], [mx+12, my+16], [mx+7, my+10], [mx+12, my+10]], np.int32)
                    pts = pts.reshape((-1, 1, 2))
                    cv2.fillPoly(img, [pts], (255, 255, 255))
                    cv2.polylines(img, [pts], True, (0, 0, 0), 1)
                
                if SCALE < 1.0:
                    w = max(1, int(raw.width * SCALE))
                    h = max(1, int(raw.height * SCALE))
                    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_LINEAR)
                
                ok, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
                if ok:
                    b64_data = base64.b64encode(buf).decode('ascii')
                    # Write as a single line
                    sys.stdout.write(f"{b64_data}\n")
                    sys.stdout.flush()
            except Exception as e:
                sys.stderr.write(f"Capture error: {e}\n")
                
            elapsed = time.monotonic() - t0
            sleep_time = interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
