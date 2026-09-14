'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function useIsCoarsePointer() {
  return useMediaQuery('(pointer: coarse)');
}

export function useIsTablet() {
  return useMediaQuery('(max-width: 1023px)');
}

export function useCountUp(target: number, active: boolean, durationMs = 820, reduce = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reduce) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, durationMs, reduce, target]);

  return value;
}

export function useTypedText(text: string, play: boolean, reduce = false, speed = 14) {
  const [output, setOutput] = useState(reduce ? text : '');

  useEffect(() => {
    if (!play) {
      setOutput('');
      return;
    }
    if (reduce) {
      setOutput(text);
      return;
    }

    setOutput('');
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setOutput(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(id);
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [play, reduce, speed, text]);

  return output;
}
