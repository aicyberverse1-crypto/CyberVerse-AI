import { useState } from "react";
import { motion } from "framer-motion";
import { useGetLeaderboard, getGetLeaderboardQueryKey, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Target, TrendingUp, Shield, Swords, Crown } from "lucide-react";

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

export default function Leaderboard() {
  const [filter, setFilter] = useState<"all-time" | "weekly" | "daily">("all-time");
  const { data: entries = [], isLoading } = useGetLeaderboard(
    { limit: 20, filter },
    { query: { queryKey: getGetLeaderboardQueryKey({ limit: 20, filter }) } }
  );
  const { data: user } = useGetUser();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-primary animate-pulse text-sm font-mono">Loading rankings...</div></div>;
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-xl font-bold">Global Leaderboard</h1>
        <div className="ml-auto flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.id as any)}
              className={`text-xs ${filter === f.id ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center pt-8">
            {top3[1] && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full">
                <Card className={`border ${top3[1].username === user?.username ? "border-primary bg-primary/5" : "border-border bg-card"} text-center`}>
                  <CardContent className="p-4">
                    <div className="text-2xl mb-1">🥈</div>
                    <p className="text-sm font-bold font-mono text-foreground truncate">{top3[1].username}</p>
                    <div className={`text-[10px] ${RANK_COLORS[top3[1].rankTier] ?? "text-muted-foreground"}`}>{top3[1].rankTier}</div>
                    <p className="text-xs text-muted-foreground">Lv {top3[1].level}</p>
                    <p className="text-lg font-bold text-foreground mt-1 font-mono">{top3[1].totalScore.toLocaleString()}</p>
                    {top3[1].isTopHacker && <div className="text-[10px] text-yellow-400">👑 Top Hacker</div>}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col items-center">
            {top3[0] && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <Card className={`border ${top3[0].username === user?.username ? "border-primary" : "border-yellow-400/50"} bg-yellow-400/5 text-center`}>
                  <CardContent className="p-4">
                    <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <div className="text-3xl mb-1">🥇</div>
                    <p className="text-sm font-bold font-mono text-yellow-400 truncate">{top3[0].username}</p>
                    <div className={`text-[10px] ${RANK_COLORS[top3[0].rankTier] ?? "text-muted-foreground"}`}>{top3[0].rankTier}</div>
                    <p className="text-xs text-muted-foreground">Lv {top3[0].level}</p>
                    <p className="text-xl font-bold text-yellow-400 mt-1 font-mono">{top3[0].totalScore.toLocaleString()}</p>
                    {top3[0].isTopHacker && <div className="text-[10px] text-yellow-400">👑 Top Hacker</div>}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col items-center pt-12">
            {top3[2] && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full">
                <Card className={`border ${top3[2].username === user?.username ? "border-primary bg-primary/5" : "border-border bg-card"} text-center`}>
                  <CardContent className="p-4">
                    <div className="text-2xl mb-1">🥉</div>
                    <p className="text-sm font-bold font-mono text-foreground truncate">{top3[2].username}</p>
                    <div className={`text-[10px] ${RANK_COLORS[top3[2].rankTier] ?? "text-muted-foreground"}`}>{top3[2].rankTier}</div>
                    <p className="text-xs text-muted-foreground">Lv {top3[2].level}</p>
                    <p className="text-lg font-bold text-foreground mt-1 font-mono">{top3[2].totalScore.toLocaleString()}</p>
                    {top3[2].isTopHacker && <div className="text-[10px] text-yellow-400">👑 Top Hacker</div>}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Full table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Full Rankings — {FILTERS.find(f => f.id === filter)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <div className="grid grid-cols-6 gap-2 px-4 py-2 text-xs text-muted-foreground font-medium">
              <span>Rank</span>
              <span className="col-span-2">Operator</span>
              <span className="text-center">Type</span>
              <span className="text-right"><Target className="w-3.5 h-3.5 inline" /> Score</span>
              <span className="text-right"><Zap className="w-3.5 h-3.5 inline" /> XP</span>
            </div>

            {entries.map((entry, i) => {
              const isMe = entry.username === user?.username;
              const rankColor = RANK_COLORS[entry.rankTier] ?? "text-muted-foreground";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`grid grid-cols-6 gap-2 px-4 py-2.5 text-sm items-center transition-colors ${
                    isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center">
                    {entry.rank <= 3
                      ? <span className="text-base">{MEDALS[entry.rank - 1]}</span>
                      : <span className="text-muted-foreground font-mono text-xs">{entry.rank}</span>
                    }
                  </div>
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-medium text-xs truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                          {entry.username}
                        </span>
                        {entry.isTopHacker && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                        {isMe && <Badge className="text-[9px] py-0 px-1 bg-primary/20 text-primary border-primary/30 shrink-0">You</Badge>}
                      </div>
                      <div className={`text-[10px] ${rankColor}`}>{entry.rankTier} · Lv{entry.level}</div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {entry.hackerType === "attacker"
                      ? <Swords className="w-3.5 h-3.5 text-red-400" />
                      : <Shield className="w-3.5 h-3.5 text-primary" />
                    }
                  </div>
                  <div className="text-right font-mono font-semibold text-xs text-foreground">
                    {entry.totalScore.toLocaleString()}
                  </div>
                  <div className="text-right font-mono text-xs text-primary">
                    {entry.xp.toLocaleString()}
                  </div>
                </motion.div>
              );
            })}

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
