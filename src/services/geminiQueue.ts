// Serialises all Gemini requests app-wide so they never fire simultaneously.
// Each call waits for the previous one to finish, then adds a 600ms gap.

let tail: Promise<void> = Promise.resolve();

export function enqueueGemini<T>(fn: () => Promise<T>): Promise<T> {
  const result = tail.then(() => fn());
  tail = result.then(
    () => new Promise(r => setTimeout(r, 600)),
    () => new Promise(r => setTimeout(r, 600)),
  ) as Promise<void>;
  return result;
}
