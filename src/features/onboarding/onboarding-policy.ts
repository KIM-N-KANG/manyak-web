export function shouldAutoStartTour(params: {
  seen: boolean;
  targetReady: boolean;
  alreadyStarted: boolean;
}): boolean {
  if (params.alreadyStarted) {
    return false;
  }

  if (!params.targetReady) {
    return false;
  }

  return !params.seen;
}
