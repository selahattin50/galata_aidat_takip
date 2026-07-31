import { useCallback, useEffect, useRef, useState } from 'react';

export const useScrollReveal = <T extends HTMLElement>() => {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = (entry.target as HTMLElement).dataset.revealKey;
          if (!key) return;

          setVisibleKeys((current) => {
            const shouldBeVisible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
            const shouldReset = !entry.isIntersecting;

            if (!shouldBeVisible && !shouldReset) return current;
            if (shouldBeVisible === current.has(key)) return current;

            const next = new Set(current);
            if (shouldBeVisible) next.add(key);
            else next.delete(key);
            return next;
          });
        });
      },
      { rootMargin: '0px', threshold: [0, 0.1] }
    );

    elementsRef.current.forEach((element) => observerRef.current?.observe(element));

    return () => observerRef.current?.disconnect();
  }, []);

  const observe = useCallback(
    (key: string) => (node: T | null) => {
      const previous = elementsRef.current.get(key);
      if (previous) observerRef.current?.unobserve(previous);

      if (!node) {
        elementsRef.current.delete(key);
        return;
      }

      node.dataset.revealKey = key;
      elementsRef.current.set(key, node);
      observerRef.current?.observe(node);
    },
    []
  );

  return {
    observe,
    isVisible: useCallback((key: string) => visibleKeys.has(key), [visibleKeys]),
  };
};
