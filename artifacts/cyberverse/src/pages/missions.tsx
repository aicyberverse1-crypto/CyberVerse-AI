import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateMission, useSubmitScore, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Swords, Shield, Target, Lightbulb, Star, Zap, RefreshCw, CheckCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioEffects } from "@/hooks/useAudio";
import { useQueryClient } from "@tanstack/react-query";
import type { Mission } from "@workspace/api-client-react";

export default function Missions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetUser();
  const [mission, setMission] = useState<Mission | null>(null);
  const [completedObjectives, setCompletedObjectives] = useState<Set<number>>(new Set());
  const [missionComplete, setMissionComplete] = useState(false);

  const generateMission = useGenerateMission();
  const submitScore = useSubmitScore();

  const isAttacker = user?.hackerType === "attacker";
  const primaryColor = isAttacker ? "text-red-400" : "text-primary";
  const primaryBg = isAttacker ? "bg-red-400/10 border-red-400/30" : "bg-primary/10 border-primary/30";

  function handleGenerate() {
    audioEffects.alert();
    setMission(null);
    setCompletedObjectives(new Set());
    setMissionComplete(false);
    generateMission.mutate(undefined, {
      onSuccess: (data) => {
        audioEffects.success();
        setMission(data);
      },
      onError: () => {
        audioEffects.error();
        toast({ title: "Mission generation failed", description: "AI is unavailable. Try again.", variant: "destructive" });
      },
    });
  }

  function toggleObjective(idx: number) {
    if (missionComplete) return;
    audioEffects.typing();
    const next = new Set(completedObjectives);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setCompletedObjectives(next);

    if (mission && next.size === mission.objectives.length) {
      handleCompleteMission(next);
    }
  }

  function handleCompleteMission(completed: Set<number>) {
    if (!mission) return;
    audioEffects.victory();
    setMissionComplete(true);

    const totalXp = mission.objectives.reduce((sum, obj) => sum + obj.xpReward, 0);
    submitScore.mutate(
      { data: { mode: "mission", score: mission.rewards.score, xpEarned: totalXp + mission.rewards.xp, isCorrect: true } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          if (data.leveledUp) {
            audioEffects.levelUp();
            toast({ title: "LEVEL UP!", description: `Now Level ${data.level}!` });
          }
        },
      }
    );
    toast({ title: "Mission Complete!", description: `+${mission.rewards.xp + mission.objectives.reduce((s, o) => s + o.xpReward, 0)} XP earned!` });
  }

  const diffColor = (d: string) => {
    const map: Record<string, string> = { Easy: "text-primary", Medium: "text-yellow-400", Hard: "text-orange-400", Expert: "text-red-400" };
    return map[d] ?? "text-muted-foreground";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className={`w-5 h-5 ${primaryColor}`} />
          <h1 className="text-xl font-bold">AI Missions</h1>
        </div>
        {user && (
          <Badge variant="outline" className={isAttacker ? "border-red-400/30 text-red-400" : "border-primary/30 text-primary"}>
            {isAttacker ? <Swords className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
            {isAttacker ? "Red Team" : "Blue Team"}
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        CyberGuard AI generates personalized missions based on your hacker type, skill level, and performance history.
      </p>

      {!mission && !generateMission.isPending && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${primaryBg}`}>
              <Swords className={`w-8 h-8 ${primaryColor}`} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Ready for a personalized challenge?</p>
              <p className="text-sm text-muted-foreground mt-1">AI will craft a mission tailored to your {user?.hackerType ?? "defender"} profile and skill level.</p>
            </div>
            <Button onClick={handleGenerate} size="lg" className={`gap-2 ${isAttacker ? "bg-red-400 hover:bg-red-400/90 text-white" : "bg-primary text-primary-foreground"}`}>
              <Zap className="w-4 h-4" /> Generate Mission
            </Button>
          </CardContent>
        </Card>
      )}

      {generateMission.isPending && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center space-y-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className={`w-10 h-10 rounded-full border-2 border-t-transparent mx-auto ${isAttacker ? "border-red-400" : "border-primary"}`}
            />
            <p className="text-sm text-muted-foreground animate-pulse">CyberGuard AI is crafting your mission...</p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {mission && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Mission Header */}
            <Card className={`border ${primaryBg}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${diffColor(mission.difficulty)} border-current`}>
                        {mission.difficulty}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${primaryColor} border-current`}>
                        {mission.hackerType}
                      </Badge>
                    </div>
                    <CardTitle className={`text-base ${primaryColor}`}>{mission.title}</CardTitle>
                  </div>
                  {missionComplete && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0">
                      <CheckCircle className="w-3 h-3 mr-1" /> Complete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{mission.scenario}</p>
              </CardContent>
            </Card>

            {/* Objectives */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" /> Objectives
                  <span className="ml-auto text-foreground">{completedObjectives.size}/{mission.objectives.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {mission.objectives.map((obj, i) => (
                  <motion.button
                    key={i}
                    onClick={() => toggleObjective(i)}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      completedObjectives.has(i)
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 ${
                      completedObjectives.has(i) ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                      {completedObjectives.has(i) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${completedObjectives.has(i) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {obj.text}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0">
                      +{obj.xpReward} XP
                    </Badge>
                  </motion.button>
                ))}
              </CardContent>
            </Card>

            {/* Hints */}
            <Card className="bg-yellow-400/5 border-yellow-400/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5" /> Mission Hints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {mission.hints.map((hint, i) => (
                  <div key={i} className="flex gap-2 text-sm text-foreground/80">
                    <span className="text-yellow-400 shrink-0">{i + 1}.</span>
                    {hint}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Rewards */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" /> Mission Rewards
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-yellow-400">+{mission.rewards.xp + mission.objectives.reduce((s, o) => s + o.xpReward, 0)} XP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary">+{mission.rewards.score} pts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-yellow-400">+{mission.rewards.hintPoints} HP</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate} className="gap-2 flex-1">
                <RefreshCw className="w-4 h-4" /> New Mission
              </Button>
              {missionComplete && (
                <Button onClick={handleGenerate} className={`gap-2 flex-1 ${isAttacker ? "bg-red-400 text-white" : "bg-primary text-primary-foreground"}`}>
                  <Zap className="w-4 h-4" /> Next Mission
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
