export function BrandMark({
  size = 32,
  withName = true,
  tone = 'ink',
}: {
  size?: number;
  withName?: boolean;
  tone?: 'ink' | 'paper';
}) {
  const onInk = tone === 'paper';
  const plate = onInk ? '#f4efe6' : '#9a3412';
  const leaf = onInk ? '#1c1410' : '#f7f1e8';
  const spark = '#e8b86d';
  const type = onInk ? '#f4efe6' : '#1c1410';

  return (
    <span className="inline-flex items-center gap-2.5 leading-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="shrink-0"
        aria-hidden
      >
        <rect width="32" height="32" rx="9" fill={plate} />
        <path
          d="M10 22.2c.2-6.8 4.8-12.4 13.4-13.6-1.2 8.4-6.2 13.8-13.4 13.6Z"
          fill={leaf}
        />
        <path
          d="M11.6 21.2c3.1-2 6.6-6.2 8.4-11.6"
          fill="none"
          stroke={plate}
          strokeWidth="1.45"
          strokeLinecap="round"
        />
        <path
          d="M23.15 5.4 24.2 8.05 26.85 9.1 24.2 10.15 23.15 12.8 22.1 10.15 19.45 9.1 22.1 8.05Z"
          fill={spark}
        />
      </svg>
      {withName && (
        <span
          className="whitespace-nowrap font-display text-[1.05em] font-medium tracking-tight"
          style={{ color: type, fontSize: Math.max(14, Math.round(size * 0.58)) }}
        >
          NutriAI
        </span>
      )}
    </span>
  );
}
