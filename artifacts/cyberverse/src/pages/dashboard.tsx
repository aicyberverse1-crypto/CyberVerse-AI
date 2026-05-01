import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDashboardStats, useGetUser, useClaimDailyBonus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Lock, Activity, Trophy, Bot, ChevronRight, Zap, Target, TrendingUp, Lightbulb, Gift, Flame, Users, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { audioEffects } from "@/hooks/useAudio";

const MODES = [
  { path: "/phishing", label: "Phishing Detective", icon: Mail, desc: "Identify phishing & social engineering", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  { path: "/defense", label: "Attack Defense", icon: Shield, desc: "Defend against live cyber attacks", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  { path: "/builder", label: "Secure Builder", icon: Lock, desc: "Design secure authentication systems", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
  { path: "/escape", label: "Escape Room", icon: Activity, desc: "Solve cryptographic puzzles to escape", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  { path: "/multiplayer", label: "Multiplayer", icon: Users, desc: "Challenge AI opponents in cyber battles", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  { path: "/missions", label: "AI Missions", icon: Swords, desc: "Personalized AI-generated challenges", color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
];

const RANK_COLORS: Record<string, string> = {
  "Bronze": "text-amber-600 border-amber-600/30",
  "Silver": "text-slate-400 border-slate-400/30",
  "Gold": "text-yellow-400 border-yellow-400/30",
  "Platinum": "text-cyan-400 border-cyan-400/30",
  "Diamond": "text-blue-400 border-blue-400/30",
  "Elite Hacker": "text-purple-400 border-purple-400/30",
};

const RANK_THRESHOLDS = [
  { rank: "Bronze", min: 0, next: 500 },
  { rank: "Silver", min: 500, next: 1500 },
  { rank: "Gold", min: 1500, next: 3000 },
  { rank: "Platinum", min: 3000, next: 6000 },
  { rank: "Diamond", min: 6000, next: 10000 },
  { rank: "Elite Hacker", min: 10000, next: 10000 },
];

function RiskMeter({ score }: { score: number }) {
  const maxScore = 1000;
  const percent = Math.min((score / maxScore) * 100, 100);
  const riskLevel = percent < 20 ? "CRITICAL" : percent < 50 ? "HIGH" : percent < 75 ? "MEDIUM" : "LOW";
  const riskColor = percent < 20 ? "#ef4444" : percent < 50 ? "#f97316" : percent < 75 ? "#eab308" : "#22c55e";
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={riskColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${strokeDash} ${circumference}` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color: riskColor }}>{riskLevel}</span>
          <span className="text-xs text-muted-foreground">RISK</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: user } = useGetUser();
  const claimDaily = useClaimDailyBonus();
  const [dailyClaimed, setDailyClaimed] = useState(false);

  const xpPercent = user ? (user.xp % 100) : 0;

  const rankTier = stats?.rankTier ?? "Bronze";
  const rankThreshold = RANK_THRESHOLDS.find((r) => r.rank === rankTier);
  const rankProgress = rankThreshold && rankThreshold.next > rankThreshold.min
    ? ((stats?.totalScore ?? 0) - rankThreshold.min) / (rankThreshold.next - rankThreshold.min) * 100
    : 100;

  const modeScores = [
    { label: "Phishing", score: stats?.phishingScore ?? 0 },
    { label: "Defense", score: stats?.defenseScore ?? 0 },
    { label: "Builder", score: stats?.builderScore ?? 0 },
    { label: "Escape", score: stats?.escapeScore ?? 0 },
  ];

  function handleDailyClaim() {
    audioEffects.alert();
    claimDaily.mutate(undefined, {
      onSuccess: (data) => {
        audioEffects.levelUp();
        setDailyClaimed(true);
        toast({ title: "Daily Bonus Claimed!", description: `+${data.hintPointsEarned} hint points! ${data.message}` });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      },
      onError: (err) => {
        audioEffects.error();
        toast({ title: "Already claimed", description: err.message, variant: "destructive" });
      },
    });
  }

  const canClaim = !dailyClaimed && user && !user.lastClaimedAt;
  const rankColorClass = RANK_COLORS[rankTier] ?? "text-amber-600 border-amber-600/30";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, <span className="text-primary font-mono">{user?.username}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">SOC Dashboard — Mission Control Active</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.isTopHacker && (
            <Badge className="bg-yellow-400/20 border-yellow-400/40 text-yellow-400">👑 Top Hacker of the Day</Badge>
          )}
          <Badge variant="outline" className={`text-xs ${rankColorClass}`}>
            {user?.rankTier ?? "Bronze"} Operator
          </Badge>
        </div>
      </div>

      {/* Daily Bonus + Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-yellow-400/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Daily Bonus</p>
                <p className="text-xs text-muted-foreground">Claim hint points every 24 hours</p>
              </div>
            </div>
            <Button
              onClick={handleDailyClaim}
              disabled={claimDaily.isPending || (!canClaim && !!user?.lastClaimedAt)}
              size="sm"
              className="gap-1.5 bg-yellow-400 text-black hover:bg-yellow-400/90 text-xs font-bold"
            >
              <Gift className="w-3.5 h-3.5" />
              {user?.lastClaimedAt ? "Claimed" : "Claim"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-orange-400/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Login Streak</p>
                <p className="text-xs text-muted-foreground">Day 7 earns +100 hint points!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-400 font-mono">{stats?.streakDays ?? 0}</p>
              <p className="text-xs text-muted-foreground">days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Score", value: stats?.totalScore ?? 0, icon: Target, color: "text-primary" },
          { label: "Hint Points", value: stats?.hintPoints ?? 0, icon: Lightbulb, color: "text-yellow-400" },
          { label: "Games Played", value: stats?.gamesPlayed ?? 0, icon: Activity, color: "text-blue-400" },
          { label: "Accuracy", value: `${(stats?.accuracyRate ?? 0).toFixed(0)}%`, icon: TrendingUp, color: "text-primary" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color} opacity-60`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game modes */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Mission Select</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map((mode, i) => (
              <motion.div
                key={mode.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setLocation(mode.path)}
                className={`cursor-pointer p-4 rounded-xl border ${mode.bg} hover:shadow-lg transition-all`}
              >
                <div className="flex items-start gap-3">
                  <mode.icon className={`w-5 h-5 ${mode.color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${mode.color}`}>{mode.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mode.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Risk meter */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Cyber Risk Level</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pb-4">
              <RiskMeter score={stats?.totalScore ?? 0} />
            </CardContent>
          </Card>

          {/* Rank progress */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className={`font-bold ${rankColorClass.split(" ")[0]}`}>{rankTier}</span>
                <span className="text-muted-foreground">{stats?.totalScore ?? 0} / {rankThreshold?.next ?? 0} pts</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${rankTier === "Elite Hacker" ? "bg-purple-400" : "bg-primary"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(rankProgress, 100)}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span>Rank Progress</span>
                {rankTier !== "Elite Hacker" && <span>Next: {RANK_THRESHOLDS[RANK_THRESHOLDS.findIndex(r => r.rank === rankTier) + 1]?.rank}</span>}
              </div>
            </CardContent>
          </Card>

          {/* XP progress */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">XP to Level {(user?.level ?? 1) + 1}</span>
                <span className="text-primary font-mono">{stats?.xpToNextLevel ?? 100} XP</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mode scores */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {modeScores.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="text-foreground font-mono">{m.score}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((m.score / 500) * 100, 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {stats.recentActivity.map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground capitalize w-24">{activity.mode.replace("_", " ")}</span>
                <span className="text-foreground font-mono">+{activity.score} pts</span>
                <span className="text-primary text-xs">+{activity.xpEarned} XP</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
