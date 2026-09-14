export function formatKg(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function formatDeltaKg(value: number): string {
  if (Math.abs(value) < 0.05) {
    return '0';
  }

  return `${value > 0 ? '↑' : '↓'} ${formatKg(Math.abs(value))}`;
}
