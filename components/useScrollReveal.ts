import { useCallback, useEffect, useRef, useState } from 'react';

export const useScrollReveal = <T extends HTMLElement>() => {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set());
  const visibleKeysRef = useRef(visibleKeys);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    visibleKeysRef.current = visibleKeys;
  }, [visibleKeys]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = (entry.target as HTMLElement).dataset.revealKey;
          if (!entry.isIntersecting || !key || visibleKeysRef.current.has(key)) return;

          setVisibleKeys((current) => {
            if (current.has(key)) return current;
            const next = new Set(current);
            next.add(key);
            return next;
          });
          observerRef.current?.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
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
      if (!visibleKeysRef.current.has(key)) observerRef.current?.observe(node);
    },
    []
  );

  return {
    observe,
    isVisible: useCallback((key: string) => visibleKeys.has(key), [visibleKeys]),
  };
};
