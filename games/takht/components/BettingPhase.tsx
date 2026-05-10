"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GamePhaseProps } from "@/lib/engine/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { getCardsPerPlayer } from "@/lib/utils";
import { getMinBet } from "../logic";

// ─────────────────────────────────────────────────────────────────────────────
// Increase this to give players more time. 5 s was unrealistically short.
// The value is read by ALL clients from the DB timestamp, so it stays in sync.
// ─────────────────────────────────────────────────────────────────────────────
const BETTING_DURATION_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Single source-of-truth channel name used for BOTH subscribe AND send.
// Previously doLockBet sent on `room:${code}` while listeners used
// `betting-${code}-${round}` — causing all broadcasts to be dropped.
// ─────────────────────────────────────────────────────────────────────────────
function bettingChannel(code: string, round: number) {
  return `betting-${code}-${round}`;
}

export function BettingPhase({ room, players, currentPlayer }: GamePhaseProps) {
  const [bet, setBet] = useState(0);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BETTING_DURATION_MS);
  const [revealed, setRevealed] = useState(false);
  const [allBets, setAllBets] = useState<
    Array<{ player_id: string; amount: number }>
  >([]);
  const [lockedPlayers, setLockedPlayers] = useState<Set<string>>(new Set());

  // ── Refs keep stale-closure values current inside setInterval / setTimeout ──
  const lockedRef = useRef(false);
  const betRef = useRef(0);
  const isActiveRef = useRef(false);
  const revealedRef = useRef(false); // prevents double-reveal
  // Shared channel ref so doLockBet and revealBets can send on the SAME
  // already-subscribed channel instead of spinning up throwaway channels.
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createBrowserClient>["channel"]
  > | null>(null);

  const activePlayers = players.filter(
    (p) => !p.is_spectator && !p.is_eliminated,
  );
  const cardsPerPlayer = getCardsPerPlayer(activePlayers.length);
  const minBet = getMinBet(room.current_round, room.game_settings);
  const maxBet = cardsPerPlayer;
  const isActive = !!(
    currentPlayer &&
    !currentPlayer.is_spectator &&
    !currentPlayer.is_eliminated
  );
  const isOwner = currentPlayer?.is_owner ?? false;

  // ── Keep refs in sync with latest render values ───────────────────────────
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  useEffect(() => {
    betRef.current = bet;
  }, [bet]);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  // ── Clamp bet to minBet on first mount / when rules change ────────────────
  useEffect(() => {
    setBet((prev) => Math.max(prev, minBet));
  }, [minBet]);

  // ── Subscribe to the betting channel (broadcast events) ───────────────────
  // FIX: channel name is now consistent — same one used in doLockBet/revealBets
  useEffect(() => {
    const supabase = createBrowserClient();
    const name = bettingChannel(room.code, room.current_round);

    const channel = supabase
      .channel(name)
      .on("broadcast", { event: "bet:locked" }, (payload) => {
        const data = payload.payload as { player_id: string };
        setLockedPlayers((prev) => new Set([...prev, data.player_id]));
      })
      .on("broadcast", { event: "phase:reveal_bets" }, (payload) => {
        const data = payload.payload as {
          bets: Array<{ player_id: string; amount: number }>;
        };
        setAllBets(data.bets);
        setRevealed(true);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room.code, room.current_round]);

  // ── Server-synced countdown timer ─────────────────────────────────────────
  // FIX: reads betting_started_at from the DB round record so that every
  // client — including late joiners and refreshes — counts from the same origin.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function initTimer() {
      const supabase = createBrowserClient();
      const { data: roundData } = await supabase
        .from("rounds")
        .select("round_meta")
        .eq("room_id", room.id)
        .eq("round_number", room.current_round)
        .single();

      const meta = (roundData?.round_meta ?? {}) as Record<string, unknown>;
      const serverStart = meta.betting_started_at
        ? new Date(meta.betting_started_at as string).getTime()
        : Date.now();

      interval = setInterval(() => {
        const elapsed = Date.now() - serverStart;
        const remaining = Math.max(0, BETTING_DURATION_MS - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          // Auto-lock with current bet value if player hasn't locked yet
          if (!lockedRef.current && isActiveRef.current) {
            doLockBet();
          }
        }
      }, 50);
    }

    initTimer();
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.current_round]);
  // doLockBet intentionally omitted — it is stable via useCallback and
  // including it would cause the timer to restart on every lock.

  // ── Auto-reveal when ALL players have locked (owner only triggers this) ───
  // FIX: this is the missing logic — phase:reveal_bets was never sent before.
  // Only the owner broadcasts to prevent N simultaneous DB reads + broadcasts.
  useEffect(() => {
    if (!isOwner || revealedRef.current || activePlayers.length === 0) return;

    const allLocked = activePlayers.every(
      (p) => lockedPlayers.has(p.id) || (p.id === currentPlayer?.id && locked),
    );

    if (allLocked) {
      triggerReveal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedPlayers, locked]);

  // ── Fetch all bets from DB and broadcast reveal ───────────────────────────
  const triggerReveal = useCallback(async () => {
    if (revealedRef.current || !channelRef.current) return;
    revealedRef.current = true; // prevent double-fire

    const supabase = createBrowserClient();

    const { data: roundData } = await supabase
      .from("rounds")
      .select("id")
      .eq("room_id", room.id)
      .eq("round_number", room.current_round)
      .single();

    if (!roundData) return;

    const { data: betsData } = await supabase
      .from("bets")
      .select("player_id, bet_amount")
      .eq("round_id", roundData.id);

    if (!betsData) return;

    const bets = betsData.map((b) => ({
      player_id: b.player_id,
      amount: b.bet_amount ?? 0,
    }));

    // Broadcast to all clients on the shared channel
    channelRef.current.send({
      type: "broadcast",
      event: "phase:reveal_bets",
      payload: { bets },
    });

    // After 3 s of showing revealed bets, transition room to 'playing'
    setTimeout(async () => {
      await supabase
        .from("rooms")
        .update({ status: "playing", last_activity: new Date().toISOString() })
        .eq("id", room.id);
    }, 3000);
  }, [room.id, room.current_round]);

  // ── Lock the current player's bet ─────────────────────────────────────────
  // FIX: now sends on channelRef (the already-subscribed channel) instead of
  // creating a brand-new throwaway channel that no one is listening to.
  const doLockBet = useCallback(async () => {
    if (lockedRef.current || !currentPlayer) return;
    setLocked(true);
    lockedRef.current = true;

    const currentBet = betRef.current;
    const supabase = createBrowserClient();

    const { data: roundData } = await supabase
      .from("rounds")
      .select("id")
      .eq("room_id", room.id)
      .eq("round_number", room.current_round)
      .single();

    if (roundData) {
      await supabase.from("bets").upsert(
        {
          round_id: roundData.id,
          player_id: currentPlayer.id,
          bet_amount: currentBet,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "round_id,player_id" },
      );
    }

    // Broadcast on the SAME channel the listeners are subscribed to
    channelRef.current?.send({
      type: "broadcast",
      event: "bet:locked",
      payload: { player_id: currentPlayer.id },
    });
  }, [currentPlayer, room.id, room.current_round]);

  // ── Derived display values ────────────────────────────────────────────────
  const progressPercent = (timeLeft / BETTING_DURATION_MS) * 100;
  const circumference = 2 * Math.PI * 45;

  // Colour thresholds relative to total duration (not hard-coded ms values)
  const timerColor =
    progressPercent > 40
      ? "var(--color-gold)"
      : progressPercent > 20
        ? "#F59E0B"
        : "var(--color-red)";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Revealed state
  // ─────────────────────────────────────────────────────────────────────────
  if (revealed) {
    return (
      <div className="p-6 space-y-6">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-center"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Bets Revealed — Round {room.current_round}
        </motion.h2>

        <p className="text-center text-sm text-[var(--color-muted)]">
          Starting play in a moment…
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
          <AnimatePresence>
            {allBets.map((b, i) => {
              const player = players.find((p) => p.id === b.player_id);
              return (
                <motion.div
                  key={b.player_id}
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  className="p-4 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-center"
                >
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: player?.avatar_color || "#666" }}
                  >
                    {player?.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">
                    {player?.display_name}
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-gold)]">
                    {b.amount}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Betting state
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-md mx-auto">
      <h2
        className="text-2xl font-bold text-center"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Place Your Bet — Round {room.current_round}
      </h2>

      <p className="text-center text-[var(--color-muted)]">
        {cardsPerPlayer} cards per player • {activePlayers.length} players
      </p>

      {/* ── Server-synced timer circle ─────────────────────────────────────── */}
      <div className="flex justify-center">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={timerColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progressPercent / 100)}
              className="transition-all duration-75"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">
              {Math.ceil(timeLeft / 1000)}s
            </span>
          </div>
        </div>
      </div>

      {/* ── Bet controls (only for active, not-yet-locked players) ─────────── */}
      {isActive && !locked && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBet(Math.max(minBet, bet - 1))}
              disabled={bet <= minBet}
              className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xl font-bold hover:border-[var(--color-gold)] transition-colors disabled:opacity-30"
              aria-label="Decrease bet"
            >
              −
            </button>

            <div className="w-20 h-20 rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] border-2 border-[var(--color-gold)] flex items-center justify-center">
              <span className="text-3xl font-bold text-[var(--color-gold)]">
                {bet}
              </span>
            </div>

            <button
              onClick={() => setBet(Math.min(maxBet, bet + 1))}
              disabled={bet >= maxBet}
              className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xl font-bold hover:border-[var(--color-gold)] transition-colors disabled:opacity-30"
              aria-label="Increase bet"
            >
              +
            </button>
          </div>

          {minBet > 0 && (
            <p className="text-center text-xs text-[var(--color-red)]">
              ⚠️ Final round — zero bets not allowed
            </p>
          )}

          <button
            onClick={doLockBet}
            className="w-full py-3 bg-[var(--color-gold)] text-[var(--color-bg)] rounded-[var(--radius-md)] font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            🔒 Lock Bet
          </button>
        </div>
      )}

      {/* ── Locked confirmation ────────────────────────────────────────────── */}
      {locked && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-6 bg-[var(--color-surface-2)] rounded-[var(--radius-lg)] border border-[var(--color-gold-dim)]"
        >
          <p className="text-lg font-semibold text-[var(--color-gold)]">
            Bet Locked: {bet}
          </p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Waiting for others…
          </p>
        </motion.div>
      )}

      {/* ── Spectator / eliminated notice ─────────────────────────────────── */}
      {!isActive && (
        <p className="text-center text-sm text-[var(--color-muted)] italic">
          You are spectating this round.
        </p>
      )}

      {/* ── Per-player lock-status pills ──────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-2">
        {activePlayers.map((p) => {
          const isLocked =
            lockedPlayers.has(p.id) || (p.id === currentPlayer?.id && locked);
          return (
            <div
              key={p.id}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                isLocked
                  ? "bg-[var(--color-green)] text-white"
                  : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
              }`}
            >
              {p.display_name} {isLocked ? "✓" : "…"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
