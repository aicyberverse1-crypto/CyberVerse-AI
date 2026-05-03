import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateMission, useSubmitScore, useGetUser } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Swords, Shield, Target, Lightbulb, Star, Zap, RefreshCw,
  CheckCircle, Terminal, ChevronRight, Lock, Unlock, AlertTriangle,
  Cpu, Wifi, Eye, ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioEffects } from "@/hooks/useAudio";
import { useQueryClient } from "@tanstack/react-query";
import type { Mission } from "@workspace/api-client-react";

// ── Typing animation hook ───────────────────────────────────────────────────
function useTypingText(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

// ── Objective action icon map ───────────────────────────────────────────────
const OBJ_ICONS = [Target, Cpu, Wifi, Eye, ShieldCheck, Lock, AlertTriangle];

const DIFF_STYLES: Record<string, { label: string; color: string; ring: string }> = {
  Easy:   { label: "EASY",   color: "text-primary",    ring: "ring-primary/40" },
  Medium: { label: "MED",    color: "text-yellow-400", ring: "ring-yellow-400/40" },
  Hard:   { label: "HARD",   color: "text-orange-400", ring: "ring-orange-400/40" },
  Expert: { label: "EXPERT", color: "text-red-400",    ring: "ring-red-400/40" },
};

export default function Missions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetUser();
  const [mission, setMission] = useState<Mission | null>(null);
  const [phase, setPhase] = useState<"idle" | "briefing" | "action" | "complete">("idle");
  const [completedObjectives, setCompletedObjectives] = useState<Set<number>>(new Set());
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateMission = useGenerateMission();
  const submitScore = useSubmitScore();

  const isAttacker = user?.hackerType === "attacker";
  const accent = isAttacker ? "red-400" : "primary";
  const accentText = isAttacker ? "text-red-400" : "text-primary";
  const accentBg = isAttacker ? "bg-red-400/10 border-red-400/30" : "bg-primary/10 border-primary/30";
  const accentRing = isAttacker ? "ring-red-400/40" : "ring-primary/40";
  const accentGlow = isAttacker
    ? "shadow-[0_0_20px_rgba(248,113,113,0.35)]"
    : "shadow-[0_0_20px_rgba(16,185,129,0.35)]";

  // Timer
  useEffect(() => {
    if (phase === "action") {
      setElapsedSecs(0);
      timerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function handleGenerate() {
    audioEffects.alert();
    setMission(null);
    setCompletedObjectives(new Set());
    setExecutingIdx(null);
    setFlashIdx(null);
    setHintsOpen(false);
    setPhase("idle");
    generateMission.mutate(undefined, {
      onSuccess: (data) => {
        audioEffects.success();
        setMission(data);
        setPhase("briefing");
      },
      onError: () => {
        audioEffects.error();
        toast({ title: "Mission generation failed", description: "AI unavailable. Try again.", variant: "destructive" });
      },
    });
  }

  function handleStartMission() {
    audioEffects.typing();
    setPhase("action");
  }

  async function handleObjectiveClick(idx: number) {
    if (completedObjectives.has(idx) || executingIdx !== null || phase !== "action") return;

    setExecutingIdx(idx);
    audioEffects.typing();

    // Simulate execution delay
    await new Promise(r => setTimeout(r, 900));

    audioEffects.success();
    setFlashIdx(idx);
    setTimeout(() => setFlashIdx(null), 1200);

    const next = new Set(completedObjectives);
    next.add(idx);
    setCompletedObjectives(next);
    setExecutingIdx(null);

    if (mission && next.size === mission.objectives.length) {
      setTimeout(() => completeMission(next), 600);
    }
  }

  function completeMission(completed: Set<number>) {
    if (!mission) return;
    audioEffects.victory();
    setPhase("complete");
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
  }

  const diff = mission ? (DIFF_STYLES[mission.difficulty] ?? DIFF_STYLES["Medium"]) : null;
  const progress = mission ? (completedObjectives.size / mission.objectives.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-0">

      {/* ── IDLE / GENERATE ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === "idle" && !generateMission.isPending && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            {/* Scan lines overlay */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)" }} />

              <div className="p-10 text-center space-y-6 relative z-10">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-2 ${accentRing} ${accentBg} ${accentGlow}`}
                >
                  <Swords className={`w-9 h-9 ${accentText}`} />
                </motion.div>

                <div>
                  <h1 className={`text-2xl font-black tracking-wider font-mono ${accentText}`}>AI MISSION CONTROL</h1>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    CyberGuard AI will generate a live, personalized mission briefing tailored to your operator profile.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 text-xs font-mono text-muted-foreground">
                  {user && (
                    <Badge variant="outline" className={`${isAttacker ? "border-red-400/30 text-red-400" : "border-primary/30 text-primary"} gap-1`}>
                      {isAttacker ? <Swords className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {isAttacker ? "Red Team" : "Blue Team"}
                    </Badge>
                  )}
                  <span className="text-muted-foreground/50">•</span>
                  <span>Operator: <span className={accentText}>{user?.username ?? "—"}</span></span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Lvl <span className={accentText}>{user?.level ?? 1}</span></span>
                </div>

                <Button
                  onClick={handleGenerate}
                  size="lg"
                  className={`gap-2 px-8 font-mono text-sm ${isAttacker ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground"} ${accentGlow}`}
                >
                  <Zap className="w-4 h-4" /> INITIALIZE MISSION
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── GENERATING ───────────────────────────────────────────────── */}
        {generateMission.isPending && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-border bg-card p-10"
          >
            <TerminalLoader isAttacker={isAttacker} accentText={accentText} />
          </motion.div>
        )}

        {/* ── BRIEFING ─────────────────────────────────────────────────── */}
        {phase === "briefing" && mission && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <BriefingPanel
              mission={mission}
              diff={diff!}
              accentText={accentText}
              accentBg={accentBg}
              accentGlow={accentGlow}
              isAttacker={isAttacker}
              onStart={handleStartMission}
            />
          </motion.div>
        )}

        {/* ── ACTION PHASE ─────────────────────────────────────────────── */}
        {(phase === "action" || phase === "complete") && mission && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* HUD bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded text-[11px] font-mono font-bold border ${diff!.color} border-current bg-current/5`}>
                  {diff!.label}
                </div>
                <span className={`text-xs font-mono font-bold ${accentText}`}>{mission.title}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className={`tabular-nums ${phase === "complete" ? "text-primary" : ""}`}>⏱ {formatTime(elapsedSecs)}</span>
                <span>{completedObjectives.size}/{mission.objectives.length}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isAttacker ? "bg-red-400" : "bg-primary"}`}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Scenario strip */}
            <div className={`rounded-xl border ${accentBg} px-4 py-3`}>
              <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-widest">// ACTIVE BRIEFING</p>
              <p className="text-sm text-foreground/85 leading-relaxed">{mission.scenario}</p>
            </div>

            {/* Objective cards */}
            <div className="space-y-3">
              {mission.objectives.map((obj, i) => {
                const ObjIcon = OBJ_ICONS[i % OBJ_ICONS.length];
                const done = completedObjectives.has(i);
                const executing = executingIdx === i;
                const flashing = flashIdx === i;
                const locked = !done && executingIdx !== null && executingIdx !== i;

                return (
                  <motion.button
                    key={i}
                    onClick={() => handleObjectiveClick(i)}
                    disabled={done || locked || phase === "complete"}
                    whileHover={!done && !locked ? { scale: 1.015, y: -1 } : {}}
                    whileTap={!done && !locked ? { scale: 0.98 } : {}}
                    animate={
                      flashing ? { boxShadow: ["0 0 0px #10b981", "0 0 32px #10b981", "0 0 0px #10b981"] } :
                      executing ? {} : {}
                    }
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-300 group relative overflow-hidden
                      ${done
                        ? "bg-primary/10 border-primary/40 cursor-default"
                        : locked
                          ? "bg-muted/20 border-border opacity-40 cursor-not-allowed"
                          : `bg-card border-border hover:border-current hover:${accentBg} cursor-pointer`
                      }`}
                  >
                    {/* Scan line on hover */}
                    {!done && !locked && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 6px)" }} />
                    )}

                    {/* Executing shimmer */}
                    {executing && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 0.7, ease: "linear" }}
                      />
                    )}

                    <div className="flex items-start gap-4 relative z-10">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                        done ? "bg-primary/20 ring-1 ring-primary/40" :
                        executing ? `bg-yellow-400/15 ring-1 ring-yellow-400/40` :
                        "bg-muted/40 group-hover:bg-primary/10"
                      }`}>
                        {done
                          ? <CheckCircle className="w-5 h-5 text-primary" />
                          : executing
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                                <Cpu className="w-5 h-5 text-yellow-400" />
                              </motion.div>
                            : <ObjIcon className={`w-5 h-5 text-muted-foreground group-hover:${accentText} transition-colors`} />
                        }
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                            done ? "text-primary" : executing ? "text-yellow-400" : "text-muted-foreground"
                          }`}>
                            {done ? "✓ EXECUTED" : executing ? "EXECUTING..." : `OBJ ${String(i + 1).padStart(2, "0")}`}
                          </span>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${done ? "text-primary border-primary/30" : "text-muted-foreground border-border"}`}>
                            +{obj.xpReward} XP
                          </Badge>
                        </div>
                        <p className={`text-sm leading-snug ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {obj.text}
                        </p>
                        {!done && !executing && !locked && (
                          <p className={`text-[11px] font-mono mt-1.5 ${accentText} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                            <ChevronRight className="w-3 h-3" /> CLICK TO EXECUTE
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Hints accordion */}
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 overflow-hidden">
              <button
                onClick={() => setHintsOpen(h => !h)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono font-bold text-yellow-400 uppercase tracking-widest hover:bg-yellow-400/5 transition-colors"
              >
                <span className="flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5" /> Intel Hints ({mission.hints.length})</span>
                <motion.span animate={{ rotate: hintsOpen ? 90 : 0 }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.span>
              </button>
              <AnimatePresence>
                {hintsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-yellow-400/10">
                      {mission.hints.map((hint, i) => (
                        <div key={i} className="flex gap-2 text-sm text-foreground/80 pt-2">
                          <span className="text-yellow-400 font-mono shrink-0">[{i + 1}]</span>
                          {hint}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rewards strip */}
            <div className="flex items-center gap-6 px-4 py-3 rounded-xl border border-border bg-muted/20 text-sm">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" /> Rewards
              </span>
              <div className="flex gap-5 ml-auto">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-bold font-mono text-yellow-400">+{mission.rewards.xp + mission.objectives.reduce((s, o) => s + o.xpReward, 0)} XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold font-mono text-primary">+{mission.rewards.score} pts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-bold font-mono text-yellow-400">+{mission.rewards.hintPoints} HP</span>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={handleGenerate} size="sm" className="gap-2 w-full font-mono text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" /> ABORT & GENERATE NEW MISSION
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MISSION COMPLETE OVERLAY ──────────────────────────────────── */}
      <AnimatePresence>
        {phase === "complete" && mission && (
          <MissionCompleteOverlay
            mission={mission}
            elapsed={elapsedSecs}
            accentText={accentText}
            accentBg={accentBg}
            accentGlow={accentGlow}
            isAttacker={isAttacker}
            onNext={handleGenerate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TerminalLoader({ isAttacker, accentText }: { isAttacker: boolean; accentText: string }) {
  const lines = [
    "Connecting to CyberGuard AI...",
    "Profiling operator data...",
    "Analyzing threat landscape...",
    "Generating mission parameters...",
    "Encrypting briefing packet...",
  ];
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (i < lines.length) { setVisibleLines(prev => [...prev, lines[i]]); i++; }
      else clearInterval(id);
    }, 480);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${isAttacker ? "bg-red-400" : "bg-primary"} animate-pulse`} />
        <span className={`text-xs font-mono font-bold ${accentText} uppercase tracking-widest`}>Initializing Mission</span>
      </div>
      <div className="bg-black/40 rounded-lg p-4 font-mono text-xs space-y-1.5 border border-border min-h-[140px]">
        {visibleLines.map((line, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
            <span className={`${accentText}`}>{'>'}</span>
            <span className="text-foreground/70">{line}</span>
            {i === visibleLines.length - 1 && (
              <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>█</motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BriefingPanel({
  mission, diff, accentText, accentBg, accentGlow, isAttacker, onStart
}: {
  mission: Mission;
  diff: { label: string; color: string; ring: string };
  accentText: string;
  accentBg: string;
  accentGlow: string;
  isAttacker: boolean;
  onStart: () => void;
}) {
  const { displayed, done } = useTypingText(mission.scenario, 16);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAttacker ? "bg-red-400" : "bg-primary"} animate-pulse`} />
          <span className={`text-xs font-mono font-bold ${accentText} uppercase tracking-widest`}>Mission Briefing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-mono font-bold border px-2 py-0.5 rounded ${diff.color} border-current bg-current/5`}>{diff.label}</span>
          <span className={`text-[11px] font-mono ${accentText}`}>{mission.hackerType}</span>
        </div>
      </div>

      {/* Title card */}
      <div className={`rounded-xl border ${accentBg} p-5 ${accentGlow}`}>
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" /> CLASSIFIED BRIEFING
        </p>
        <h2 className={`text-lg font-black font-mono tracking-wide ${accentText} mb-3`}>{mission.title}</h2>
        <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-foreground/85 leading-relaxed min-h-[80px] border border-border/50">
          {displayed}
          {!done && (
            <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>█</motion.span>
          )}
        </div>
      </div>

      {/* Objective preview */}
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
          {mission.objectives.length} Objectives Assigned
        </p>
        <div className="space-y-1.5">
          {mission.objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Lock className="w-3 h-3 shrink-0" />
              <span className="truncate">{obj.text.length > 60 ? obj.text.slice(0, 60) + "…" : obj.text}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={onStart}
        disabled={!done}
        size="lg"
        className={`w-full gap-2 font-mono font-bold tracking-widest ${
          isAttacker ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground"
        } ${done ? accentGlow : ""} transition-all`}
      >
        {done ? (
          <><Unlock className="w-4 h-4" /> ACCEPT MISSION</>
        ) : (
          <><motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>█</motion.span> Decrypting...</>
        )}
      </Button>
    </div>
  );
}

function MissionCompleteOverlay({
  mission, elapsed, accentText, accentBg, accentGlow, isAttacker, onNext
}: {
  mission: Mission;
  elapsed: number;
  accentText: string;
  accentBg: string;
  accentGlow: string;
  isAttacker: boolean;
  onNext: () => void;
}) {
  const totalXp = mission.objectives.reduce((s, o) => s + o.xpReward, 0) + mission.rewards.xp;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className={`relative max-w-md w-full rounded-2xl border ${accentBg} bg-card overflow-hidden ${accentGlow}`}
      >
        {/* Scan lines */}
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }} />

        {/* Animated border top */}
        <motion.div
          className={`h-1 w-full ${isAttacker ? "bg-red-400" : "bg-primary"}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />

        <div className="p-8 text-center space-y-5 relative z-10">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, stiffness: 180 }}
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-2 ${isAttacker ? "ring-red-400/50 bg-red-400/10" : "ring-primary/50 bg-primary/10"} ${accentGlow}`}
          >
            <ShieldCheck className={`w-10 h-10 ${accentText}`} />
          </motion.div>

          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.25em] mb-1">Status Update</p>
            <h2 className={`text-2xl font-black font-mono tracking-wider ${accentText}`}>THREAT NEUTRALIZED</h2>
            <p className="text-sm text-muted-foreground mt-1">{mission.title}</p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: Zap, label: "XP Gained", value: `+${totalXp}`, color: "text-yellow-400" },
              { icon: Target, label: "Score", value: `+${mission.rewards.score}`, color: accentText },
              { icon: Star, label: "Time", value: formatTime(elapsed), color: "text-blue-400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-muted/30 border border-border p-3">
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                <div className={`text-base font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Objectives completed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="text-xs font-mono text-muted-foreground"
          >
            {mission.objectives.length}/{mission.objectives.length} objectives completed •{" "}
            <span className={accentText}>+{mission.rewards.hintPoints} hint points awarded</span>
          </motion.div>

          {/* Next mission button */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Button
              onClick={onNext}
              size="lg"
              className={`w-full gap-2 font-mono font-bold tracking-widest ${
                isAttacker ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground"
              } ${accentGlow}`}
            >
              <Zap className="w-4 h-4" /> NEXT MISSION
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
