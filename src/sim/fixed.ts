// Integer math helpers. Game state never holds floats: positions, HP, resources are all integers,
// so every machine computes bit-identical results and replays never drift.

/** World units per map tile. Positions are integer world units. */
export const TILE = 1000;

/** Fixed-point scale for resources: 1 Data = 1000 milli-data. */
export const MILLI = 1000;

/** Integer division truncating toward zero (IEEE division is exact-rounded, so this is deterministic). */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Exact integer square root: largest x with x*x <= n. */
export function isqrt(n: number): number {
  if (n < 0) throw new RangeError('isqrt of negative number');
  if (n < 2) return n;
  let x = Math.floor(Math.sqrt(n));
  while (x * x > n) x--;
  while ((x + 1) * (x + 1) <= n) x++;
  return x;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function within(ax: number, ay: number, bx: number, by: number, range: number): boolean {
  return dist2(ax, ay, bx, by) <= range * range;
}

/** Move from (x, y) toward (tx, ty) by at most `speed` world units. Returns the new position. */
export function stepToward(x: number, y: number, tx: number, ty: number, speed: number): [number, number] {
  const dx = tx - x;
  const dy = ty - y;
  const d = isqrt(dx * dx + dy * dy);
  if (d <= speed) return [tx, ty];
  return [x + idiv(dx * speed, d), y + idiv(dy * speed, d)];
}

/** Apply a percentage (integer) to an integer value, truncating. */
export function pct(value: number, percent: number): number {
  return idiv(value * percent, 100);
}
