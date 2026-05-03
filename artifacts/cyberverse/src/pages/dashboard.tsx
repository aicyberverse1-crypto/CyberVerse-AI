import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetDashboardStats, useGetUser, useClaimDailyBonus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Shield, Lock, Activity, Trophy, Bot, ChevronRight,
  Zap, Target, TrendingUp, Lightbulb, Gift, Flame, Users, Swords, Globe
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { audioEffects } from "@/hooks/useAudio";
import { BadgeDisplay, StreakTitle, IdentityLine } from "@/components/BadgeDisplay";

const MODES = [
  { path: "/phishing", label: "Phishing Detective", icon: Mail, desc: "Identify phishing & social engineering", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  { path: "/defense", label: "Attack Defense", icon: Shield, desc: "Defend against live cyber attacks", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  { path: "/builder", label: "Secure Builder", icon: Lock, desc: "Design secure authentication systems", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
  { path: "/escape", label: "Escape Room", icon: Activity, desc: "Solve cryptographic puzzles to escape", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  { path: "/multiplayer", label: "Multiplayer", icon: Users, desc: "Challenge AI opponents in cyber battles", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  { path: "/missions", label: "AI Missions", icon: Swords, desc: "Personalized AI-generated challenges", color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
  { path: "/dark-web", label: "Dark Web Intel", icon: Globe, desc: "Investigate dark web threat marketplace", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
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

const CYBER_STATS = [
  { stat: "$10.5T", label: "Global cybercrime cost", sub: "by 2025 annually" },
  { stat: "94%", label: "Breaches start with phishing", sub: "make phishing training #1 priority" },
  { stat: "287 days", label: "Avg time to detect a breach", sub: "CyberVerse cuts that with AI" },
  { stat: "3.5M", label: "Unfilled cybersecurity jobs", sub: "worldwide by 2025" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

function RiskMeter({ score }: { score: number }) {
  const maxScore = 1000;
  const percent = Math.min((score / maxScore) * 100, 100);
  const riskLevel = percent < 20 ? "CRITICAL" : percent < 50 ? "HIGH" : percent < 75 ? "MEDIUM" : "LOW";
  const riskColor = percent < 20 ? "#ef4444" : percent < 50 ? "#f97316" : percent < 75 ? "#eab308" : "#00ff88";
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
          <span className="text-lg font-bold font-mono" style={{ color: riskColor }}>{riskLevel}</span>
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
  const welcomeName = user?.isTopHacker ? "Admin" : user?.username ?? "";

  const xpPercent = user ? (user.xp % 100) : 0;
  const rankTier = stats?.rankTier ?? "Bronze";
  const rankThreshold = RANK_THRESHOLDS.find(r => r.rank === rankTier);
  const rankProgress = rankThreshold && rankThreshold.next > rankThreshold.min
    ? ((stats?.totalScore ?? 0) - rankThreshold.min) / (rankThreshold.next - rankThreshold.min) * 100
    : 100;

  // Radar data for performance breakdown
  const radarData = [
    { subject: "Phishing", score: Math.min((stats?.phishingScore ?? 0) / 5, 100), fullMark: 100 },
    { subject: "Defense", score: Math.min((stats?.defenseScore ?? 0) / 5, 100), fullMark: 100 },
    { subject: "Builder", score: Math.min((stats?.builderScore ?? 0) / 2, 100), fullMark: 100 },
    { subject: "Escape", score: Math.min((stats?.escapeScore ?? 0) / 5, 100), fullMark: 100 },
    { subject: "Overall", score: Math.min((stats?.accuracyRate ?? 0), 100), fullMark: 100 },
  ];

  // Bar data for mode scores
  const barData = [
    { name: "Phishing", score: stats?.phishingScore ?? 0, fill: "#eab308" },
    { name: "Defense", score: stats?.defenseScore ?? 0, fill: "#60a5fa" },
    { name: "Builder", score: stats?.builderScore ?? 0, fill: "#00ff88" },
    { name: "Escape", score: stats?.escapeScore ?? 0, fill: "#a855f7" },
  ];

  // Activity line chart data
  const activityData = (stats?.recentActivity ?? []).slice(0, 8).reverse().map((a, i) => ({
    name: `#${i + 1}`,
    score: a.score,
    xp: a.xpEarned,
  }));

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

  const rankColorClass = RANK_COLORS[rankTier] ?? "text-amber-600 border-amber-600/30";
  const streakDays = user?.streakDays ?? 0;
  const badges = user?.badges ?? [];
  const isOnFire = streakDays >= 5;
  const isUnstoppable = streakDays >= 10;

  useEffect(() => {
    if (user?.username) {
      const isAdmin = (user as any).role === "admin";
      document.title = isAdmin ? "Welcome back, Admin" : `Welcome back, ${user.username}`;
    }
  }, [(user as any)?.role, user?.username]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold text-foreground ${isUnstoppable ? "drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" : isOnFire ? "drop-shadow-[0_0_6px_rgba(251,146,60,0.4)]" : ""}`}>
            Welcome back, <span className="text-primary font-mono">{welcomeName}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">SOC Dashboard — Mission Control Active</p>
          {/* Full identity line */}
          {user && (
            <div className="mt-2">
              <IdentityLine
                username={user.username}
                rankTier={user.rankTier}
                hackerType={user.hackerType}
                streakDays={streakDays}
                badges={badges}
                isTopHacker={user.isTopHacker}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
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
              disabled={claimDaily.isPending || !!user?.lastClaimedAt}
              size="sm"
              className="gap-1.5 bg-yellow-400 text-black hover:bg-yellow-400/90 text-xs font-bold"
            >
              <Gift className="w-3.5 h-3.5" />
              {user?.lastClaimedAt ? "Claimed ✓" : "Claim Now"}
            </Button>
          </CardContent>
        </Card>

        <Card className={`bg-card ${isUnstoppable ? "border-red-400/30 shadow-[0_0_12px_rgba(248,113,113,0.2)]" : isOnFire ? "border-orange-400/30 shadow-[0_0_10px_rgba(251,146,60,0.15)]" : "border-orange-400/20"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUnstoppable ? "bg-red-400/15" : "bg-orange-400/10"}`}>
                <Flame className={`w-5 h-5 ${isUnstoppable ? "text-red-400" : "text-orange-400"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Login Streak</p>
                <p className="text-xs text-muted-foreground">Day 7 earns +100 hint points!</p>
                {streakDays >= 3 && (
                  <div className="mt-1">
                    <StreakTitle streakDays={streakDays} className="text-[9px]" animate={false} />
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold font-mono ${isUnstoppable ? "text-red-400" : "text-orange-400"}`}>{streakDays}</p>
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
          { label: "Accuracy Rate", value: `${(stats?.accuracyRate ?? 0).toFixed(0)}%`, icon: TrendingUp, color: "text-primary" },
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
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setLocation(mode.path)}
                className={`cursor-pointer p-4 rounded-xl border ${mode.bg} hover:shadow-lg transition-all`}
              >
                <div className="flex items-start gap-3">
                  <mode.icon className={`w-5 h-5 ${mode.color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${mode.color}`}>{mode.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mode.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
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
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(rankProgress, 100)}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span>Rank Progress</span>
                {rankTier !== "Elite Hacker" && (
                  <span>Next: {RANK_THRESHOLDS[RANK_THRESHOLDS.findIndex(r => r.rank === rankTier) + 1]?.rank}</span>
                )}
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
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Radar chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Skill Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar chart - mode scores */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Mode Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line chart - recent activity */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {activityData.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                  <Line type="monotone" dataKey="xp" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: "#eab308" }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground font-mono">
                Play more games to see trends
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Why This Matters */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Why This Matters — Real-World Cybersecurity Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {CYBER_STATS.map(s => (
              <motion.div
                key={s.stat}
                whileHover={{ scale: 1.02 }}
                className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl"
              >
                <div className="text-xl font-black text-primary font-mono">{s.stat}</div>
                <div className="text-xs font-semibold text-foreground mt-1 leading-tight">{s.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.sub}</div>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            CyberVerse AI trains you with <strong className="text-foreground">real attack patterns</strong> used by hackers today.
            Every mission, hint, and skill you learn maps directly to <strong className="text-foreground">MITRE ATT&CK framework</strong> techniques —
            the same standard used by Fortune 500 security teams. Your performance here predicts your ability to{" "}
            <strong className="text-primary">stop real breaches before they happen</strong>.
          </p>
        </CardContent>
      </Card>

      {/* Recent activity list */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operator Log</h2>
          <div className="space-y-2">
            {stats.recentActivity.slice(0, 5).map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground capitalize w-24 font-mono text-xs">{activity.mode.replace("_", " ")}</span>
                <span className="text-foreground font-mono text-xs">+{activity.score} pts</span>
                <span className="text-primary text-xs font-mono">+{activity.xpEarned} XP</span>
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
