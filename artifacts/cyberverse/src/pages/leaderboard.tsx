import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useGetLeaderboard, getGetLeaderboardQueryKey, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Target, TrendingUp, Shield, Swords, Crown, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { BadgeDisplay, StreakTitle } from "@/components/BadgeDisplay";

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS: Record<string, string> = {
  "Bronze": "text-amber-600",
  "Silver": "text-slate-400",
  "Gold": "text-yellow-400",
  "Platinum": "text-cyan-400",
  "Diamond": "text-blue-400",
  "Elite Hacker": "text-purple-400",
};

const FILTERS = [
  { id: "all-time", label: "All Time" },
  { id: "weekly", label: "This Week" },
  { id: "daily", label: "Today" },
];

type RankChange = "up" | "down" | "new" | "same";

export default function Leaderboard() {
  const [filter, setFilter] = useState<"all-time" | "weekly" | "daily">("all-time");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  // Map of username -> previous rank for change detection
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [rankChanges, setRankChanges] = useState<Map<string, RankChange>>(new Map());
  const [flashRows, setFlashRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useGetLeaderboard(
    { limit: 20, filter },
    { query: { queryKey: getGetLeaderboardQueryKey({ limit: 20, filter }) } }
  );
  const { data: user } = useGetUser();

  // Compute rank changes whenever entries update
  useEffect(() => {
    if (entries.length === 0) return;
    const changes = new Map<string, RankChange>();
    const flashing = new Set<string>();

    for (const e of entries) {
      const prev = prevRanksRef.current.get(e.username);
      if (prev === undefined) {
        changes.set(e.username, "new");
      } else if (e.rank < prev) {
        changes.set(e.username, "up");
        flashing.add(e.username);
      } else if (e.rank > prev) {
        changes.set(e.username, "down");
        flashing.add(e.username);
      } else {
        changes.set(e.username, "same");
      }
    }

    setRankChanges(changes);
    setFlashRows(flashing);

    // Update the prev ranks map
    const newMap = new Map<string, number>();
    for (const e of entries) newMap.set(e.username, e.rank);
    prevRanksRef.current = newMap;

    // Clear flash after 2s
    if (flashing.size > 0) {
      const t = setTimeout(() => setFlashRows(new Set()), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [entries]);

  // Auto-refresh every 30 seconds
  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey({ limit: 20, filter }) });
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [queryClient, filter]);

  useEffect(() => {
    const interval = setInterval(doRefresh, 30_000);
    return () => clearInterval(interval);
  }, [doRefresh]);

  // Reset changes on filter change
  useEffect(() => {
    prevRanksRef.current = new Map();
    setRankChanges(new Map());
    setFlashRows(new Set());
  }, [filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse text-sm font-mono">Loading rankings...</div>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);

  function RankChangeIndicator({ username }: { username: string }) {
    const change = rankChanges.get(username);
    if (!change || change === "same" || change === "new") return null;
    if (change === "up") return <ArrowUp className="w-3 h-3 text-green-400 shrink-0" />;
    return <ArrowDown className="w-3 h-3 text-red-400 shrink-0" />;
  }

  function getRowHighlight(username: string): string {
    if (!flashRows.has(username)) return "";
    const change = rankChanges.get(username);
    if (change === "up") return "bg-green-400/10";
    if (change === "down") return "bg-red-400/10";
    return "";
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-xl font-bold">Global Leaderboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
            Auto-refresh 30s · Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <Button variant="ghost" size="sm" onClick={doRefresh} className="h-7 w-7 p-0" title="Refresh now">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                variant={filter === f.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.id as "all-time" | "weekly" | "daily")}
                className={`text-xs h-7 ${filter === f.id ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <AnimatePresence mode="wait">
        {top3.length > 0 && (
          <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-4">
            {/* 2nd place */}
            <div className="flex flex-col items-center pt-8">
              {top3[1] && (
                <motion.div
                  layoutId={`podium-${top3[1].username}`}
                  className={`w-full ${flashRows.has(top3[1].username) ? (rankChanges.get(top3[1].username) === "up" ? "ring-2 ring-green-400/60 rounded-xl" : "ring-2 ring-red-400/60 rounded-xl") : ""}`}
                >
                  <Card className={`border ${top3[1].username === user?.username ? "border-primary bg-primary/5" : "border-border bg-card"} text-center transition-all duration-500`}>
                    <CardContent className="p-4">
                      <div className="text-2xl mb-1">🥈</div>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm font-bold font-mono text-foreground truncate">{top3[1].username}</p>
                        <RankChangeIndicator username={top3[1].username} />
                      </div>
                      <div className={`text-[10px] ${RANK_COLORS[top3[1].rankTier] ?? "text-muted-foreground"}`}>{top3[1].rankTier}</div>
                      <p className="text-xs text-muted-foreground">Lv {top3[1].level}</p>
                      {top3[1].streakTitle && (
                        <div className="flex justify-center mt-1">
                          <StreakTitle streakDays={top3[1].streakDays} className="text-[9px]" animate={false} />
                        </div>
                      )}
                      <p className="text-lg font-bold text-foreground mt-1 font-mono">{top3[1].totalScore.toLocaleString()}</p>
                      {top3[1].isTopHacker && <div className="text-[10px] text-yellow-400">👑 Top Hacker</div>}
                      {top3[1].badges.length > 0 && (
                        <div className="flex justify-center mt-1.5">
                          <BadgeDisplay badges={top3[1].badges} size="sm" animate={false} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* 1st place */}
            <div className="flex flex-col items-center">
              {top3[0] && (
                <motion.div
                  layoutId={`podium-${top3[0].username}`}
                  className={`w-full ${top3[0].rank === 1 ? "shadow-[0_0_24px_rgba(250,204,21,0.25)]" : ""} ${flashRows.has(top3[0].username) ? (rankChanges.get(top3[0].username) === "up" ? "ring-2 ring-green-400/60 rounded-xl" : "ring-2 ring-red-400/60 rounded-xl") : ""}`}
                >
                  <Card className={`border ${top3[0].username === user?.username ? "border-primary" : "border-yellow-400/50"} bg-yellow-400/5 text-center`}>
                    <CardContent className="p-4">
                      <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                      <div className="text-3xl mb-1">🥇</div>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm font-bold font-mono text-yellow-400 truncate">{top3[0].username}</p>
                        <RankChangeIndicator username={top3[0].username} />
                      </div>
                      <div className={`text-[10px] ${RANK_COLORS[top3[0].rankTier] ?? "text-muted-foreground"}`}>{top3[0].rankTier}</div>
                      <p className="text-xs text-muted-foreground">Lv {top3[0].level}</p>
                      {top3[0].streakTitle && (
                        <div className="flex justify-center mt-1">
                          <StreakTitle streakDays={top3[0].streakDays} className="text-[9px]" animate={false} />
                        </div>
                      )}
                      <p className="text-xl font-bold text-yellow-400 mt-1 font-mono">{top3[0].totalScore.toLocaleString()}</p>
                      {top3[0].isTopHacker && <div className="text-[10px] text-yellow-400">👑 Top Hacker</div>}
                      {top3[0].badges.length > 0 && (
                        <div className="flex justify-center mt-1.5">
                          <BadgeDisplay badges={top3[0].badges} size="sm" animate={false} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* 3rd place */}
            <div className="flex flex-col items-center pt-12">
              {top3[2] && (
                <motion.div
                  layoutId={`podium-${top3[2].username}`}
                  className={`w-full ${flashRows.has(top3[2].username) ? (rankChanges.get(top3[2].username) === "up" ? "ring-2 ring-green-400/60 rounded-xl" : "ring-2 ring-red-400/60 rounded-xl") : ""}`}
                >
                  <Card className={`border ${top3[2].username === user?.username ? "border-primary bg-primary/5" : "border-border bg-card"} text-center`}>
                    <CardContent className="p-4">
                      <div className="text-2xl mb-1">🥉</div>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm font-bold font-mono text-foreground truncate">{top3[2].username}</p>
                        <RankChangeIndicator username={top3[2].username} />
                      </div>
                      <div className={`text-[10px] ${RANK_COLORS[top3[2].rankTier] ?? "text-muted-foreground"}`}>{top3[2].rankTier}</div>
                      <p className="text-xs text-muted-foreground">Lv {top3[2].level}</p>
                      {top3[2].streakTitle && (
                        <div className="flex justify-center mt-1">
                          <StreakTitle streakDays={top3[2].streakDays} className="text-[9px]" animate={false} />
                        </div>
                      )}
                      <p className="text-lg font-bold text-foreground mt-1 font-mono">{top3[2].totalScore.toLocaleString()}</p>
                      {top3[2].isTopHacker && <div className="text-[10px] text-yellow-400">👑 Top Hacker</div>}
                      {top3[2].badges.length > 0 && (
                        <div className="flex justify-center mt-1.5">
                          <BadgeDisplay badges={top3[2].badges} size="sm" animate={false} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Rankings Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Full Rankings — {FILTERS.find(f => f.id === filter)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-muted-foreground font-medium">
              <span className="col-span-1">Rank</span>
              <span className="col-span-4">Operator</span>
              <span className="col-span-2">Role</span>
              <span className="col-span-2">Badges</span>
              <span className="col-span-2 text-right"><Target className="w-3.5 h-3.5 inline" /> Score</span>
              <span className="col-span-1 text-right"><Zap className="w-3.5 h-3.5 inline" /></span>
            </div>

            <AnimatePresence initial={false}>
              {entries.map((entry) => {
                const isMe = entry.username === user?.username;
                const rankColor = RANK_COLORS[entry.rankTier] ?? "text-muted-foreground";
                const change = rankChanges.get(entry.username);
                const flash = flashRows.has(entry.username);
                const highlight = flash
                  ? change === "up" ? "bg-green-400/10 border-l-2 border-l-green-400"
                    : change === "down" ? "bg-red-400/10 border-l-2 border-l-red-400"
                    : ""
                  : isMe ? "bg-primary/5 border-l-2 border-l-primary" : "";

                return (
                  <motion.div
                    key={entry.username}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`grid grid-cols-12 gap-2 px-4 py-2.5 text-sm items-center transition-colors duration-500 ${highlight || "hover:bg-muted/30"}`}
                  >
                    <div className="col-span-1 flex items-center gap-1">
                      {entry.rank <= 3
                        ? <span className="text-base">{MEDALS[entry.rank - 1]}</span>
                        : <span className="text-muted-foreground font-mono text-xs">{entry.rank}</span>
                      }
                      {change === "up" && flash && <ArrowUp className="w-2.5 h-2.5 text-green-400" />}
                      {change === "down" && flash && <ArrowDown className="w-2.5 h-2.5 text-red-400" />}
                    </div>
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono font-medium text-xs truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                          {entry.username}
                        </span>
                        {entry.isTopHacker && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                        {isMe && <Badge className="text-[9px] py-0 px-1 bg-primary/20 text-primary border-primary/30 shrink-0">You</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] ${rankColor}`}>{entry.rankTier} · Lv{entry.level}</span>
                        {entry.streakTitle && (
                          <StreakTitle streakDays={entry.streakDays} className="text-[8px] px-1" animate={false} />
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      {entry.hackerType === "attacker"
                        ? <><Swords className="w-3 h-3 text-red-400 shrink-0" /><span className="text-[10px] text-red-400 hidden sm:inline">Attacker</span></>
                        : <><Shield className="w-3 h-3 text-primary shrink-0" /><span className="text-[10px] text-primary hidden sm:inline">Defender</span></>
                      }
                    </div>
                    <div className="col-span-2">
                      <BadgeDisplay badges={entry.badges} size="sm" animate={false} />
                    </div>
                    <div className="col-span-2 text-right font-mono font-semibold text-xs text-foreground">
                      {entry.totalScore.toLocaleString()}
                    </div>
                    <div className="col-span-1 text-right font-mono text-xs text-primary">
                      {entry.xp.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {entries.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No operators ranked yet. Be the first!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
