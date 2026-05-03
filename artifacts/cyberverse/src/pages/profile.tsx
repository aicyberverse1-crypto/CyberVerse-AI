import { useState } from "react";
import { motion } from "framer-motion";
import { useGetUser, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Swords, Star, Target, Zap, Trophy, TrendingUp, CheckCircle, Lightbulb, Flame } from "lucide-react";
import { audioEffects } from "@/hooks/useAudio";
import { BadgeDisplay, StreakTitle, BADGE_DEFS } from "@/components/BadgeDisplay";

// Avatar options — hacker personas
const AVATARS = [
  { id: "ghost", emoji: "👻", name: "Ghost", desc: "Invisible operator" },
  { id: "phantom", emoji: "🦅", name: "Phantom", desc: "Silent strike" },
  { id: "cipher", emoji: "💀", name: "Cipher", desc: "Unknown threat" },
  { id: "nova", emoji: "⚡", name: "Nova", desc: "Lightning fast" },
  { id: "zeus", emoji: "🌩", name: "Zeus", desc: "Digital storm" },
  { id: "viper", emoji: "🐍", name: "Viper", desc: "Deadly precision" },
  { id: "oracle", emoji: "🔮", name: "Oracle", desc: "Sees all threats" },
  { id: "titan", emoji: "🤖", name: "Titan", desc: "Iron defense" },
  { id: "wraith", emoji: "🌑", name: "Wraith", desc: "Shadow protocol" },
  { id: "cobra", emoji: "🦾", name: "Cobra", desc: "Augmented strike" },
  { id: "spectre", emoji: "🎭", name: "Spectre", desc: "Identity unknown" },
  { id: "nexus", emoji: "🕸", name: "Nexus", desc: "Web of networks" },
];

const RANK_COLORS: Record<string, string> = {
  "Bronze": "text-amber-600",
  "Silver": "text-slate-400",
  "Gold": "text-yellow-400",
  "Platinum": "text-cyan-400",
  "Diamond": "text-blue-400",
  "Elite Hacker": "text-purple-400",
};

// All possible badges - show as locked/unlocked
const ALL_BADGES = Object.entries(BADGE_DEFS);

