import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetQuestions, getGetQuestionsQueryKey, useSubmitScore, useGetAiHint } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Timer, CheckCircle, XCircle, Lightbulb, ChevronRight, RotateCcw, Zap } from "lucide-react";

const TIMER_SECONDS = 30;

export default function Defense() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: questions = [], isLoading } = useGetQuestions(
    { mode: "defense" },
    { query: { queryKey: getGetQuestionsQueryKey({ mode: "defense" }) } }
  );

  const submitScore = useSubmitScore();
  const getHint = useGetAiHint();

  const question = questions[currentIndex];
  const answered = selected !== null || timedOut;

  const handleTimeout = useCallback(() => {
    if (!answered) {
      setTimedOut(true);
      submitScore.mutate({ data: { mode: "defense", score: 0, xpEarned: 2 } });
    }
  }, [answered]);

  useEffect(() => {
    if (answered) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, answered, handleTimeout]);

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    const isCorrect = idx === question?.correctAnswer;
    const pts = isCorrect ? Math.max(50, timeLeft * 4) : 0;
    const xp = isCorrect ? 25 : 5;
    if (isCorrect) setScore(s => s + pts);
    submitScore.mutate({ data: { mode: "defense", score: pts, xpEarned: xp } });
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setTimeLeft(TIMER_SECONDS);
      setTimedOut(false);
      setHint(null);
      setShowHint(false);
    } else {
      setCompleted(true);
    }
  }

  function handleReset() {
    setCurrentIndex(0);
    setSelected(null);
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    setHint(null);
    setShowHint(false);
    setScore(0);
    setCompleted(false);
  }

  function handleAskHint() {
    if (!question) return;
    getHint.mutate(
      { data: { scenario: question.scenario, question: "What defense should I use?", mode: "defense" } },
      { onSuccess: (data) => { setHint(data.hint); setShowHint(true); } }
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-primary animate-pulse text-sm font-mono">Loading mission data...</div></div>;
  }

  if (completed) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl font-bold text-primary font-mono">{score}</motion.div>
        <p className="text-muted-foreground">Points earned in Attack Defense</p>
        <Button onClick={handleReset} className="gap-2"><RotateCcw className="w-4 h-4" /> Play Again</Button>
      </div>
    );
  }

  if (!question) return null;

  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timerPercent > 50 ? "text-primary" : timerPercent > 25 ? "text-yellow-400" : "text-destructive";
  const correct = selected === question.correctAnswer;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold">Attack Defense</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timerColor}`}>
            <Timer className="w-5 h-5" />
            {timeLeft}s
          </div>
          <Badge variant="outline" className="font-mono text-primary">{score} pts</Badge>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: timerPercent > 50 ? "#22c55e" : timerPercent > 25 ? "#eab308" : "#ef4444" }}
          animate={{ width: `${timerPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Attack scenario */}
      <Card className="bg-card border-red-500/20">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-400" />
            <CardTitle className="text-sm text-red-400">INCOMING THREAT DETECTED</CardTitle>
            <Badge className="ml-auto text-xs bg-red-400/10 border-red-400/30 text-red-400">{question.difficulty}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm leading-relaxed text-foreground/90">{question.scenario}</p>
        </CardContent>
      </Card>

      {/* Hint */}
      <AnimatePresence>
        {showHint && hint && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="bg-yellow-400/5 border-yellow-400/30">
              <CardContent className="p-4 flex gap-3">
                <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80">{hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          let cls = "bg-card border-border hover:border-blue-400/50 cursor-pointer";
          if (answered) {
            if (idx === question.correctAnswer) cls = "bg-primary/10 border-primary";
            else if (idx === selected) cls = "bg-destructive/10 border-destructive";
            else cls = "bg-card border-border opacity-50";
          }
          return (
            <motion.button
              key={idx}
              whileHover={!answered ? { x: 4 } : {}}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-4 rounded-xl border transition-all text-sm ${cls}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-muted flex items-center justify-center text-xs font-mono text-muted-foreground shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
                {answered && idx === question.correctAnswer && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                {answered && idx === selected && idx !== question.correctAnswer && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answered && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`border ${correct && !timedOut ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"}`}>
              <CardContent className="p-4 flex gap-3">
                {correct && !timedOut ? <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-semibold mb-1 ${correct && !timedOut ? "text-primary" : "text-destructive"}`}>
                    {timedOut ? "Time's up!" : correct ? "Threat Neutralized!" : "System Compromised!"}
                  </p>
                  <p className="text-sm text-foreground/80">{question.explanation}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        {!answered && (
          <Button variant="outline" size="sm" onClick={handleAskHint} disabled={getHint.isPending || showHint}
            className="gap-2 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10">
            <Lightbulb className="w-4 h-4" />
            {getHint.isPending ? "Thinking..." : "Ask AI"}
          </Button>
        )}
        {answered && (
          <Button onClick={handleNext} className="ml-auto gap-2 bg-primary text-primary-foreground">
            {currentIndex < questions.length - 1 ? "Next Threat" : "Complete Mission"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
