import { useRef } from "react";
import { motion } from "framer-motion";
import { useGetUser, useGetDashboardStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Download, Share2, Award, Star, Lock, CheckCircle } from "lucide-react";
import { audioEffects } from "@/hooks/useAudio";

const RANK_COLORS: Record<string, { text: string; border: string; glow: string; label: string }> = {
  "Bronze": { text: "#cd7f32", border: "#cd7f32", glow: "rgba(205,127,50,0.3)", label: "Bronze Operator" },
  "Silver": { text: "#94a3b8", border: "#94a3b8", glow: "rgba(148,163,184,0.3)", label: "Silver Operator" },
  "Gold": { text: "#eab308", border: "#eab308", glow: "rgba(234,179,8,0.3)", label: "Gold Operator" },
  "Platinum": { text: "#22d3ee", border: "#22d3ee", glow: "rgba(34,211,238,0.3)", label: "Platinum Operator" },
  "Diamond": { text: "#60a5fa", border: "#60a5fa", glow: "rgba(96,165,250,0.3)", label: "Diamond Operator" },
  "Elite Hacker": { text: "#a855f7", border: "#a855f7", glow: "rgba(168,85,247,0.3)", label: "Elite Hacker" },
};

const ACHIEVEMENTS = [
  { id: "first_login", label: "First Boot", desc: "Initialized the simulation", icon: "🖥️", req: (s: any) => true },
  { id: "score_100", label: "First Blood", desc: "Earned 100+ total score", icon: "🩸", req: (s: any) => (s?.totalScore ?? 0) >= 100 },
  { id: "score_500", label: "Cyber Soldier", desc: "Reached 500 total score", icon: "⚔️", req: (s: any) => (s?.totalScore ?? 0) >= 500 },
  { id: "score_1000", label: "Net Warrior", desc: "Reached 1,000 total score", icon: "🏹", req: (s: any) => (s?.totalScore ?? 0) >= 1000 },
  { id: "accuracy_80", label: "Sharp Eye", desc: "80%+ accuracy rate", icon: "🎯", req: (s: any) => (s?.accuracyRate ?? 0) >= 80 },
  { id: "accuracy_100", label: "Zero Fault", desc: "100% accuracy rate", icon: "💎", req: (s: any) => (s?.accuracyRate ?? 0) >= 100 },
  { id: "streak_3", label: "Streak Starter", desc: "3-day login streak", icon: "🔥", req: (s: any) => (s?.streakDays ?? 0) >= 3 },
  { id: "streak_7", label: "Streak Master", desc: "7-day login streak", icon: "⚡", req: (s: any) => (s?.streakDays ?? 0) >= 7 },
  { id: "games_5", label: "Active Operator", desc: "Completed 5+ missions", icon: "🛡️", req: (s: any) => (s?.gamesPlayed ?? 0) >= 5 },
  { id: "games_20", label: "Veteran", desc: "Completed 20+ missions", icon: "🏆", req: (s: any) => (s?.gamesPlayed ?? 0) >= 20 },
  { id: "rank_silver", label: "Promoted", desc: "Reached Silver rank", icon: "🥈", req: (s: any) => ["Silver","Gold","Platinum","Diamond","Elite Hacker"].includes(s?.rankTier ?? "") },
  { id: "rank_gold", label: "Gold Status", desc: "Reached Gold rank", icon: "🥇", req: (s: any) => ["Gold","Platinum","Diamond","Elite Hacker"].includes(s?.rankTier ?? "") },
];

