import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStartMultiplayerChallenge, useGetUser, useGetQuestions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Swords, Shield, Zap, Trophy, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioEffects } from "@/hooks/useAudio";
import { useQueryClient } from "@tanstack/react-query";
import type { MultiplayerResult } from "@workspace/api-client-react";
import { MultiplayerChallengeBodyOpponentDifficulty, GetQuestionsMode } from "@workspace/api-client-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_QUESTIONS = 5;
const TIME_PER_QUESTION = 12; // seconds
const CORRECT_BASE = 20;
const SPEED_BONUS_MAX = 10;

// AI typing speed ranges per difficulty (ms between "keystrokes" in the animation)
const AI_SPEED: Record<string, [number, number]> = {
  easy:   [900, 2400],
  medium: [500, 1600],
  hard:   [300, 1000],
  expert: [150, 600],
};

// AI answer accuracy per difficulty (0–1)
const AI_ACCURACY: Record<string, number> = {
  easy: 0.45, medium: 0.65, hard: 0.80, expert: 0.92,
};

const MODES = [
  { id: "phishing", label: "Phishing Detective", icon: "🎣" },
  { id: "defense",  label: "Attack Defense",     icon: "🛡️" },
  { id: "builder",  label: "Secure Builder",     icon: "🔒" },
  { id: "escape",   label: "Escape Room",        icon: "🚪" },
];

const DIFFICULTIES = [
  { id: "easy",   label: "Easy",   desc: "Beginner AI — 45% accuracy",    color: "text-primary" },
  { id: "medium", label: "Medium", desc: "Competent AI — 65% accuracy",   color: "text-yellow-400" },
  { id: "hard",   label: "Hard",   desc: "Elite AI — 80% accuracy",       color: "text-orange-400" },
  { id: "expert", label: "Expert", desc: "Master AI — 92% accuracy",      color: "text-red-400" },
];

type Phase = "setup" | "countdown" | "battle" | "result";

interface QuestionState {
  answered: boolean;
  selectedIdx: number | null;
  correct: boolean | null;
  timeLeft: number;
  scoreEarned: number;
  aiAnswered: boolean;
  aiCorrect: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Multiplayer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetUser();
  const challenge = useStartMultiplayerChallenge();

  // Setup state
  const [mode, setMode]       = useState("phishing");
  const [difficulty, setDiff] = useState<MultiplayerChallengeBodyOpponentDifficulty>(MultiplayerChallengeBodyOpponentDifficulty.medium);
  const [phase, setPhase]     = useState<Phase>("setup");
  const [countdown, setCountdown] = useState(3);

  // Battle state
  const [questionIdx, setQuestionIdx] = useState(0);
  const [qState, setQState]   = useState<QuestionState | null>(null);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [aiTotal, setAiTotal] = useState(0);
  const [history, setHistory] = useState<QuestionState[]>([]);
  const [result, setResult]   = useState<MultiplayerResult | null>(null);

