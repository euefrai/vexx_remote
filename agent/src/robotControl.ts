import { mouse, Point, Button, keyboard, Key, screen } from '@nut-tree-fork/nut-js';

export async function moveMouse(deltaX: number, deltaY: number) {
  try {
    const currentPos = await mouse.getPosition();
    await mouse.setPosition(new Point(Math.round(currentPos.x + deltaX), Math.round(currentPos.y + deltaY)));
  } catch (e) {
    console.warn('moveMouse failed', e);
  }
}

export async function moveMouseAbsolute(x: number, y: number) {
  try {
    const w = await screen.width();
    const h = await screen.height();
    const targetX = Math.round(x * w);
    const targetY = Math.round(y * h);
    await mouse.setPosition(new Point(targetX, targetY));
  } catch (e) {
    console.warn('moveMouseAbsolute failed', e);
  }
}

export async function mouseToggle(down: string, button: 'left' | 'right' | 'middle') {
  try {
    let nutButton = Button.LEFT;
    if (button === 'right') nutButton = Button.RIGHT;
    if (button === 'middle') nutButton = Button.MIDDLE;

    if (down === 'down') {
      await mouse.pressButton(nutButton);
    } else {
      await mouse.releaseButton(nutButton);
    }
  } catch (e) {
    console.warn('mouseToggle failed', e);
  }
}

export async function click(button: 'left' | 'right') {
  try {
    let nutButton = Button.LEFT;
    if (button === 'right') nutButton = Button.RIGHT;
    await mouse.click(nutButton);
  } catch (e) {
    console.warn('click failed', e);
  }
}

export async function scroll(deltaX: number, deltaY: number) {
  try {
    if (deltaY > 0) {
      await mouse.scrollDown(deltaY);
    } else if (deltaY < 0) {
      await mouse.scrollUp(-deltaY);
    }
    if (deltaX > 0) {
      await mouse.scrollRight(deltaX);
    } else if (deltaX < 0) {
      await mouse.scrollLeft(-deltaX);
    }
  } catch (e) {
    console.warn('scroll failed', e);
  }
}

function normalizeKey(keyStr: string): Key | null {
  const map: Record<string, Key> = {
    'enter': Key.Enter,
    'backspace': Key.Backspace,
    'tab': Key.Tab,
    'escape': Key.Escape,
    'up': Key.Up,
    'down': Key.Down,
    'left': Key.Left,
    'right': Key.Right,
    'win': Key.LeftSuper,
    'delete': Key.Delete,
  };
  
  if (map[keyStr]) return map[keyStr];
  
  // single chars
  if (keyStr.length === 1) {
    const k = keyStr.toUpperCase();
    const keyEnum = (Key as any)[k];
    if (keyEnum !== undefined) return keyEnum;
  }
  return null;
}

export async function typeKeyboard(payload: { key: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean }) {
  try {
    const modifiers: Key[] = [];
    if (payload.ctrlKey) modifiers.push(Key.LeftControl);
    if (payload.altKey) modifiers.push(Key.LeftAlt);
    if (payload.shiftKey) modifiers.push(Key.LeftShift);
    if (payload.metaKey) modifiers.push(Key.LeftSuper);

    if (modifiers.length > 0) {
      await keyboard.pressKey(...modifiers);
    }

    const k = normalizeKey(payload.key);
    if (k !== null) {
      await keyboard.type(k);
    }

    if (modifiers.length > 0) {
      await keyboard.releaseKey(...modifiers);
    }
  } catch (e) {
    console.warn('typeKeyboard failed', e);
  }
}

export async function typeString(text: string) {
  try {
    await keyboard.type(text);
  } catch (e) {
    console.warn('typeString failed', e);
  }
}
