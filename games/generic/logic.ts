/**
 * Generic score tracker logic.
 * Minimal — any integer score is valid, no complex rules.
 */

/**
 * Adds a round score to the cumulative total.
 * For generic tracker, this is simply addition.
 *
 * @param currentTotal - Current cumulative score
 * @param roundScore - Score for this round (can be negative)
 * @returns New cumulative score
 */
export function addRoundScore(currentTotal: number, roundScore: number): number {
  return currentTotal + roundScore
}

/**
 * Determines the winner(s) — highest cumulative score.
 *
 * @param scores - Array of { playerId, cumulativeScore }
 * @returns Array of winner player IDs
 */
export function determineWinners(
  scores: Array<{ playerId: string; cumulativeScore: number }>
): string[] {
  if (scores.length === 0) return []
  const maxScore = Math.max(...scores.map((s) => s.cumulativeScore))
  return scores
    .filter((s) => s.cumulativeScore === maxScore)
    .map((s) => s.playerId)
}