export default function Profile() {
  const { data: user } = useGetUser();
  const { data: stats } = useGetDashboardStats();
  const [avatar, setAvatar] = useState(() => localStorage.getItem("cv_avatar") ?? "ghost");
  const [editing, setEditing] = useState(false);

  const rankColor = RANK_COLORS[user?.rankTier ?? "Bronze"] ?? "text-amber-600";
  const accuracy = stats?.accuracyRate ?? 0;
  const streakDays = user?.streakDays ?? 0;
  const winStreak = user?.winStreak ?? 0;
  const badges = user?.badges ?? [];

  // Analyze weak areas from mode scores
  const modeScores = [
    { mode: "Phishing", score: stats?.phishingScore ?? 0 },
    { mode: "Defense", score: stats?.defenseScore ?? 0 },
    { mode: "Builder", score: stats?.builderScore ?? 0 },
    { mode: "Escape", score: stats?.escapeScore ?? 0 },
  ];
  const maxModeScore = Math.max(...modeScores.map(m => m.score), 1);
  const weakAreas = modeScores.filter(m => m.score < (maxModeScore * 0.5) && stats?.gamesPlayed && stats.gamesPlayed > 2);

  function handleAvatarSelect(id: string) {
    setAvatar(id);
    localStorage.setItem("cv_avatar", id);
    audioEffects.success();
  }

  const selectedAvatar = AVATARS.find(a => a.id === avatar) ?? AVATARS[0];
  const isOnFire = streakDays >= 5;
  const isUnstoppable = streakDays >= 10;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <User className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Operator Profile</h1>
          <p className="text-xs text-muted-foreground font-mono">Your hacker identity and performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Avatar + identity */}
        <div className="space-y-4">
          <Card className={`bg-card border-border text-center ${isUnstoppable ? "shadow-[0_0_20px_rgba(248,113,113,0.2)]" : isOnFire ? "shadow-[0_0_16px_rgba(251,146,60,0.15)]" : ""}`}>
            <CardContent className="p-6">
              <motion.div
                key={avatar}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-5xl mx-auto mb-3 ${
                  isUnstoppable ? "border-red-400/50 shadow-[0_0_16px_rgba(248,113,113,0.4)]" :
                  isOnFire ? "border-orange-400/50 shadow-[0_0_12px_rgba(251,146,60,0.3)]" : ""
                }`}
              >
                {selectedAvatar.emoji}
              </motion.div>
              <h2 className="text-lg font-black text-foreground font-mono">{user?.username}</h2>
              <p className="text-xs text-muted-foreground font-mono">"{selectedAvatar.name}" — {selectedAvatar.desc}</p>
              <Badge className={`mt-2 text-xs ${rankColor} border-current bg-current/10`}>{user?.rankTier} Operator</Badge>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
                {user?.hackerType === "attacker" ? (
                  <><Swords className="w-3 h-3 text-red-400" /><span className="text-red-400">Red Team · Attacker ⚔️</span></>
                ) : (
                  <><Shield className="w-3 h-3 text-primary" /><span className="text-primary">Blue Team · Defender 🛡️</span></>
                )}
              </div>
              {/* Streak title */}
              {streakDays >= 3 && (
                <div className="flex justify-center mt-2">
                  <StreakTitle streakDays={streakDays} />
                </div>
              )}
              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex justify-center flex-wrap gap-1 mt-3">
                  <BadgeDisplay badges={badges} size="md" showLabels animate />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-xs gap-1.5"
                onClick={() => { setEditing(!editing); audioEffects.alert(); }}
              >
                {editing ? "✓ Done" : "Change Avatar"}
              </Button>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              {[
                { icon: Zap, label: "Level", value: user?.level ?? 1, color: "text-primary" },
                { icon: Target, label: "Total Score", value: (stats?.totalScore ?? 0).toLocaleString(), color: "text-primary" },
                { icon: TrendingUp, label: "Accuracy", value: `${accuracy.toFixed(0)}%`, color: accuracy >= 80 ? "text-primary" : "text-yellow-400" },
                { icon: Lightbulb, label: "Hint Points", value: user?.hintPoints ?? 0, color: "text-yellow-400" },
                { icon: Flame, label: "Login Streak", value: `${streakDays} days`, color: "text-orange-400" },
                { icon: Zap, label: "Win Streak", value: `${winStreak} wins`, color: "text-primary" },
                { icon: Trophy, label: "Games Played", value: stats?.gamesPlayed ?? 0, color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </div>
                  <span className={`font-bold font-mono ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Avatar selector + performance + badges */}
        <div className="md:col-span-2 space-y-4">
          {/* Avatar picker */}
          {editing && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-card border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Choose Your Hacker Persona</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="grid grid-cols-4 gap-2">
                    {AVATARS.map(a => (
                      <motion.button
                        key={a.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAvatarSelect(a.id)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          avatar === a.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="text-2xl">{a.emoji}</div>
                        <div className="text-[10px] font-mono mt-1 text-muted-foreground">{a.name}</div>
                        {avatar === a.id && <CheckCircle className="w-3 h-3 text-primary mx-auto mt-1" />}
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Badge showcase */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                🏅 Achievement Badges
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-3">
                {ALL_BADGES.map(([badgeId, def]) => {
                  const unlocked = badges.includes(badgeId);
                  return (
                    <motion.div
                      key={badgeId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        unlocked
                          ? `${def.color} bg-current/5`
                          : "border-border bg-muted/20 opacity-50"
                      }`}
                    >
                      <span className="text-xl shrink-0">{def.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{def.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{def.desc}</p>
                        {unlocked && (
                          <span className="text-[9px] text-primary font-mono">✓ UNLOCKED</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Performance breakdown */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              {modeScores.map(m => (
                <div key={m.mode}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{m.mode}</span>
                    <span className="font-mono text-foreground">{m.score.toLocaleString()} pts</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${maxModeScore > 0 ? (m.score / maxModeScore) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Memory: Weak areas */}
          {weakAreas.length > 0 && (
            <Card className="bg-card border-yellow-400/20">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5 mb-2">
                  <Star className="w-3.5 h-3.5" /> CyberGuard AI Recommends
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on your performance data, you should focus on:{" "}
                  <strong className="text-foreground">{weakAreas.map(w => w.mode).join(", ")}</strong>.
                  Your scores in these areas are lower than your other modes. Head to{" "}
                  <strong className="text-primary">Lab Mode</strong> to practice without pressure.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Hacker identity card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Operator Clearance File
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="font-mono text-xs space-y-2">
                {[
                  ["CALLSIGN", user?.username ?? "UNKNOWN"],
                  ["PERSONA", `${selectedAvatar.emoji} ${selectedAvatar.name}`],
                  ["ALLEGIANCE", user?.hackerType === "attacker" ? "⚔ RED TEAM · ATTACKER" : "🛡 BLUE TEAM · DEFENDER"],
                  ["CLEARANCE", user?.rankTier ?? "Bronze"],
                  ["LEVEL", `${user?.level ?? 1} (${user?.xp ?? 0} XP)`],
                  ["ACCURACY", `${(stats?.accuracyRate ?? 0).toFixed(1)}%`],
                  ["LOGIN STREAK", `${streakDays} days${streakDays >= 3 ? ` — ${user?.streakTitle ?? ""}` : ""}`],
                  ["WIN STREAK", `${winStreak} consecutive wins`],
                  ["MISSIONS COMPLETED", stats?.gamesPlayed ?? 0],
                  ["SKILL POINTS", user?.skillPoints ?? 0],
                  ["BADGES", badges.length > 0 ? badges.length + " earned" : "None yet"],
                  ["STATUS", "ACTIVE"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border pb-1.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-primary font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
