import { useEffect, useRef, useState, useCallback } from 'react';
import { EquityInput, EquityResult } from '../engine/equity';

interface UseEquityResult {
  equity: number | null;
  loading: boolean;
  calculate: (input: EquityInput) => void;
}

export function useEquity(): UseEquityResult {
  const workerRef = useRef<Worker | null>(null);
  const [equity, setEquity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const worker = new Worker(
      new URL('../engine/equity.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: EquityResult; error?: string }>) => {
      if (e.data.ok && e.data.result) {
        setEquity(e.data.result.equity);
      }
      setLoading(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const calculate = useCallback((input: EquityInput) => {
    if (!workerRef.current) return;
    setLoading(true);
    workerRef.current.postMessage(input);
  }, []);

  return { equity, loading, calculate };
}
