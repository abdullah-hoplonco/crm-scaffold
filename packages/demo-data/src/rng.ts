/** Small deterministic PRNG so the demo story is the same on every reset. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
  digits(count: number): string;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error("pick() from empty list");
      return items[int(0, items.length - 1)] as T;
    },
    chance: (probability) => next() < probability,
    shuffle: <T>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
      }
      return copy;
    },
    digits: (count) => Array.from({ length: count }, () => String(int(0, 9))).join(""),
  };
}
