import { initEvaluator } from './evaluator';
import { calculateEquity, EquityInput, EquityResult } from './equity';

let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initEvaluator();
  }
  return initPromise;
}

self.addEventListener('message', async (event: MessageEvent<EquityInput>) => {
  try {
    await ensureInitialized();
    const result: EquityResult = calculateEquity(event.data);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
