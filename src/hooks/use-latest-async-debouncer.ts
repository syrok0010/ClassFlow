"use client";

import { useCallback, useMemo, useRef } from "react";
import { useAsyncDebouncer } from "@tanstack/react-pacer";

const DEFAULT_ASYNC_DEBOUNCE_MS = 350;

interface LatestAsyncDebouncerOptions<TArgs extends unknown[], TResult> {
  wait?: number;
  onSuccess?: (result: TResult, args: TArgs) => void;
  onError?: (error: unknown, args: TArgs) => void;
}

export function useLatestAsyncDebouncer<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: LatestAsyncDebouncerOptions<TArgs, TResult> = {}
) {
  const requestIdRef = useRef(0);

  const debouncer = useAsyncDebouncer(
    async (requestId: number, args: TArgs) => {
      try {
        const result = await fn(...args);

        if (requestId === requestIdRef.current) {
          options.onSuccess?.(result, args);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          options.onError?.(error, args);
        }
      }
    },
    {
      wait: options.wait ?? DEFAULT_ASYNC_DEBOUNCE_MS,
    },
    (state) => ({
      isExecuting: state.isExecuting,
      isPending: state.isPending,
    })
  );

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    debouncer.cancel();
  }, [debouncer]);

  const execute = useCallback(
    (...args: TArgs) => {
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;
      void debouncer.maybeExecute(requestId, args);
    },
    [debouncer]
  );

  return useMemo(
    () => ({
      cancel,
      execute,
      isExecuting: debouncer.state.isExecuting,
      isPending: debouncer.state.isPending,
      isRunning: debouncer.state.isPending || debouncer.state.isExecuting,
    }),
    [
      cancel,
      debouncer.state.isExecuting,
      debouncer.state.isPending,
      execute,
    ]
  );
}
