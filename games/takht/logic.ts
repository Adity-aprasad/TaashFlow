export function calculateRoundPoints(
  bet: number,
  actual: number,
  zeroBetValue: number = 150
): number {
  if (bet === 0) {
    return actual === 0 ? zeroBetValue : -zeroBetValue
  }
  if (actual === bet) {
    return bet * 10
  }
  if (actual > bet) {
    return (bet * 10) + ((actual - bet) * 1)
  }
  return -(bet * 10)
}

export function validateHandsSum(
  actualHands: number[],
  cardsPerPlayer: number
): boolean {
  const sum = actualHands.reduce((acc, h) => acc + h, 0)
  return sum === cardsPerPlayer
}

export function checkWinningThreshold(
  scores: Array<{ playerId: string; cumulativeScore: number }>,
  threshold: number
): string[] {
  return scores
    .filter((s) => s.cumulativeScore >= threshold)
    .sort((a, b) => b.cumulativeScore - a.cumulativeScore)
    .map((s) => s.playerId)
}

export function checkElimination(
  scores: Array<{ playerId: string; cumulativeScore: number }>,
  eliminationFloor: number
): string[] {
  return scores
    .filter((s) => s.cumulativeScore <= eliminationFloor)
    .map((s) => s.playerId)
}

export function determineWinners(
  scores: Array<{ playerId: string; cumulativeScore: number }>
): string[] {
  if (scores.length === 0) return []
  const maxScore = Math.max(...scores.map((s) => s.cumulativeScore))
  return scores
    .filter((s) => s.cumulativeScore === maxScore)
    .map((s) => s.playerId)
}

export function isFinalRound(currentRound: number, roundLimit: number): boolean {
  return currentRound >= roundLimit
}

export function getMinBet(
  currentRound: number,
  gameSettings: Record<string, unknown>
): number {
  const optionalRules = gameSettings.optional_rules as Record<string, { enabled: boolean; value?: number }> | undefined
  if (!optionalRules) return 0

  const roundLimit = optionalRules.round_limit
  const noZeroFinal = optionalRules.no_zero_final

  if (
    roundLimit?.enabled &&
    noZeroFinal?.enabled &&
    currentRound >= (roundLimit.value || 10)
  ) {
    return 1
  }
  return 0
}