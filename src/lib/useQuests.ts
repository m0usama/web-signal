"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sparkDay } from "./spark";
import { weekStart } from "./quests-data";
import type { DailyAnswer, Game, GameKind, HeroScore, RaceRun } from "./types";

type QuestGameKind = Exclude<GameKind, "ttt">;
const KINDS: QuestGameKind[] = ["web4", "memory", "hotcold", "word"];

export interface QuestEvents {
  /** A game changed because of the other person. */
  onGame?: (g: Game) => void;
  onDaily?: (a: DailyAnswer) => void;
  onRace?: (r: RaceRun) => void;
}

/**
 * Live state for the City Quests landmarks in one room (everything except
 * tic-tac-toe, which lives in useRoom). Disabled in messages-only chats.
 */
export function useQuests(supabase: SupabaseClient, roomId: string, meId: string, enabled: boolean, events: QuestEvents) {
  const [games, setGames] = useState<Partial<Record<QuestGameKind, Game>>>({});
  const [daily, setDaily] = useState<DailyAnswer[]>([]);
  const [races, setRaces] = useState<RaceRun[]>([]);
  const [scores, setScores] = useState<HeroScore[]>([]);
  const [today, setToday] = useState(() => sparkDay());
  const [gen, setGen] = useState(0);
  const eventsRef = useRef(events);
  // Updates we made ourselves (so their realtime echo doesn't toast "your move").
  const mine = useRef(new Set<string>());
  useEffect(() => {
    eventsRef.current = events;
  });

  // New day at midnight (London): fresh trivia / This or That / race.
  useEffect(() => {
    const t = setInterval(() => setToday(sparkDay()), 30_000);
    return () => clearInterval(t);
  }, []);

  const loadScores = useCallback(async () => {
    const { data } = await supabase.rpc("hero_scores", { p_room: roomId, p_since: weekStart().toISOString() });
    if (Array.isArray(data)) setScores((data as { user_id: string; points: number | string }[]).map((r) => ({ user_id: r.user_id, points: Number(r.points) })));
  }, [supabase, roomId]);

  const loadAll = useCallback(async () => {
    if (!enabled) return;
    const [gm, da, rr] = await Promise.all([
      supabase.from("games").select("*").eq("room_id", roomId).in("kind", KINDS).order("created_at", { ascending: false }).limit(40),
      supabase.from("daily_answers").select("*").eq("room_id", roomId).eq("day", today),
      supabase.from("race_runs").select("*").eq("room_id", roomId).eq("day", today).order("ms", { ascending: true }).limit(50),
    ]);
    if (gm.data) {
      const latest: Partial<Record<QuestGameKind, Game>> = {};
      for (const g of gm.data as Game[]) {
        const k = g.kind as QuestGameKind;
        if (!latest[k]) latest[k] = g;
      }
      setGames(latest);
    }
    if (da.data) setDaily(da.data as DailyAnswer[]);
    if (rr.data) setRaces(rr.data as RaceRun[]);
    void loadScores();
  }, [supabase, roomId, today, enabled, loadScores]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const filter = `room_id=eq.${roomId}`;
    const ch = supabase
      .channel(`quests:${roomId}:${gen}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as Game;
        if (!KINDS.includes(row.kind as QuestGameKind)) return;
        setGames((all) => {
          const cur = all[row.kind as QuestGameKind];
          if (cur && cur.id !== row.id && Date.parse(cur.created_at) > Date.parse(row.created_at)) return all;
          if (cur && cur.id === row.id && Date.parse(cur.updated_at) > Date.parse(row.updated_at)) return all;
          return { ...all, [row.kind]: row };
        });
        if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
          const key = `${row.id}@${row.updated_at}`;
          const echo = mine.current.has(key);
          mine.current.delete(key);
          if (!echo && (row.turn === meId || (row.winner && row.winner !== "void"))) queueMicrotask(() => eventsRef.current.onGame?.(row));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_answers", filter }, (payload) => {
        const row = payload.new as DailyAnswer;
        if (row.user_id !== meId) eventsRef.current.onDaily?.(row);
        // Their answers only become readable once you've answered: re-read.
        void supabase
          .from("daily_answers")
          .select("*")
          .eq("room_id", roomId)
          .eq("day", row.day)
          .then(({ data }) => data && setDaily(data as DailyAnswer[]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "race_runs", filter }, (payload) => {
        const row = payload.new as RaceRun;
        setRaces((list) => (list.some((r) => r.id === row.id) ? list : [...list, row].sort((a, b) => a.ms - b.ms)));
        if (row.user_id !== meId) eventsRef.current.onRace?.(row);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hero_points", filter }, () => void loadScores())
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") void loadAll();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setTimeout(() => !disposed && setGen((g) => g + 1), 3000);
      });
    return () => {
      disposed = true;
      void supabase.removeChannel(ch);
    };
  }, [supabase, roomId, meId, enabled, gen, loadAll, loadScores]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void loadAll();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadAll]);

  const call = useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      const g = data as Game;
      if (g && g.kind) {
        mine.current.add(`${g.id}@${g.updated_at}`);
        setGames((all) => ({ ...all, [g.kind]: g }));
      }
      return g;
    },
    [supabase],
  );

  const actions = useMemo(
    () => ({
      web4New: () => call("web4_new", { p_room: roomId }),
      web4Move: (gameId: string, col: number) => call("web4_move", { p_game: gameId, p_col: col }),
      memoryNew: () => call("memory_new", { p_room: roomId }),
      memoryFlip: (gameId: string, tile: number) => call("memory_flip", { p_game: gameId, p_tile: tile }),
      hotcoldNew: (x: number, y: number) => call("hotcold_new", { p_room: roomId, p_x: x, p_y: y }),
      hotcoldGuess: (gameId: string, x: number, y: number) => call("hotcold_guess", { p_game: gameId, p_x: x, p_y: y }),
      wordNew: (word: string) => call("word_new", { p_room: roomId, p_word: word }),
      wordGuess: (gameId: string, letter: string) => call("word_guess", { p_game: gameId, p_letter: letter }),
      answerDaily: async (kind: "trivia" | "tot", answers: number[], score: number) => {
        const { error } = await supabase.from("daily_answers").insert({ room_id: roomId, kind, answers, score });
        if (error) throw error;
        const { data } = await supabase.from("daily_answers").select("*").eq("room_id", roomId).eq("day", today);
        if (data) setDaily(data as DailyAnswer[]);
        void loadScores();
      },
      raceSubmit: async (ms: number) => {
        const { data, error } = await supabase.rpc("race_submit", { p_room: roomId, p_ms: Math.round(ms) });
        if (error) throw error;
        const row = data as RaceRun;
        setRaces((list) => (list.some((r) => r.id === row.id) ? list : [...list, row].sort((a, b) => a.ms - b.ms)));
        void loadScores();
        return row;
      },
      reload: loadAll,
    }),
    [call, roomId, supabase, today, loadAll, loadScores],
  );

  return { games, daily, races, scores, today, actions };
}

export type Quests = ReturnType<typeof useQuests>;
