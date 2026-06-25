const COOLING_MS = 30_000;

export function impressionKey(input: {
  screen: string;
  object: string;
  itemId: string | number;
}): string {
  return `${input.screen}|${input.object}|${input.itemId}`;
}

export function shouldEmitImpression(
  lastEmittedAt: number | undefined,
  now: number,
  coolingMs: number = COOLING_MS,
): boolean {
  if (lastEmittedAt === undefined) return true;

  return now - lastEmittedAt >= coolingMs;
}
