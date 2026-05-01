import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetDashboardStats, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Lock, Activity, Trophy, Bot, ChevronRight, Zap, Target, TrendingUp } from "lucide-react";

const MODES = [
  { path: "/phishing", label: "Phishing Detective", icon: Mail, desc: "Identify phishing emails and social engineering", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  { path: "/defense", label: "Attack Defense", icon: Shield, desc: "Defend against live cyber attacks in real-time", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  { path: "/builder", label: "Secure Builder", icon: Lock, desc: "Design secure authentication systems", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
  { path: "/escape", label: "Escape Room", icon: Activity, desc: "Solve cryptographic puzzles to escape", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
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
            stroke={riskColor} strokeWidth="8"
            strokeLinecap="round"
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
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: user } = useGetUser();

  const xpPercent = stats ? (stats.xp % 100) : 0;

  const modeScores = [
    { label: "Phishing", score: stats?.phishingScore ?? 0 },
    { label: "Defense", score: stats?.defenseScore ?? 0 },
    { label: "Builder", score: stats?.builderScore ?? 0 },
    { label: "Escape", score: stats?.escapeScore ?? 0 },
  ];

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
        <Badge variant="outline" className="border-primary/30 text-primary text-xs font-mono">
          LEVEL {user?.level ?? 1} OPERATOR
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Score", value: stats?.totalScore ?? 0, icon: Target, color: "text-primary" },
          { label: "Total XP", value: stats?.xp ?? 0, icon: Zap, color: "text-yellow-400" },
          { label: "Games Played", value: stats?.gamesPlayed ?? 0, icon: Activity, color: "text-blue-400" },
          { label: "Global Rank", value: stats?.rank ? `#${stats.rank}` : "—", icon: Trophy, color: "text-purple-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
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
                transition={{ delay: i * 0.1 }}
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

          {/* XP Bar */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">XP to Level {(user?.level ?? 1) + 1}</span>
                <span className="text-primary font-mono">{stats?.xpToNextLevel ?? 100} XP</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span>{xpPercent} / 100 XP</span>
                <span>Level {user?.level ?? 1}</span>
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
                <span className="text-muted-foreground capitalize w-24">{activity.mode}</span>
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
