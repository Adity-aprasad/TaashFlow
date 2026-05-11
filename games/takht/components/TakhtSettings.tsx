import type { RoomSettingsProps } from '@/lib/engine/types'

/**
 * Takht-specific room creation settings panel.
 * Allows configuring zero-bet value and optional rules.
 */
export function TakhtSettings({ settings, onChange }: RoomSettingsProps) {
  const zeroBetValue = (settings.zero_bet_value as number) || 150
  const optionalRules = (settings.optional_rules as Record<string, { enabled: boolean; value?: number }>) || {}

  function updateZeroBet(value: number) {
    onChange({ ...settings, zero_bet_value: value })
  }

  function toggleRule(key: string, enabled: boolean) {
    const current = optionalRules[key] || { enabled: false }
    const updated = { ...optionalRules, [key]: { ...current, enabled } }
    onChange({ ...settings, optional_rules: updated })
  }

  function updateRuleValue(key: string, value: number) {
    const current = optionalRules[key] || { enabled: true }
    const updated = { ...optionalRules, [key]: { ...current, value } }
    onChange({ ...settings, optional_rules: updated })
  }

  return (
    <div className="space-y-6">
      {/* Zero Bet Value */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-text)]">
          Zero-Bet Point Value
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={zeroBetValue}
            onChange={(e) => updateZeroBet(Number(e.target.value))}
            className="flex-1 accent-[var(--color-gold)]"
            aria-label="Zero bet point value"
          />
          <span className="text-[var(--color-gold)] font-semibold w-12 text-right">
            {zeroBetValue}
          </span>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Points awarded/deducted for betting zero
        </p>
      </div>

      {/* Optional Rules */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[var(--color-text)]">Optional Rules</h4>

        {/* Winning Threshold */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={optionalRules.winning_threshold?.enabled || false}
              onChange={(e) => toggleRule('winning_threshold', e.target.checked)}
              className="w-5 h-5 accent-[var(--color-gold)] min-w-[20px]"
              aria-label="Enable winning score threshold"
            />
            <div>
              <p className="text-sm font-medium">Winning Score Threshold</p>
              <p className="text-xs text-[var(--color-muted)]">Game ends when a player reaches target</p>
            </div>
          </label>
          {optionalRules.winning_threshold?.enabled && (
            <div className="mt-3 ml-8">
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={optionalRules.winning_threshold?.value || 500}
                onChange={(e) => updateRuleValue('winning_threshold', Number(e.target.value))}
                className="w-24 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text)] text-sm"
                aria-label="Winning threshold value"
              />
            </div>
          )}
        </div>

        {/* Elimination Score */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={optionalRules.elimination_score?.enabled || false}
              onChange={(e) => toggleRule('elimination_score', e.target.checked)}
              className="w-5 h-5 accent-[var(--color-gold)] min-w-[20px]"
              aria-label="Enable elimination score"
            />
            <div>
              <p className="text-sm font-medium">Elimination Score</p>
              <p className="text-xs text-[var(--color-muted)]">Players at or below this are eliminated</p>
            </div>
          </label>
          {optionalRules.elimination_score?.enabled && (
            <div className="mt-3 ml-8">
              <input
                type="number"
                min={-5000}
                max={-50}
                step={50}
                value={optionalRules.elimination_score?.value || -500}
                onChange={(e) => updateRuleValue('elimination_score', Number(e.target.value))}
                className="w-24 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text)] text-sm"
                aria-label="Elimination floor value"
              />
            </div>
          )}
        </div>

        {/* Round Limit */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={optionalRules.round_limit?.enabled || false}
              onChange={(e) => toggleRule('round_limit', e.target.checked)}
              className="w-5 h-5 accent-[var(--color-gold)] min-w-[20px]"
              aria-label="Enable round limit"
            />
            <div>
              <p className="text-sm font-medium">Round Limit</p>
              <p className="text-xs text-[var(--color-muted)]">Game ends after N rounds</p>
            </div>
          </label>
          {optionalRules.round_limit?.enabled && (
            <div className="mt-3 ml-8">
              <input
                type="number"
                min={3}
                max={50}
                value={optionalRules.round_limit?.value || 10}
                onChange={(e) => updateRuleValue('round_limit', Number(e.target.value))}
                className="w-20 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text)] text-sm"
                aria-label="Max rounds value"
              />
            </div>
          )}
        </div>

        {/* No-Zero Final Round */}
        {optionalRules.round_limit?.enabled && (
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={optionalRules.no_zero_final?.enabled || false}
                onChange={(e) => toggleRule('no_zero_final', e.target.checked)}
                className="w-5 h-5 accent-[var(--color-gold)] min-w-[20px]"
                aria-label="Enable no-zero final round"
              />
              <div>
                <p className="text-sm font-medium">No-Zero Final Round</p>
                <p className="text-xs text-[var(--color-muted)]">Betting 0 blocked in the last round</p>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}