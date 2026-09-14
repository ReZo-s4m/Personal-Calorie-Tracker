'use client';

import { useEffect, type RefObject } from 'react';

export function useTodayMotion(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) {
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = [...el.querySelectorAll<HTMLElement>('[data-today]')];

    nodes.forEach((node, index) => {
      node.style.setProperty('--today-delay', `${reduce ? 0 : index * 45}ms`);
      node.classList.add('today-in');
    });

    const clear = () => {
      nodes.forEach((node) => {
        node.classList.remove('today-in');
        node.style.removeProperty('--today-delay');
      });
    };

    const timer = window.setTimeout(clear, reduce ? 0 : 900);
    return () => {
      window.clearTimeout(timer);
      clear();
    };
  }, [root]);
}
