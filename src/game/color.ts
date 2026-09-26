/** 0xRRGGBB → "#rrggbb", for Phaser text styles. */
export function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
