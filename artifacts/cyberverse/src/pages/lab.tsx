import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetQuestions, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, CheckCircle, XCircle, RotateCcw, ChevronRight, Trophy, Target, Lightbulb } from "lucide-react";
import { audioEffects } from "@/hooks/useAudio";

const MODES = [
  { id: "phishing", label: "Phishing Detection", icon: "🎣", color: "text-yellow-400", desc: "Practice identifying phishing emails, smishing, and social engineering" },
  { id: "defense", label: "Attack Defense", icon: "🛡", color: "text-blue-400", desc: "Learn to recognize and respond to cyber attack patterns" },
  { id: "builder", label: "Secure Builder", icon: "🔐", color: "text-primary", desc: "Master secure design principles and authentication best practices" },
  { id: "escape", label: "Escape Room", icon: "🔓", color: "text-purple-400", desc: "Solve cryptographic and encoding puzzles without time pressure" },
];
const DIFFICULTIES = ["easy", "medium", "hard", "expert"];

type Question = {
  id: number;
  mode: string;
  scenario: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
};

export default function Lab() {
  const [mode, setMode] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [started, setStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });

  const { data: questions } = useGetQuestions(
    { mode: mode as "phishing" | "defense" | "builder" | "escape" | undefined, difficulty: difficulty as any },
    { enabled: !!mode && started }
  );

  const q: Question | undefined = questions?.[qIndex % (questions?.length || 1)] as Question | undefined;

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    const isCorrect = idx === q?.correctAnswer;
    if (isCorrect) {
      audioEffects.success();
      setSessionStats(prev => {
        const newStreak = prev.streak + 1;
        return { ...prev, correct: prev.correct + 1, total: prev.total + 1, streak: newStreak, bestStreak: Math.max(prev.bestStreak, newStreak) };
      });
    } else {
      audioEffects.error();
      setSessionStats(prev => ({ ...prev, total: prev.total + 1, streak: 0 }));
    }
  }

  function handleNext() {
    setSelected(null);
    setShowExplanation(false);
    setQIndex(prev => prev + 1);
    audioEffects.typing();
  }

  function handleReset() {
    setMode(null);
    setStarted(false);
    setQIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setSessionStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  }

  if (!mode || !started) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Cyber Lab — Practice Mode</h1>
            <p className="text-xs text-muted-foreground">No timer · No penalty · Unlimited attempts · Full explanations</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary font-bold">Lab Mode</span> is a pressure-free environment to build your cybersecurity knowledge.
          You get immediate explanations after every question — no score deductions, no time limits.
          Perfect for learning new concepts before taking on scored missions.
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Select Topic</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map(m => (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  mode === m.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${mode === m.id ? "text-primary" : m.color}`}>{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {mode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Select Difficulty</h2>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 rounded-lg border text-xs font-mono font-bold capitalize transition-all ${
                    difficulty === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Button
              onClick={() => { setStarted(true); audioEffects.alert(); }}
              className="w-full gap-2 bg-primary text-black font-bold text-sm h-12"
            >
              <FlaskConical className="w-4 h-4" />
              Enter Lab — {MODES.find(m => m.id === mode)?.label} · {difficulty}
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  if (!q) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-60">
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading lab environment...</div>
      </div>
    );
  }

  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Lab header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Cyber Lab</h1>
            <p className="text-xs text-muted-foreground font-mono capitalize">{mode} · {difficulty} · No penalty</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-primary"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />{sessionStats.correct}</span>
            <span className="text-muted-foreground">Q{qIndex + 1}</span>
            <span className={accuracy >= 80 ? "text-primary" : "text-muted-foreground"}>{accuracy}% acc</span>
            {sessionStats.streak >= 3 && <span className="text-orange-400">🔥 ×{sessionStats.streak}</span>}
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> New Topic
          </Button>
        </div>
      </div>

      {/* Lab mode badge */}
      <div className="flex items-center gap-2">
        <Badge className="bg-primary/10 border-primary/30 text-primary text-xs gap-1.5">
          <FlaskConical className="w-3 h-3" /> LAB MODE — Explanations Enabled
        </Badge>
        <Badge variant="outline" className="text-xs capitalize border-border">{q.difficulty}</Badge>
      </div>

      {/* Scenario */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <pre className="font-mono text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{q.scenario}</pre>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === q.correctAnswer;
          const showResult = selected !== null;

          let style = "border-border bg-card text-foreground hover:border-primary/30";
          if (showResult && isCorrect) style = "border-primary bg-primary/10 text-primary";
          else if (showResult && isSelected && !isCorrect) style = "border-red-400 bg-red-400/10 text-red-400";
          else if (showResult) style = "border-border bg-card text-muted-foreground opacity-50";

          return (
            <motion.button
              key={i}
              whileHover={selected === null ? { scale: 1.01 } : {}}
              onClick={() => handleSelect(i)}
              className={`w-full text-left p-4 rounded-xl border transition-all text-sm flex items-start gap-3 ${style}`}
            >
              <span className="font-mono font-bold w-6 shrink-0">{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1">{opt}</span>
              {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
              {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
            </motion.button>
          );
        })}
      </div>

      {/* Explanation panel — always shown in lab mode */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-primary mb-2">
                      {selected === q.correctAnswer ? "✓ Correct!" : "✗ Not quite — here's why:"}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
                <Button
                  onClick={handleNext}
                  className="mt-4 w-full gap-2 bg-primary text-black font-bold text-sm"
                >
                  Next Question <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session stats */}
      {sessionStats.total > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground font-mono">
          <span>Questions: {sessionStats.total}</span>
          <span className="text-primary">Correct: {sessionStats.correct}</span>
          <span>Accuracy: {accuracy}%</span>
          <span className="text-orange-400">Best streak: {sessionStats.bestStreak}</span>
        </div>
      )}
    </div>
  );
}
