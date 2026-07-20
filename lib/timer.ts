export function formatTimerMessage(currentTime: string, elapsedSeconds: number): string {
  return `${currentTime}, ${elapsedSeconds}s`;
}

export function formatElapsedSeconds(startMs: number, stopMs: number): number {
  return Math.round((stopMs - startMs) / 1000);
}
