"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";

const DEFAULT_QUERY_DEBOUNCE_MS = 350;

interface DebouncedQueryStateOptions {
  wait?: number;
}

type SetQueryValue = (value: string | null) => void | Promise<unknown>;

export function useDebouncedQueryState(
  queryValue: string,
  setQueryValue: SetQueryValue,
  options: DebouncedQueryStateOptions = {}
) {
  const [inputValue, setInputValue] = useState(queryValue);
  const [debouncedValue] = useDebouncedValue(inputValue, {
    wait: options.wait ?? DEFAULT_QUERY_DEBOUNCE_MS,
  });

  useEffect(() => {
    setInputValue(queryValue);
  }, [queryValue]);

  useEffect(() => {
    if (debouncedValue !== inputValue) {
      return;
    }

    const nextValue = debouncedValue.trim();
    const currentValue = queryValue.trim();

    if (nextValue === currentValue) {
      return;
    }

    void setQueryValue(nextValue || null);
  }, [debouncedValue, inputValue, queryValue, setQueryValue]);

  return [inputValue, setInputValue] as const;
}