  // Shuffled questions drawn from API
  const [activeQuestions, setActiveQuestions] = useState<typeof rawQuestions>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: rawQuestions = [] } = useGetQuestions({ mode: mode as GetQuestionsMode, difficulty: "medium" });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function shuffled<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  function clearTimers() {
    if (timerRef.current)   { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (aiTimerRef.current) { clearTimeout(aiTimerRef.current); aiTimerRef.current = null; }
  }

  // ─── Start countdown ───────────────────────────────────────────────────────
  function startBattle() {
    if (rawQuestions.length < TOTAL_QUESTIONS) {
      toast({ title: "Not enough questions loaded", description: "Please wait a moment and try again.", variant: "destructive" });
      return;
    }
    setActiveQuestions(shuffled(rawQuestions).slice(0, TOTAL_QUESTIONS));
    setPlayerTotal(0);
    setAiTotal(0);
    setHistory([]);
    setQuestionIdx(0);
    setResult(null);
    setCountdown(3);
    setPhase("countdown");
    audioEffects.alert();
  }

  // Countdown tick
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("battle"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ─── Load a question ───────────────────────────────────────────────────────
  const loadQuestion = useCallback((idx: number) => {
    clearTimers();
    const qs: QuestionState = {
      answered: false, selectedIdx: null, correct: null,
      timeLeft: TIME_PER_QUESTION, scoreEarned: 0,
      aiAnswered: false, aiCorrect: false,
    };
    setQState(qs);

    // Per-question countdown
    timerRef.current = setInterval(() => {
      setQState(prev => {
        if (!prev || prev.answered) return prev;
        const next = prev.timeLeft - 1;
        if (next <= 0) {
          clearTimers();
          // Time ran out — auto-submit as wrong
          const final = { ...prev, answered: true, timeLeft: 0, correct: false, scoreEarned: 0 };
          audioEffects.error();
          setHistory(h => [...h, final]);
          setPlayerTotal(p => p);
          setTimeout(() => advanceQuestion(idx + 1), 1200);
          return final;
        }
        return { ...prev, timeLeft: next };
      });
    }, 1000);

    // AI answer timer (random within difficulty range)
    const [minMs, maxMs] = AI_SPEED[difficulty] ?? [500, 1600];
    const aiDelay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    const aiCorrectness = Math.random() < (AI_ACCURACY[difficulty] ?? 0.65);
    aiTimerRef.current = setTimeout(() => {
      setQState(prev => {
        if (!prev) return prev;
        return { ...prev, aiAnswered: true, aiCorrect: aiCorrectness };
      });
      const aiPoints = aiCorrectness ? 20 + Math.round(10 * (AI_ACCURACY[difficulty] ?? 0.65)) : 0;
      setAiTotal(a => a + aiPoints);
    }, aiDelay);
  }, [difficulty]);

  useEffect(() => {
    if (phase === "battle") loadQuestion(questionIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIdx]);

  // ─── Player answer ─────────────────────────────────────────────────────────
  function handleAnswer(optIdx: number) {
    if (!qState || qState.answered) return;
    clearTimers();

    const q = activeQuestions[questionIdx];
    if (!q) return;

    const correct = optIdx === q.correctAnswer;
    const speedBonus = correct ? Math.round((qState.timeLeft / TIME_PER_QUESTION) * SPEED_BONUS_MAX) : 0;
    const earned = correct ? CORRECT_BASE + speedBonus : 0;

    if (correct) audioEffects.success(); else audioEffects.error();

    const final: QuestionState = {
      ...qState,
      answered: true, selectedIdx: optIdx,
      correct, scoreEarned: earned,
    };
    setQState(final);
    setHistory(h => [...h, final]);
    setPlayerTotal(p => p + earned);

    setTimeout(() => advanceQuestion(questionIdx + 1), 1400);
  }

  function advanceQuestion(next: number) {
    clearTimers();
    if (next >= TOTAL_QUESTIONS) {
      setPhase("result");
    } else {
      setQuestionIdx(next);
    }
  }

  // ─── Submit result to API ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "result") return;
    challenge.mutate(
      {
        data: {
          mode,
          opponentDifficulty: difficulty,
          // @ts-expect-error — extra fields the API now accepts
          playerScore: playerTotal,
          totalQuestions: TOTAL_QUESTIONS,
        },
      },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.winner === "player")          { audioEffects.victory(); toast({ title: "🏆 Victory!", description: data.message }); }
          else if (data.winner === "opponent")    { audioEffects.error();   toast({ title: "💀 Defeated", description: data.message, variant: "destructive" }); }
          else                                    { audioEffects.success(); toast({ title: "🤝 Draw!", description: data.message }); }
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        },
        onError: () => {
          audioEffects.error();
          toast({ title: "Server error", variant: "destructive" });
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  // ─── Current question ──────────────────────────────────────────────────────
  const currentQ = activeQuestions[questionIdx];
  const isAttacker = user?.hackerType === "attacker";
  const diff = DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[1];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">AI Battle Mode</h1>
        <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
          vs AI Opponent
        </Badge>
      </div>

      <AnimatePresence mode="wait">

        {/* ─── SETUP ─────────────────────────────────────────────────────── */}
        {phase === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Answer <strong>{TOTAL_QUESTIONS} real questions</strong> as fast as you can. The AI opponent is also racing — beat its score to win XP!
            </p>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Battle Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Mode */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Game Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(m => (
                      <button key={m.id} onClick={() => setMode(m.id)}
                        className={`text-sm px-3 py-2.5 rounded-lg border transition-all text-left flex items-center gap-2 ${
                          mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                        <span>{m.icon}</span> {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Opponent Difficulty</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFICULTIES.map(d => (
                      <button key={d.id} onClick={() => setDiff(d.id as MultiplayerChallengeBodyOpponentDifficulty)}
                        className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                          difficulty === d.id ? `border-current bg-current/10 ${d.color}` : "border-border text-muted-foreground hover:border-primary/30"}`}>
                        <div className="text-sm font-medium">{d.label}</div>
                        <div className="text-[10px] opacity-70">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scoring explainer */}
                <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                  <p className="text-foreground font-semibold mb-1.5">⚡ Scoring</p>
                  <p>✓ Correct answer = <span className="text-primary font-mono">20 pts</span></p>
                  <p>✓ Speed bonus = up to <span className="text-yellow-400 font-mono">+10 pts</span> (faster = more)</p>
                  <p>✗ Wrong or timed out = <span className="text-red-400 font-mono">0 pts</span></p>
                  <p className="pt-1">Each question has a <span className="text-orange-400 font-mono">{TIME_PER_QUESTION}s</span> timer.</p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={startBattle} size="lg" disabled={rawQuestions.length < TOTAL_QUESTIONS}
              className="w-full gap-2 font-bold text-base">
              <Swords className="w-5 h-5" />
              {rawQuestions.length < TOTAL_QUESTIONS ? "Loading questions…" : "Enter the Arena"}
            </Button>

            {/* Reward structure */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Reward Structure
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  {[
                    { label: "Win", xp: "+50 XP", hp: "+30 HP", icon: "🏆" },
                    { label: "Draw", xp: "+25 XP", hp: "+15 HP", icon: "🤝" },
                    { label: "Loss", xp: "+10 XP", hp: "+5 HP", icon: "💀" },
                  ].map(r => (
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
          </motion.div>
        )}

        {/* ─── COUNTDOWN ─────────────────────────────────────────────────── */}
        {phase === "countdown" && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-primary/30">
              <CardContent className="p-12 text-center">
                <p className="text-xs font-mono text-muted-foreground mb-4 tracking-widest">BATTLE STARTING IN</p>
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-8xl font-black font-mono ${countdown === 0 ? "text-primary" : "text-foreground"}`}
                >
                  {countdown === 0 ? "GO!" : countdown}
                </motion.div>
                <div className="flex items-center justify-center gap-8 mt-8">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-1">
                      {isAttacker ? <Swords className="w-5 h-5 text-red-400" /> : <Shield className="w-5 h-5 text-primary" />}
                    </div>
                    <p className="text-xs font-mono text-foreground">{user?.username}</p>
                  </div>
                  <span className="text-muted-foreground font-bold">VS</span>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center mx-auto mb-1">
                      <Swords className="w-5 h-5 text-red-400" />
                    </div>
                    <p className={`text-xs font-mono ${diff.color}`}>AI ({diff.label})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── BATTLE ────────────────────────────────────────────────────── */}
        {phase === "battle" && currentQ && qState && (
          <motion.div key={`battle-${questionIdx}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Score HUD */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-mono mb-0.5">{user?.username}</p>
                <p className="text-lg font-black text-primary font-mono">{playerTotal}</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[10px] text-muted-foreground font-mono">Q {questionIdx + 1}/{TOTAL_QUESTIONS}</p>
                <p className="text-xs font-bold text-foreground">VS</p>
              </div>
              <div className="bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-mono mb-0.5">AI ({diff.label})</p>
                <p className={`text-lg font-black font-mono ${diff.color}`}>{aiTotal}</p>
              </div>
            </div>

            {/* Timer bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {qState.timeLeft}s</span>
                <span className="text-yellow-400">Speed bonus: up to +{Math.round((qState.timeLeft / TIME_PER_QUESTION) * SPEED_BONUS_MAX)} pts</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-all ${qState.timeLeft > 6 ? "bg-primary" : qState.timeLeft > 3 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${(qState.timeLeft / TIME_PER_QUESTION) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* AI status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
              qState.aiAnswered
                ? qState.aiCorrect ? "border-red-400/40 bg-red-400/10 text-red-400" : "border-muted text-muted-foreground"
                : "border-orange-400/30 bg-orange-400/5 text-orange-400"
            }`}>
              <Swords className="w-3.5 h-3.5 shrink-0" />
              {qState.aiAnswered
                ? qState.aiCorrect ? "AI answered correctly ✓" : "AI got it wrong ✗"
                : <span className="animate-pulse">AI is thinking<span className="inline-flex"><motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.6 }}>.</motion.span><motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}>.</motion.span><motion.span animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}>.</motion.span></span></span>
              }
            </div>

            {/* Question card */}
            <Card className={`border ${qState.answered ? (qState.correct ? "border-green-400/40" : "border-red-400/40") : "border-primary/30"}`}>
              <CardContent className="p-5 space-y-4">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-3 leading-relaxed max-h-40 overflow-y-auto">
                  {currentQ.scenario}
                </pre>
                <div className="space-y-2">
                  {(currentQ.options as string[]).map((opt, i) => {
                    const isSelected = qState.selectedIdx === i;
                    const isCorrect  = i === currentQ.correctAnswer;
                    const showResult = qState.answered;
                    return (
                      <motion.button
                        key={i}
                        whileHover={!qState.answered ? { x: 3 } : {}}
                        onClick={() => handleAnswer(i)}
                        disabled={qState.answered}
                        className={`w-full text-left text-xs px-4 py-3 rounded-lg border transition-all font-mono ${
                          showResult
                            ? isCorrect
                              ? "border-green-400/60 bg-green-400/10 text-green-400"
                              : isSelected
                                ? "border-red-400/60 bg-red-400/10 text-red-400"
                                : "border-border text-muted-foreground opacity-40"
                            : "border-border hover:border-primary/50 hover:bg-primary/5 text-foreground"
                        }`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {showResult && isCorrect  && <CheckCircle className="w-3.5 h-3.5 inline ml-2 text-green-400" />}
                        {showResult && isSelected && !isCorrect && <XCircle  className="w-3.5 h-3.5 inline ml-2 text-red-400" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {qState.answered && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`text-xs px-3 py-2 rounded-lg border ${qState.correct ? "border-green-400/30 bg-green-400/5 text-green-400" : "border-red-400/30 bg-red-400/5 text-red-400"}`}>
                    {qState.correct
                      ? `✓ Correct! +${qState.scoreEarned} pts (${CORRECT_BASE} + ${qState.scoreEarned - CORRECT_BASE} speed bonus)`
                      : `✗ Wrong — ${questionIdx + 1 < TOTAL_QUESTIONS ? "Next question loading…" : "Battle complete!"}`}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => {
                const h = history[i];
                return (
                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                    i < history.length
                      ? h?.correct ? "bg-green-400" : "bg-red-400"
                      : i === questionIdx ? "bg-primary animate-pulse" : "bg-muted"
                  }`} />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── RESULT LOADING ───────────────────────────────────────────── */}
        {phase === "result" && !result && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-primary/30">
              <CardContent className="p-10 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-mono text-primary animate-pulse">Calculating battle results…</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── RESULT ────────────────────────────────────────────────────── */}
        {phase === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">

            {/* Outcome card */}
            <Card className={`border-2 ${
              result.winner === "player" ? "border-primary bg-primary/5" :
              result.winner === "opponent" ? "border-red-400 bg-red-400/5" :
              "border-yellow-400 bg-yellow-400/5"}`}>
              <CardContent className="p-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                  className="text-5xl mb-3">
                  {result.winner === "player" ? "🏆" : result.winner === "opponent" ? "💀" : "🤝"}
                </motion.div>
                <p className={`text-2xl font-black mb-1 ${
                  result.winner === "player" ? "text-primary" : result.winner === "opponent" ? "text-red-400" : "text-yellow-400"}`}>
                  {result.winner === "player" ? "VICTORY!" : result.winner === "opponent" ? "DEFEATED" : "DRAW"}
                </p>
                <p className="text-sm text-muted-foreground mb-5">{result.message}</p>

                {/* Score comparison */}
                <div className="flex items-center justify-center gap-8 mb-5">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{user?.username}</p>
                    <p className="text-3xl font-black font-mono text-primary">{result.playerScore}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {history.filter(h => h.correct).length}/{TOTAL_QUESTIONS} correct
                    </p>
                  </div>
                  <div className="text-muted-foreground font-bold text-lg">VS</div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{result.opponentName}</p>
                    <p className={`text-3xl font-black font-mono ${diff.color}`}>{result.opponentScore}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{diff.label} AI</p>
                  </div>
                </div>

                {/* Per-question breakdown */}
                <div className="grid grid-cols-5 gap-1.5 mb-5">
                  {history.map((h, i) => (
                    <div key={i} className={`rounded-md py-2 text-center border ${
                      h.correct ? "border-green-400/40 bg-green-400/10" : "border-red-400/40 bg-red-400/10"}`}>
                      <div className="text-[10px] text-muted-foreground font-mono">Q{i + 1}</div>
                      <div className={`text-sm font-black font-mono ${h.correct ? "text-green-400" : "text-red-400"}`}>
                        {h.scoreEarned}
                      </div>
                    </div>
                  ))}
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

            {/* Breakdown hint */}
            {result.winner === "opponent" && (
              <div className="bg-orange-400/5 border border-orange-400/20 rounded-lg p-3 text-xs text-muted-foreground">
                <span className="text-orange-400 font-bold">Tip: </span>
                Answer faster and more accurately — speed bonuses can add up to +{SPEED_BONUS_MAX} pts per question!
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => { setPhase("setup"); setResult(null); }}
                className="gap-2">
                <ChevronRight className="w-4 h-4" /> Change Setup
              </Button>
              <Button onClick={() => { setResult(null); setPhase("countdown"); setCountdown(3); startBattle(); }}
                className="gap-2">
                <Swords className="w-4 h-4" /> Rematch
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
