'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { formatCalories, formatDateKey, formatGrams } from '@/lib/format';
import type { Goal } from '@/lib/types';

export function GoalsHero({
  firstName,
  goal,
  todayCalories,
}: {
  firstName: string;
  goal: Goal | null;
  todayCalories: number | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const used = goal && todayCalories != null ? Math.min(1, todayCalories / goal.dailyCalories) : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      return;
    }

    void video.play().catch(() => {});

    const drift = gsap.to(video, {
      scale: 1.06,
      duration: 18,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    return () => {
      drift.kill();
    };
  }, []);

  return (
    <aside
      data-goals="hero"
      className="relative min-h-[14rem] overflow-hidden rounded-xl border border-border bg-white xl:min-h-[36rem] xl:sticky xl:top-6"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full origin-center object-cover object-[70%_18%] opacity-30"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src="/brand/goals-run.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-white/70" />

      <div className="relative z-10 flex min-h-[14rem] flex-col justify-between px-5 py-5 xl:min-h-[36rem] xl:py-6">
        <div>
          <p className="kicker">Current goal</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground xl:text-[1.7rem]">
            {goal
              ? firstName
                ? `${firstName}, this is today’s target.`
                : 'This is today’s target.'
              : 'Set a daily calorie and macro target.'}
          </h2>
          {goal && (
            <p className="mt-2 text-xs text-muted">
              In force since {formatDateKey(goal.effectiveFrom, 'd MMM yyyy')}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-muted">Daily energy</p>
          {goal ? (
            <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums text-foreground">
              {formatCalories(goal.dailyCalories)}
              <span className="ml-2 text-sm font-medium text-subtle">kcal</span>
            </p>
          ) : (
            <p className="mt-1 text-xl font-medium text-muted">Not set yet</p>
          )}

          {used != null && (
            <div className="mt-4">
              <p className="text-xs text-muted">Used today {Math.round(used * 100)}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div className="h-full rounded-full bg-accent" style={{ width: `${used * 100}%` }} />
              </div>
            </div>
          )}

          {goal && (
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <HeroStat label="Protein" value={`${formatGrams(goal.proteinGrams)} g`} />
              <HeroStat label="Carbs" value={`${formatGrams(goal.carbGrams)} g`} />
              <HeroStat label="Fat" value={`${formatGrams(goal.fatGrams)} g`} />
              {goal.targetWeightKg != null && (
                <HeroStat label="Weight" value={`${goal.targetWeightKg} kg`} />
              )}
            </dl>
          )}
        </div>
      </div>
    </aside>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
