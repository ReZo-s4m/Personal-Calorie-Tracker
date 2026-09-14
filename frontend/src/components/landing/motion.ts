export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeSoft = [0.25, 0.08, 0.25, 1] as const;

export const springSnappy = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };
export const springSoft = { type: 'spring' as const, stiffness: 180, damping: 24, mass: 0.8 };
export const springMagnet = { type: 'spring' as const, stiffness: 280, damping: 22, mass: 0.6 };

export const duration = {
  instant: 0.16,
  fast: 0.28,
  base: 0.45,
  enter: 0.55,
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
};

export const staggerShow = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

export function formatInt(value: number) {
  return Math.round(value).toLocaleString('en-US');
}
