"use client";

import { useEffect, useState } from "react";
import type { RoomRow, PlayerRow, ScoreRow, BetRow } from "@/lib/engine/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { Leaderboard } from "./Leaderboard";
import { ScoreLineChart } from "./ScoreLineChart";
import { RoundBarChart } from "./RoundBarChart";
import { RoundHistoryTable } from "./RoundHistoryTable";

interface DashboardProps {
  room: RoomRow;
  players: PlayerRow[];
  currentPlayer: PlayerRow | null;
}

/**
 * Game-agnostic dashboard shell.
 * Shows leaderboard, charts, and round history.
 * Rendered alongside game phase components when phase.showDashboard = true.
 */
export function Dashboard({ room, players, currentPlayer }: DashboardProps) {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [roundHistory, setRoundHistory] = useState<
    Array<{ round: number; bets: BetRow[] }>
  >([]);

  const activePlayers = players.filter((p) => !p.is_spectator);

  useEffect(() => {
    fetchData();
    const supabase = createBrowserClient();

    // Subscribe to score changes
    const channel = supabase
      .channel(`dashboard-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, room.current_round]);

  async function fetchData() {
    const supabase = createBrowserClient();

    const { data: scoresData } = await supabase
      .from("scores")
      .select("*")
      .eq("room_id", room.id);

    if (scoresData) setScores(scoresData as ScoreRow[]);

    // Single query: fetch all rounds AND their bets via a join
    const { data: rounds } = await supabase
      .from("rounds")
      .select("id, round_number, bets(*)")
      .eq("room_id", room.id)
      .order("round_number", { ascending: true });

    if (rounds && rounds.length > 0) {
      const history = rounds.map((round) => ({
        round: round.round_number,
        bets: (round.bets || []) as BetRow[],
      }));
      setRoundHistory(history);
    }
  }

  // Build chart data
  const chartData = roundHistory.map((rh) => {
    const dataPoint: Record<string, unknown> = { round: rh.round };
    rh.bets.forEach((bet) => {
      const player = activePlayers.find((p) => p.id === bet.player_id);
      if (player) {
        dataPoint[player.display_name] = bet.round_points || 0;
      }
    });
    return dataPoint;
  });

  // Build cumulative chart data
  const cumulativeData: Array<Record<string, unknown>> = [];
  const runningTotals: Record<string, number> = {};
  roundHistory.forEach((rh) => {
    const dataPoint: Record<string, unknown> = { round: rh.round };
    rh.bets.forEach((bet) => {
      const player = activePlayers.find((p) => p.id === bet.player_id);
      if (player) {
        runningTotals[player.display_name] =
          (runningTotals[player.display_name] || 0) + (bet.round_points || 0);
        dataPoint[player.display_name] = runningTotals[player.display_name];
      }
    });
    cumulativeData.push(dataPoint);
  });

  const latestRound =
    roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;

  return (
    <div className="space-y-6 p-4">
      {/* Leaderboard */}
      <Leaderboard scores={scores} players={activePlayers} room={room} />

      {/* Charts - only show if we have round data */}
      {cumulativeData.length > 0 && (
        <>
          <ScoreLineChart
            data={cumulativeData}
            players={activePlayers}
            room={room}
          />

          {latestRound && (
            <RoundBarChart roundData={latestRound} players={activePlayers} />
          )}
        </>
      )}

      {/* Round History */}
      {roundHistory.length > 0 && (
        <RoundHistoryTable
          roundHistory={roundHistory}
          players={activePlayers}
        />
      )}
    </div>
  );
}
