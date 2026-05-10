"use client";

import type { ComponentType } from "react";
import type { RoomRow, PlayerRow } from "@/lib/engine/types";
import { getGameConfig } from "@/games/registry";
import { Dashboard } from "./Dashboard";

interface RoomPhaseRouterProps {
  room: RoomRow;
  players: PlayerRow[];
  currentPlayer: PlayerRow | null;
}

/**
 * Routes to the correct game-specific component based on current room phase.
 * Reads game_slug from room, looks up config from registry, renders component.
 * Also shows Dashboard alongside phase component when configured.
 */
export function RoomPhaseRouter({
  room,
  players,
  currentPlayer,
}: RoomPhaseRouterProps) {
  const gameConfig = getGameConfig(room.game_slug);

  if (!gameConfig) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-[var(--color-red)]">
          Unknown game: {room.game_slug}
        </p>
      </div>
    );
  }

  const phaseConfig = gameConfig.phases.find((p) => p.key === room.status);
  const props = { room, players, currentPlayer };

  // Determine which component to render for this phase
  let PhaseComponent: ComponentType<typeof props> | null = null;

  switch (room.status) {
    case "betting":
      PhaseComponent = gameConfig.components.BettingPhase || null;
      break;
    case "playing":
      PhaseComponent = gameConfig.components.PlayPhase || null;
      break;
    case "scoring":
      PhaseComponent = gameConfig.components.ScoreEntry;
      break;
    case "ended":
      PhaseComponent = gameConfig.components.GameEndScreen;
      break;
  }

  if (!PhaseComponent) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-[var(--color-muted)]">
          Waiting for game to start...
        </p>
      </div>
    );
  }

  // For ended phase, just show the game end screen
  if (room.status === "ended") {
    return <PhaseComponent {...props} />;
  }

  // For other phases, show with dashboard if configured
  const showDashboard = phaseConfig?.showDashboard ?? false;

  if (showDashboard) {
    return (
      <div className="min-h-dvh flex flex-col lg:flex-row">
        {/* Game phase component */}
        <div className="flex-1 lg:max-w-[55%]">
          <PhaseComponent {...props} />
        </div>
        {/* Dashboard sidebar */}
        <div className="lg:w-[45%] lg:border-l border-[var(--color-border)] overflow-y-auto lg:max-h-dvh">
          <Dashboard {...props} />
        </div>
      </div>
    );
  }

  return <PhaseComponent {...props} />;
}
