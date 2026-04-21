"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type FittingDimensions = {
  containerRef: RefObject<HTMLDivElement | null>;
  measureRef: RefObject<HTMLDivElement | null>;
  available: number;
  full: number;
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useFittingDimensions(): FittingDimensions {
  const [dimensions, setDimensions] = useState({ available: 0, full: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    if (!containerRef.current || !measureRef.current) {
      return;
    }

    const nextAvailable = Math.ceil(containerRef.current.getBoundingClientRect().height);
    const nextFull = Math.ceil(measureRef.current.getBoundingClientRect().height);

    setDimensions((previousDimensions) => {
      if (
        previousDimensions.available === nextAvailable &&
        previousDimensions.full === nextFull
      ) {
        return previousDimensions;
      }

      return {
        available: nextAvailable,
        full: nextFull,
      };
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    update();

    if (
      typeof ResizeObserver === "undefined" ||
      !containerRef.current ||
      !measureRef.current
    ) {
      return;
    }

    const observer = new ResizeObserver(update);

    observer.observe(containerRef.current);
    observer.observe(measureRef.current);

    return () => {
      observer.disconnect();
    };
  }, [update]);

  return {
    containerRef,
    measureRef,
    available: dimensions.available,
    full: dimensions.full,
  };
}
