"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Share2, Crown, LogOut, X as XIcon } from "lucide-react";
import type { RoomRow, PlayerRow } from "@/lib/engine/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { leaveRoom, kickPlayer, touchRoom } from "@/lib/engine/room";
import { clearStoredRoomCode } from "@/lib/engine/session";
import { getGameConfig } from "@/games/registry";
import { getCardsPerPlayer } from "@/lib/utils";

interface LobbyProps {
  room: RoomRow;
  players: PlayerRow[];
  currentPlayer: PlayerRow | null;
}

/**
 * Pre-game lobby component.
 * Shows room code, player grid, ready states, settings summary.
 * Handles ready toggle, kick, force start, and auto-start countdown.
 */
export function Lobby({ room, players, currentPlayer }: LobbyProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = currentPlayer?.is_owner || false;
  const activePlayers = players.filter((p) => !p.is_spectator);
  const readyCount = activePlayers.filter((p) => p.is_ready).length;
  const readyPercent =
    activePlayers.length > 0 ? (readyCount / activePlayers.length) * 100 : 0;
  const gameConfig = getGameConfig(room.game_slug);

  // Auto-start countdown when >= 50% ready
  useEffect(() => {
    if (
      readyPercent >= 50 &&
      activePlayers.length >= (gameConfig?.minPlayers || 2)
    ) {
      setCountdown(5);
    } else {
      setCountdown(null);
    }
  }, [readyPercent, activePlayers.length]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleStartGame();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleReady() {
    if (!currentPlayer) return;
    const supabase = createBrowserClient();
    await supabase
      .from("players")
      .update({ is_ready: !currentPlayer.is_ready })
      .eq("id", currentPlayer.id);
  }

  async function handleStartGame() {
    if (!isOwner) return;
    const supabase = createBrowserClient();

    // Determine first phase based on game
    const firstStatus = room.game_slug === "takht" ? "betting" : "scoring";

    await supabase
      .from("rooms")
      .update({
        status: firstStatus,
        current_round: 1,
        last_activity: new Date().toISOString(),
      })
      .eq("id", room.id);

    // Create first round record for Takht
    if (room.game_slug === "takht") {
      const cardsPerPlayer = getCardsPerPlayer(activePlayers.length);
      await supabase.from("rounds").insert({
        room_id: room.id,
        round_number: 1,
        round_meta: {
          cards_per_player: cardsPerPlayer,
          betting_started_at: new Date().toISOString(),
        },
      });
    }

    // Initialize scores for all players
    for (const player of activePlayers) {
      await supabase.from("scores").upsert(
        {
          player_id: player.id,
          room_id: room.id,
          cumulative_score: 0,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "player_id,room_id" },
      );
    }
  }

  async function handleKick(playerId: string) {
    if (!currentPlayer) return;
    const supabase = createBrowserClient();
    await kickPlayer(supabase, playerId, room.id, currentPlayer.auth_id);
  }

  async function handleLeave() {
    if (!currentPlayer) return;
    const supabase = createBrowserClient();
    await leaveRoom(supabase, currentPlayer.id, room.id);
    clearStoredRoomCode();
    router.push("/");
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    const url = `${window.location.origin}/room/${room.code}`;
    if (navigator.share) {
      await navigator.share({ title: "Join my Takht room", url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Room Code */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <p className="text-sm text-[var(--color-muted)] uppercase tracking-wide">
            Room Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-4xl font-mono font-bold tracking-[0.3em] text-[var(--color-gold)]">
              {room.code}
            </h2>
            <button
              onClick={handleCopyCode}
              className="p-2 text-[var(--color-muted)] hover:text-[var(--color-gold)] transition-colors"
              aria-label="Copy room code"
            >
              <Copy size={20} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-[var(--color-muted)] hover:text-[var(--color-gold)] transition-colors"
              aria-label="Share room link"
            >
              <Share2 size={20} />
            </button>
          </div>
          {copied && (
            <p className="text-xs text-[var(--color-green)]">Copied!</p>
          )}
          <p className="text-sm text-[var(--color-muted)]">
            {gameConfig?.icon} {gameConfig?.name} • {room.max_players} max
            players
          </p>
        </motion.div>

        {/* Countdown */}
        {countdown !== null && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center p-4 bg-[var(--color-gold)]/10 border border-[var(--color-gold-dim)] rounded-[var(--radius-lg)]"
          >
            <p className="text-lg font-bold text-[var(--color-gold)]">
              Starting in {countdown}...
            </p>
          </motion.div>
        )}

        {/* Ready progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>
              {readyCount} / {activePlayers.length} ready
            </span>
            <span>{Math.round(readyPercent)}%</span>
          </div>
          <div className="h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--color-gold)] rounded-full"
              animate={{ width: `${readyPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Player Grid */}
        <div className="space-y-2">
          {activePlayers.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border ${
                player.is_ready
                  ? "bg-[var(--color-green)]/10 border-[var(--color-green)]/30"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)]"
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: player.avatar_color }}
              >
                {player.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{player.display_name}</p>
                  {player.is_owner && (
                    <Crown
                      size={14}
                      className="text-[var(--color-gold)] shrink-0"
                    />
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  {player.is_ready ? "✓ Ready" : "Not ready"}
                </p>
              </div>
              {isOwner && !player.is_owner && (
                <button
                  onClick={() => handleKick(player.id)}
                  className="p-2 text-[var(--color-muted)] hover:text-[var(--color-red)] transition-colors"
                  aria-label={`Kick ${player.display_name}`}
                >
                  <XIcon size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentPlayer && !currentPlayer.is_owner && (
            <button
              onClick={handleReady}
              className={`flex-1 py-3 rounded-[var(--radius-md)] font-semibold transition-all ${
                currentPlayer.is_ready
                  ? "bg-[var(--color-green)] text-white"
                  : "bg-[var(--color-gold)] text-[var(--color-bg)]"
              }`}
            >
              {currentPlayer.is_ready ? "✓ Ready" : "Ready Up"}
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleStartGame}
              disabled={activePlayers.length < (gameConfig?.minPlayers || 2)}
              className="flex-1 py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Force Start
            </button>
          )}
          <button
            onClick={handleLeave}
            className="py-3 px-4 border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] transition-colors"
            aria-label="Leave room"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Settings Summary */}
        <details className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
          <summary className="text-sm font-medium text-[var(--color-muted)] cursor-pointer">
            Room Settings
          </summary>
          <div className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
            <p>Game: {gameConfig?.name}</p>
            <p>Max Players: {room.max_players}</p>
            <p>
              Mode:{" "}
              {room.permission_mode === "owner"
                ? "Host Controls"
                : "Each Player"}
            </p>
            {room.game_slug === "takht" && (
              <>
                <p>
                  Zero Bet Value:{" "}
                  {((room.game_settings as Record<string, unknown>)
                    .zero_bet_value as number) || 150}
                </p>
                <p>
                  Cards per player: {getCardsPerPlayer(activePlayers.length)}{" "}
                  (with {activePlayers.length} players)
                </p>
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
