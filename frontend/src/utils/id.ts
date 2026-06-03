export function generateSessionCode() {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 36)
    .toString(36)
    .toUpperCase())
    .join('');
}
