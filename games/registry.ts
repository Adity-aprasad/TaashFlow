import { takhtGame } from './takht/config'
import { genericGame } from './generic/config'
import type { GameConfig } from '@/lib/engine/types'

export const GAME_REGISTRY: Record<string, GameConfig> = {
  takht: takhtGame,
  generic: genericGame,
}

export type GameSlug = keyof typeof GAME_REGISTRY

export function getGameConfig(slug: string): GameConfig | undefined {
  return GAME_REGISTRY[slug]
}

export function getAllGames(): GameConfig[] {
  return Object.values(GAME_REGISTRY)
}