import { motion } from "framer-motion";
import { useGetLeaderboard, getGetLeaderboardQueryKey, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Zap, Target, TrendingUp } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { data: entries = [], isLoading } = useGetLeaderboard(
    { limit: 20 },
    { query: { queryKey: getGetLeaderboardQueryKey({ limit: 20 }) } }
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
        <Badge variant="outline" className="ml-auto border-yellow-400/30 text-yellow-400 text-xs">
          Top Operators
        </Badge>
      </div>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd place */}
          <div className="flex flex-col items-center pt-8">
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full"
              >
                <Card className={`border ${top3[1].username === user?.username ? "border-primary bg-primary/5" : "border-border bg-card"} text-center`}>
                  <CardContent className="p-4">
                    <div className="text-2xl mb-2">🥈</div>
                    <p className="text-sm font-bold font-mono text-foreground truncate">{top3[1].username}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lvl {top3[1].level}</p>
                    <p className="text-lg font-bold text-foreground mt-2 font-mono">{top3[1].totalScore}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center">
            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Card className={`border ${top3[0].username === user?.username ? "border-primary" : "border-yellow-400/50"} bg-yellow-400/5 text-center`}>
                  <CardContent className="p-4">
                    <div className="text-3xl mb-2">🥇</div>
                    <p className="text-sm font-bold font-mono text-yellow-400 truncate">{top3[0].username}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lvl {top3[0].level}</p>
                    <p className="text-xl font-bold text-yellow-400 mt-2 font-mono">{top3[0].totalScore}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center pt-12">
            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full"
              >
                <Card className={`border ${top3[2].username === user?.username ? "border-primary bg-primary/5" : "border-border bg-card"} text-center`}>
                  <CardContent className="p-4">
                    <div className="text-2xl mb-2">🥉</div>
                    <p className="text-sm font-bold font-mono text-foreground truncate">{top3[2].username}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lvl {top3[2].level}</p>
                    <p className="text-lg font-bold text-foreground mt-2 font-mono">{top3[2].totalScore}</p>
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
            <TrendingUp className="w-3.5 h-3.5" /> Full Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs text-muted-foreground font-medium">
              <span>Rank</span>
              <span className="col-span-2">Operator</span>
              <span className="text-right"><Target className="w-3.5 h-3.5 inline" /> Score</span>
              <span className="text-right"><Zap className="w-3.5 h-3.5 inline" /> XP</span>
            </div>

            {entries.map((entry, i) => {
              const isMe = entry.username === user?.username;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`grid grid-cols-5 gap-4 px-4 py-3 text-sm transition-colors ${
                    isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center">
                    {entry.rank <= 3
                      ? <span className="text-base">{MEDALS[entry.rank - 1]}</span>
                      : <span className="text-muted-foreground font-mono w-5 text-center">{entry.rank}</span>
                    }
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className={`font-mono font-medium ${isMe ? "text-primary" : "text-foreground"}`}>
                      {entry.username}
                    </span>
                    {isMe && <Badge className="text-[10px] py-0 px-1.5 bg-primary/20 text-primary border-primary/30">You</Badge>}
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-auto mr-4 text-muted-foreground border-border">
                      Lvl {entry.level}
                    </Badge>
                  </div>
                  <div className="text-right font-mono font-semibold text-foreground">
                    {entry.totalScore.toLocaleString()}
                  </div>
                  <div className="text-right font-mono text-primary text-xs">
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
