import { motion, AnimatePresence } from "framer-motion";
import { useGetSkills, useUnlockSkill, useGetUser, useSetHackerType } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TreePine, Shield, Swords, Lightbulb, Lock, CheckCircle, Star, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { audioEffects } from "@/hooks/useAudio";

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, Lightbulb, RefreshCw, Swords, Star, Lock,
  ShieldCheck: Shield, Scan: Shield, Bot: Shield, Code2: Swords,
  Zap: Star, Target: Star, Cpu: Star,
};

const DEFENDER_COLOR = "text-primary border-primary/30 bg-primary/5";
const ATTACKER_COLOR = "text-red-400 border-red-400/30 bg-red-400/5";

export default function SkillTree() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetUser();
  const { data: skillsData, isLoading } = useGetSkills();
  const unlockSkill = useUnlockSkill();
  const setHackerType = useSetHackerType();

  function handleUnlock(skillId: string, skillName: string) {
    audioEffects.typing();
    unlockSkill.mutate(
      { data: { skillId } },
      {
        onSuccess: (data) => {
          audioEffects.levelUp();
          toast({ title: `${skillName} Unlocked!`, description: data.message });
          queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        },
        onError: (err) => {
          audioEffects.error();
          toast({ title: "Cannot Unlock", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  function handleSwitchType() {
    const newType = user?.hackerType === "defender" ? "attacker" : "defender";
    setHackerType.mutate(
      { data: { hackerType: newType } },
      {
        onSuccess: () => {
          audioEffects.alert();
          toast({ title: "Hacker Type Updated", description: `Switched to ${newType}!` });
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
        },
        onError: (err) => {
          audioEffects.error();
          toast({ title: "Switch failed", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-primary animate-pulse text-sm font-mono">Loading skill tree...</div></div>;
  }

  const { skills = [], unlockedSkills = [], skillPoints = 0, hackerType = "defender" } = skillsData ?? {};

  const defenderSkills = skills.filter((s) => s.type === "defender");
  const attackerSkills = skills.filter((s) => s.type === "attacker");
  const mySkills = hackerType === "defender" ? defenderSkills : attackerSkills;
  const isDefender = hackerType === "defender";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TreePine className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Skill Tree</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-yellow-400/30 text-yellow-400">
            <Star className="w-3 h-3 mr-1" />
            {skillPoints} Skill Points
          </Badge>
          <Badge variant="outline" className={isDefender ? "border-primary/30 text-primary" : "border-red-400/30 text-red-400"}>
            {isDefender ? <Shield className="w-3 h-3 mr-1" /> : <Swords className="w-3 h-3 mr-1" />}
            {isDefender ? "Defender" : "Attacker"}
          </Badge>
        </div>
      </div>

      {/* Switch type + info */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Hacker Path: <span className={isDefender ? "text-primary" : "text-red-400"}>{isDefender ? "Defender (Blue Team)" : "Attacker (Red Team)"}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Earn 1 skill point per level up. Switching resets your skill access.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSwitchType} disabled={setHackerType.isPending}
            className="gap-2 text-xs">
            {isDefender ? <Swords className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
            Switch to {isDefender ? "Attacker" : "Defender"}
          </Button>
        </CardContent>
      </Card>

      {/* Skill grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mySkills.map((skill, i) => {
          const isUnlocked = unlockedSkills.includes(skill.id);
          const canAfford = skillPoints >= skill.cost;
          const Icon = ICON_MAP[skill.icon] ?? Shield;
          const colorClass = isDefender ? DEFENDER_COLOR : ATTACKER_COLOR;

          return (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className={`border transition-all ${isUnlocked ? colorClass : "border-border bg-card opacity-80"} ${!isUnlocked && canAfford ? "hover:border-primary/50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isUnlocked ? (isDefender ? "bg-primary/20" : "bg-red-400/20") : "bg-muted"}`}>
                      {isUnlocked
                        ? <Icon className={`w-5 h-5 ${isDefender ? "text-primary" : "text-red-400"}`} />
                        : <Lock className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-semibold ${isUnlocked ? (isDefender ? "text-primary" : "text-red-400") : "text-muted-foreground"}`}>
                          {skill.name}
                        </p>
                        {isUnlocked && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />}
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                          {skill.cost} SP
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
                      <div className={`text-[10px] px-2 py-1 rounded text-center ${isDefender ? "bg-primary/10 text-primary" : "bg-red-400/10 text-red-400"}`}>
                        {skill.effect}
                      </div>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <Button
                      onClick={() => handleUnlock(skill.id, skill.name)}
                      disabled={!canAfford || unlockSkill.isPending}
                      size="sm"
                      className={`w-full mt-3 text-xs gap-2 ${isDefender ? "bg-primary text-primary-foreground" : "bg-red-400 text-white hover:bg-red-400/90"} ${!canAfford ? "opacity-50" : ""}`}
                    >
                      <Star className="w-3 h-3" />
                      {canAfford ? `Unlock (${skill.cost} SP)` : `Need ${skill.cost - skillPoints} more SP`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Skill points guide */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">How to Earn Skill Points</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pb-4">
          <div className="flex items-center gap-2"><Star className="w-3 h-3 text-yellow-400" /> +1 per Level Up</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-primary" /> Level up by earning 100 XP</div>
          <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-primary" /> +20 XP per correct answer</div>
          <div className="flex items-center gap-2"><Lightbulb className="w-3 h-3 text-yellow-400" /> Complete game modes for XP</div>
        </CardContent>
      </Card>
    </div>
  );
}
