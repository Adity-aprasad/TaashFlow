import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatScore(score: number): string {
  if (score > 0) return `+${score}`
  return String(score)
}

export function getRandomAvatarColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F1948A', '#82E0AA',
    '#F8C471', '#AED6F1', '#D2B4DE', '#A3E4D7',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function getCardsPerPlayer(playerCount: number): number {
  return Math.floor(52 / playerCount)
}