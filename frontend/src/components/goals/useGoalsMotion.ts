'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

export function useGoalsMotion(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          gsap.set('[data-goals]', { clearProps: 'opacity,transform' });
        },
      });
      intro
        .fromTo(
          '[data-goals="compose"]',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, immediateRender: false },
        )
        .fromTo(
          '[data-goals="today"]',
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, immediateRender: false },
          0.18,
        )
        .fromTo(
          '[data-goals="history"]',
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, immediateRender: false },
          0.26,
        );
    }, el);

    return () => ctx.revert();
  }, [root]);
}
