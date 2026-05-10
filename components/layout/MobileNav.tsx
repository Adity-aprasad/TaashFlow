'use client'

import { useState } from 'react'
import { BarChart3, Users, Trophy, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileNavProps {
  activeTab: 'game' | 'scores' | 'players'
  onTabChange: (tab: 'game' | 'scores' | 'players') => void
}

/**
 * Mobile bottom navigation for switching between game, scores, and players views.
 * Only shown on mobile viewports during active games.
 */
export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-sm border-t border-[var(--color-border)] lg:hidden">
      <div className="flex items-center justify-around h-14">
        <button
          onClick={() => onTabChange('game')}
          className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors ${
            activeTab === 'game' ? 'text-[var(--color-gold)]' : 'text-[var(--color-muted)]'
          }`}
          aria-label="Game view"
        >
          <Menu size={18} />
          <span>Game</span>
        </button>
        <button
          onClick={() => onTabChange('scores')}
          className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors ${
            activeTab === 'scores' ? 'text-[var(--color-gold)]' : 'text-[var(--color-muted)]'
          }`}
          aria-label="Scores view"
        >
          <BarChart3 size={18} />
          <span>Scores</span>
        </button>
        <button
          onClick={() => onTabChange('players')}
          className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors ${
            activeTab === 'players' ? 'text-[var(--color-gold)]' : 'text-[var(--color-muted)]'
          }`}
          aria-label="Players view"
        >
          <Users size={18} />
          <span>Players</span>
        </button>
      </div>
    </nav>
  )
}