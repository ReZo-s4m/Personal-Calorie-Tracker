'use client';

import { Button } from '@/components/ui';
import { formatDateKey } from '@/lib/format';
import type { WeightLog } from '@/lib/types';
import { formatDeltaKg, formatKg } from './formatKg';

export function WeightHistory({
  readings,
  timeline,
  deletingId,
  onEdit,
  onDelete,
}: {
  readings: WeightLog[];
  timeline: WeightLog[];
  deletingId: string | null;
  onEdit: (row: WeightLog) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Weight (kg)</th>
            <th className="px-4 py-3 font-medium">Change</th>
            <th className="px-4 py-3 font-medium">Note</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((row, index) => {
            const timelineIndex = timeline.findIndex((item) => item.id === row.id);
            const older =
              timelineIndex >= 0 ? timeline[timelineIndex + 1] : readings[index + 1];
            const step = older ? row.kg - older.kg : null;

            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3.5 font-medium">{formatDateKey(row.loggedOn, 'd MMM yyyy')}</td>
                <td className="px-4 py-3.5 tabular-nums">{formatKg(row.kg)}</td>
                <td className="px-4 py-3.5 tabular-nums">
                  {step == null || Math.abs(step) < 0.05 ? (
                    <span className="text-subtle">—</span>
                  ) : (
                    <span className="text-accent">{formatDeltaKg(step)}</span>
                  )}
                </td>
                <td className="max-w-[16rem] truncate px-4 py-3.5 text-muted">{row.note || '—'}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1 text-xs"
                      onClick={() => onEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-1 text-xs"
                      isLoading={deletingId === row.id}
                      onClick={() => onDelete(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
