import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetQuestions, getGetQuestionsQueryKey, useSubmitScore, useGetAiHint } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Timer, CheckCircle, XCircle, Lightbulb, ChevronRight, RotateCcw, Lock } from "lucide-react";

const TIMER_SECONDS = 60;

export default function Escape() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: questions = [], isLoading } = useGetQuestions(
    { mode: "escape" },
    { query: { queryKey: getGetQuestionsQueryKey({ mode: "escape" }) } }
  );

  const submitScore = useSubmitScore();
  const getHint = useGetAiHint();

  const question = questions[currentIndex];
  const answered = selected !== null || timedOut;

  const handleTimeout = useCallback(() => {
    if (!answered) {
      setTimedOut(true);
      submitScore.mutate({ data: { mode: "escape", score: 0, xpEarned: 2 } });
    }
  }, [answered]);

  useEffect(() => {
    if (answered) return;
    if (timeLeft <= 0) { handleTimeout(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered, handleTimeout]);

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    const correct = idx === question?.correctAnswer;
    const timeBonus = Math.floor(timeLeft / TIMER_SECONDS * 50);
    const hintPenalty = hintLevel * 15;
    const pts = correct ? Math.max(50, 150 + timeBonus - hintPenalty) : 0;
    const xp = correct ? 30 : 5;
    if (correct) setScore(s => s + pts);
    submitScore.mutate({ data: { mode: "escape", score: pts, xpEarned: xp } });
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setTimeLeft(TIMER_SECONDS);
      setTimedOut(false);
      setHints([]);
      setHintLevel(0);
    } else {
      setCompleted(true);
    }
  }

  function handleReset() {
    setCurrentIndex(0);
    setSelected(null);
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    setHints([]);
    setHintLevel(0);
    setScore(0);
    setCompleted(false);
  }

  function handleAskHint() {
    if (!question || hintLevel >= 2) return;
    const hintStr = hintLevel === 0
      ? "Give me a very subtle hint about what to look for"
      : "Give me a stronger hint that gets me closer to the solution";
    getHint.mutate(
      { data: { scenario: question.scenario, question: hintStr, mode: "escape" } },
      { onSuccess: (data) => { setHints(h => [...h, data.hint]); setHintLevel(l => l + 1); } }
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-primary animate-pulse text-sm font-mono">Loading mission data...</div></div>;
  }

  if (completed) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl font-bold text-primary font-mono">{score}</motion.div>
        <p className="text-muted-foreground">Points earned in Escape Room</p>
        <Button onClick={handleReset} className="gap-2"><RotateCcw className="w-4 h-4" /> Play Again</Button>
      </div>
    );
  }

  if (!question) return null;

  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const correct = selected === question.correctAnswer;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-bold">Escape Room</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timerPercent > 50 ? "text-primary" : timerPercent > 25 ? "text-yellow-400" : "text-destructive"}`}>
            <Timer className="w-5 h-5" /> {timeLeft}s
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

      {/* Puzzle */}
      <Card className="bg-card border-purple-400/20">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <CardTitle className="text-sm text-purple-400">PUZZLE {currentIndex + 1} / {questions.length}</CardTitle>
            <Badge className="ml-auto text-xs bg-purple-400/10 border-purple-400/30 text-purple-400">{question.difficulty}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm leading-relaxed font-mono text-foreground/90 bg-background/50 rounded-lg p-4 border border-border">
            {question.scenario}
          </p>
        </CardContent>
      </Card>

      {/* Hints */}
      {hints.map((h, i) => (
        <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className={`border ${i === 0 ? "bg-yellow-400/5 border-yellow-400/30" : "bg-orange-400/5 border-orange-400/30"}`}>
            <CardContent className="p-4 flex gap-3">
              <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${i === 0 ? "text-yellow-400" : "text-orange-400"}`} />
              <div>
                <p className={`text-xs font-semibold mb-1 ${i === 0 ? "text-yellow-400" : "text-orange-400"}`}>
                  {i === 0 ? "Hint 1 (subtle)" : "Hint 2 (stronger)"}
                </p>
                <p className="text-sm text-foreground/80">{h}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          let cls = "bg-card border-border hover:border-purple-400/50 cursor-pointer";
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

      <AnimatePresence>
        {answered && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`border ${correct && !timedOut ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"}`}>
              <CardContent className="p-4 flex gap-3">
                {correct && !timedOut ? <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-semibold mb-1 ${correct && !timedOut ? "text-primary" : "text-destructive"}`}>
                    {timedOut ? "Time's up! Room not escaped." : correct ? "Room Escaped!" : "Wrong answer! Room locked."}
                  </p>
                  <p className="text-sm text-foreground/80">{question.explanation}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        {!answered && hintLevel < 2 && (
          <Button variant="outline" size="sm" onClick={handleAskHint} disabled={getHint.isPending}
            className={`gap-2 ${hintLevel === 0 ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10" : "border-orange-400/30 text-orange-400 hover:bg-orange-400/10"}`}>
            <Lightbulb className="w-4 h-4" />
            {getHint.isPending ? "Thinking..." : `Get ${hintLevel === 0 ? "Hint 1" : "Hint 2"} (-15 pts)`}
          </Button>
        )}
        {answered && (
          <Button onClick={handleNext} className="ml-auto gap-2 bg-primary text-primary-foreground">
            {currentIndex < questions.length - 1 ? "Next Puzzle" : "Complete Mission"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