export default function Certificate() {
  const certRef = useRef<HTMLDivElement>(null);
  const { data: user } = useGetUser();
  const { data: stats } = useGetDashboardStats();

  const rankInfo = RANK_COLORS[user?.rankTier ?? "Bronze"] ?? RANK_COLORS["Bronze"];
  const earned = ACHIEVEMENTS.filter(a => a.req(stats));
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  function handlePrint() {
    audioEffects.levelUp();
    window.print();
  }

  function handleShare() {
    audioEffects.success();
    if (navigator.share) {
      navigator.share({
        title: `${user?.username}'s CyberVerse AI Certificate`,
        text: `I'm a ${user?.rankTier} Operator on CyberVerse AI with ${stats?.totalScore} score and ${(stats?.accuracyRate ?? 0).toFixed(0)}% accuracy!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`CyberVerse AI Operator: ${user?.username} | Rank: ${user?.rankTier} | Score: ${stats?.totalScore}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Certificate of Achievement</h1>
            <p className="text-xs text-muted-foreground font-mono">Based on your verified performance metrics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 text-xs">
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 text-xs bg-primary text-black">
            <Download className="w-3.5 h-3.5" /> Print / Save
          </Button>
        </div>
      </div>

      {/* Certificate */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        ref={certRef}
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #020b12 0%, #031c2d 50%, #020b12 100%)",
          border: `2px solid ${rankInfo.border}`,
          borderRadius: "16px",
          boxShadow: `0 0 60px ${rankInfo.glow}, 0 0 120px ${rankInfo.glow}`,
          padding: "48px",
        }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />

        {/* Corner decorations */}
        {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 ${pos}`}
            style={{
              borderTop: i < 2 ? `2px solid ${rankInfo.border}` : undefined,
              borderBottom: i >= 2 ? `2px solid ${rankInfo.border}` : undefined,
              borderLeft: i % 2 === 0 ? `2px solid ${rankInfo.border}` : undefined,
              borderRight: i % 2 === 1 ? `2px solid ${rankInfo.border}` : undefined,
            }}
          />
        ))}

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8" style={{ color: rankInfo.text }} />
            <div>
              <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground uppercase">CyberVerse AI</div>
              <div className="text-xs font-mono tracking-[0.2em] text-muted-foreground">Security Simulation Platform</div>
            </div>
            <Shield className="w-8 h-8" style={{ color: rankInfo.text }} />
          </div>

          <div className="w-32 h-px mx-auto mb-4" style={{ background: `linear-gradient(to right, transparent, ${rankInfo.border}, transparent)` }} />

          <h1 className="text-2xl font-black tracking-widest text-white uppercase mb-1">Certificate of Achievement</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest">This certifies that the operator identified below has demonstrated proficiency in cybersecurity simulation</p>

          <div className="w-32 h-px mx-auto mt-4" style={{ background: `linear-gradient(to right, transparent, ${rankInfo.border}, transparent)` }} />
        </div>

        {/* Operator name */}
        <div className="text-center mb-8 relative z-10">
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-2">Operator Designation</p>
          <h2
            className="text-5xl font-black tracking-wider mb-2"
            style={{ color: rankInfo.text, textShadow: `0 0 30px ${rankInfo.glow}` }}
          >
            {user?.username ?? "OPERATOR"}
          </h2>
          <Badge
            className="text-sm px-4 py-1 font-mono font-bold"
            style={{ backgroundColor: `${rankInfo.border}20`, color: rankInfo.text, border: `1px solid ${rankInfo.border}40` }}
          >
            ◆ {rankInfo.label} ◆
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mb-8 relative z-10">
          {[
            { label: "Total Score", value: (stats?.totalScore ?? 0).toLocaleString() },
            { label: "Accuracy Rate", value: `${(stats?.accuracyRate ?? 0).toFixed(0)}%` },
            { label: "Missions Completed", value: stats?.gamesPlayed ?? 0 },
            { label: "Operator Level", value: user?.level ?? 1 },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-lg" style={{ border: `1px solid ${rankInfo.border}30`, background: `${rankInfo.border}08` }}>
              <div className="text-2xl font-black" style={{ color: rankInfo.text }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        {earned.length > 0 && (
          <div className="mb-8 relative z-10">
            <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-3 text-center">Achievements Unlocked ({earned.length}/{ACHIEVEMENTS.length})</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {earned.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono" style={{ border: `1px solid ${rankInfo.border}30`, background: `${rankInfo.border}08`, color: rankInfo.text }}>
                  <span>{a.icon}</span> {a.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-end justify-between relative z-10">
          <div>
            <div className="text-xs font-mono text-muted-foreground">Issued by</div>
            <div className="text-sm font-bold text-foreground">CyberVerse AI Platform</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">Simulated Environment — Educational Purpose</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-muted-foreground">Date of Issue</div>
            <div className="text-sm font-bold text-foreground">{today}</div>
            <div className="text-xs font-mono mt-1" style={{ color: rankInfo.text }}>
              {user?.hackerType === "attacker" ? "⚔ Red Team Operator" : "🛡 Blue Team Operator"}
            </div>
          </div>
        </div>

        {/* Serial */}
        <div className="text-center mt-4 relative z-10">
          <div className="text-[9px] font-mono text-muted-foreground/40">
            CERT-{user?.id?.toString().padStart(6,"0") ?? "000001"}-{user?.rankTier?.replace(" ","").toUpperCase()}-{new Date().getFullYear()}
          </div>
        </div>
      </motion.div>

      {/* Achievement grid */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            All Achievements ({earned.length}/{ACHIEVEMENTS.length} unlocked)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map(a => {
              const isEarned = a.req(stats);
              return (
                <motion.div
                  key={a.id}
                  whileHover={{ scale: 1.03 }}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isEarned ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-40"
                  }`}
                >
                  <div className="text-2xl mb-1">{isEarned ? a.icon : "🔒"}</div>
                  <div className={`text-xs font-bold ${isEarned ? "text-foreground" : "text-muted-foreground"}`}>{a.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{a.desc}</div>
                  {isEarned && <CheckCircle className="w-3 h-3 text-primary mx-auto mt-1.5" />}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
