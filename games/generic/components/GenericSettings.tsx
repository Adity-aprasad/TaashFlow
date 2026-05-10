'use client'

import type { RoomSettingsProps } from '@/lib/engine/types'

/**
 * Generic tracker room creation settings panel.
 * Only option: optional target score (reference line on chart).
 */
export function GenericSettings({ settings, onChange }: RoomSettingsProps) {
  const targetScore = settings.target_score as { enabled: boolean; value: number } | undefined

  function toggleTarget(enabled: boolean) {
    onChange({
      ...settings,
      target_score: { ...targetScore, enabled, value: targetScore?.value || 100 },
    })
  }

  function updateTargetValue(value: number) {
    onChange({
      ...settings,
      target_score: { enabled: true, value },
    })
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={targetScore?.enabled || false}
            onChange={(e) => toggleTarget(e.target.checked)}
            className="w-5 h-5 accent-[var(--color-gold)] min-w-[20px]"
            aria-label="Enable target score"
          />
          <div>
            <p className="text-sm font-medium">Target Score</p>
            <p className="text-xs text-[var(--color-muted)]">Reference line on chart (cosmetic only)</p>
          </div>
        </label>
        {targetScore?.enabled && (
          <div className="mt-3 ml-8">
            <input
              type="number"
              min={1}
              max={10000}
              value={targetScore?.value || 100}
              onChange={(e) => updateTargetValue(Number(e.target.value))}
              className="w-24 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text)] text-sm"
              aria-label="Target score value"
            />
          </div>
        )}
      </div>
    </div>
  )
}