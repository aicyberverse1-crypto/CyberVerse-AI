import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStartMultiplayerChallenge, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Swords, Shield, Zap, Trophy, XCircle, Minus, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioEffects } from "@/hooks/useAudio";
import { useQueryClient } from "@tanstack/react-query";
import type { MultiplayerResult } from "@workspace/api-client-react";
import { MultiplayerChallengeBodyOpponentDifficulty } from "@workspace/api-client-react";

const MODES = [
  { id: "phishing", label: "Phishing Detective" },
  { id: "defense", label: "Attack Defense" },
  { id: "builder", label: "Secure Builder" },
  { id: "escape", label: "Escape Room" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy", desc: "Beginner AI opponent", color: "text-primary" },
  { id: "medium", label: "Medium", desc: "Competent AI opponent", color: "text-yellow-400" },
  { id: "hard", label: "Hard", desc: "Elite AI opponent", color: "text-orange-400" },
  { id: "expert", label: "Expert", desc: "Master-level AI opponent", color: "text-red-400" },
];

export default function Multiplayer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetUser();
  const [mode, setMode] = useState("phishing");
  const [difficulty, setDifficulty] = useState<MultiplayerChallengeBodyOpponentDifficulty>(MultiplayerChallengeBodyOpponentDifficulty.medium);
  const [result, setResult] = useState<MultiplayerResult | null>(null);
  const [fighting, setFighting] = useState(false);

  const challenge = useStartMultiplayerChallenge();

  function handleChallenge() {
    audioEffects.alert();
    setFighting(true);
    setResult(null);

    // Simulate "battle" animation
    setTimeout(() => {
      challenge.mutate(
        { data: { mode, opponentDifficulty: difficulty } },
        {
          onSuccess: (data) => {
            setFighting(false);
            setResult(data);
            if (data.winner === "player") {
              audioEffects.victory();
              toast({ title: "Victory!", description: data.message });
            } else if (data.winner === "opponent") {
              audioEffects.error();
              toast({ title: "Defeated", description: data.message, variant: "destructive" });
            } else {
              audioEffects.success();
              toast({ title: "Draw!", description: data.message });
            }
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          },
          onError: () => {
            setFighting(false);
            audioEffects.error();
            toast({ title: "Challenge failed", description: "Server error", variant: "destructive" });
          },
        }
      );
    }, 2000);
  }

  const isAttacker = user?.hackerType === "attacker";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">Multiplayer Challenge</h1>
        <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
          vs AI Opponent
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Challenge AI opponents of varying skill levels. Your performance is scored against their simulated responses — beat them to earn XP and hint points!
      </p>

      {/* Config */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Battle Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Game Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`text-sm px-3 py-2 rounded-lg border transition-all ${
                    mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Opponent Difficulty</p>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all ${
                    difficulty === d.id ? `border-current bg-current/10 ${d.color}` : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-[10px] opacity-70">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fight button */}
      <AnimatePresence mode="wait">
        {!fighting && !result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              onClick={handleChallenge}
              size="lg"
              className="w-full gap-2 bg-primary text-primary-foreground font-bold text-base"
            >
              <Swords className="w-5 h-5" />
              Enter the Arena
            </Button>
          </motion.div>
        )}

        {fighting && (
          <motion.div key="fighting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="bg-card border-primary/30">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                      {isAttacker ? <Swords className="w-6 h-6 text-red-400" /> : <Shield className="w-6 h-6 text-primary" />}
                    </div>
                    <p className="text-sm font-mono text-foreground">{user?.username}</p>
                  </div>

                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-2xl"
                  >
                    ⚔️
                  </motion.div>

                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-red-400/20 flex items-center justify-center mx-auto mb-2">
                      <Swords className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">AI Opponent</p>
                  </div>
                </div>
                <p className="text-sm text-primary animate-pulse font-mono">BATTLE IN PROGRESS...</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {result && !fighting && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            {/* Result card */}
            <Card className={`border-2 ${
              result.winner === "player" ? "border-primary bg-primary/5" :
              result.winner === "opponent" ? "border-destructive bg-destructive/5" :
              "border-yellow-400 bg-yellow-400/5"
            }`}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">
                  {result.winner === "player" ? "🏆" : result.winner === "opponent" ? "💀" : "🤝"}
                </div>
                <p className={`text-xl font-bold mb-2 ${
                  result.winner === "player" ? "text-primary" :
                  result.winner === "opponent" ? "text-destructive" :
                  "text-yellow-400"
                }`}>
                  {result.winner === "player" ? "VICTORY!" : result.winner === "opponent" ? "DEFEATED" : "DRAW"}
                </p>
                <p className="text-sm text-muted-foreground mb-6">{result.message}</p>

                {/* Score comparison */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{user?.username}</p>
                    <p className="text-2xl font-bold font-mono text-foreground">{result.playerScore}</p>
                  </div>
                  <div className="text-muted-foreground font-bold">VS</div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{result.opponentName}</p>
                    <p className="text-2xl font-bold font-mono text-muted-foreground">{result.opponentScore}</p>
                  </div>
                </div>

                {/* Rewards */}
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="font-bold text-yellow-400">+{result.xpEarned} XP</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg">
                    <Trophy className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-primary">+{result.hintPointsEarned} HP</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => { setResult(null); }} className="w-full gap-2 bg-primary text-primary-foreground">
              <Swords className="w-4 h-4" /> Challenge Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats hint */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Reward Structure
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            {[
              { label: "Win", xp: "+50 XP", hp: "+30 HP", icon: "🏆" },
              { label: "Draw", xp: "+25 XP", hp: "+15 HP", icon: "🤝" },
              { label: "Loss", xp: "+10 XP", hp: "+5 HP", icon: "💀" },
            ].map((r) => (
              <div key={r.label} className="p-2 bg-muted/30 rounded-lg">
                <div className="text-lg mb-1">{r.icon}</div>
                <div className="font-medium text-foreground">{r.label}</div>
                <div className="text-yellow-400">{r.xp}</div>
                <div className="text-primary">{r.hp}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
