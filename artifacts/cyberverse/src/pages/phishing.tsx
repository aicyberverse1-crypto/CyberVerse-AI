import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetQuestions, getGetQuestionsQueryKey, useSubmitScore, useGetAiHint, useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, XCircle, Lightbulb, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioEffects } from "@/hooks/useAudio";
import { useQueryClient } from "@tanstack/react-query";

const DIFF_HINT_COST: Record<string, number> = { Easy: 10, Medium: 15, Hard: 25, Expert: 40 };

export default function Phishing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintCost, setHintCost] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { data: user } = useGetUser();
  const { data: questions = [], isLoading } = useGetQuestions(
    { mode: "phishing" },
    { query: { queryKey: getGetQuestionsQueryKey({ mode: "phishing" }) } }
  );

  const submitScore = useSubmitScore();
  const getHint = useGetAiHint();

  const question = questions[currentIndex];
  const answered = selected !== null;
  const correct = answered && selected === question?.correctAnswer;
  const hintPointCost = DIFF_HINT_COST[question?.difficulty ?? "Medium"] ?? 15;

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [currentIndex]);

  function handleSelect(idx: number) {
    if (answered) return;
    const responseTimeMs = Date.now() - startTimeRef.current;
    const isCorrect = idx === question?.correctAnswer;
    setSelected(idx);

    if (isCorrect) {
      audioEffects.success();
      setFlash("correct");
      setScore(s => s + 100);
      setCorrectCount(c => c + 1);
    } else {
      audioEffects.error();
      setFlash("wrong");
    }

    setTimeout(() => setFlash(null), 600);

    submitScore.mutate(
      { data: { mode: "phishing", score: isCorrect ? 100 : 0, xpEarned: isCorrect ? 20 : 5, isCorrect, responseTimeMs } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          if (data.leveledUp) {
            audioEffects.levelUp();
            toast({ title: "LEVEL UP!", description: `Now Level ${data.level}!` });
          }
          if (isCorrect && data.hintPointsEarned > 0) {
            toast({ description: `+${data.hintPointsEarned} hint points earned!` });
          }
        },
      }
    );
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setHint(null);
      setHintCost(null);
      setShowHint(false);
    } else {
      setCompleted(true);
      audioEffects.victory();
    }
  }

  function handleReset() {
    setCurrentIndex(0);
    setSelected(null);
    setHint(null);
    setHintCost(null);
    setShowHint(false);
    setScore(0);
    setCorrectCount(0);
    setCompleted(false);
    startTimeRef.current = Date.now();
  }

  function handleAskHint() {
    if (!question) return;
    audioEffects.hint();
    getHint.mutate(
      { data: { scenario: question.scenario, question: "What should I look for in this message?", mode: "phishing" } },
      {
        onSuccess: (data) => {
          setHint(data.hint);
          setHintCost(data.hintPointsCost ?? null);
          setShowHint(true);
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          toast({ description: `Hint used: -${data.hintPointsCost} HP (${data.hintPointsRemaining} remaining)` });
        },
        onError: (err) => {
          audioEffects.error();
          toast({ title: "Hint unavailable", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-primary animate-pulse text-sm font-mono">Loading mission data...</div></div>;
  }

  if (completed) {
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto text-center space-y-6 pt-8">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div>
          <div className="text-5xl font-bold text-primary font-mono">{score}</div>
          <p className="text-muted-foreground mt-2">Points earned in Phishing Detective</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Correct", value: `${correctCount}/${questions.length}` },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Score", value: score },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-primary font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button onClick={handleReset} size="lg" className="gap-2 bg-primary text-primary-foreground">
          <RotateCcw className="w-4 h-4" /> Play Again
        </Button>
      </motion.div>
    );
  }

  if (!question) return null;

  return (
    <motion.div
      animate={flash === "wrong" ? { x: [-6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.3 }}
      className={`max-w-2xl mx-auto space-y-6 ${flash === "correct" ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}`}
    >
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 pointer-events-none z-50 ${flash === "correct" ? "bg-primary/20" : "bg-destructive/20"}`}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-bold">Phishing Detective</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono border-yellow-400/30 text-yellow-400">{currentIndex + 1} / {questions.length}</Badge>
          <Badge variant="outline" className="font-mono text-primary">{score} pts</Badge>
          {user && <Badge variant="outline" className="font-mono text-yellow-400 border-yellow-400/30"><span className="text-[10px] mr-1">HP</span>{user.hintPoints}</Badge>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full bg-yellow-400" animate={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
      </div>

      {/* Email display */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm text-muted-foreground">Incoming Message</CardTitle>
            <Badge className="ml-auto text-xs border-yellow-400/30 text-yellow-400 bg-yellow-400/10">{question.difficulty}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <pre className="text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed bg-background/50 rounded-lg p-4 border border-border">
            {question.scenario}
          </pre>
        </CardContent>
      </Card>

      {/* Hint */}
      <AnimatePresence>
        {showHint && hint && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="bg-yellow-400/5 border-yellow-400/30">
              <CardContent className="p-4 flex gap-3">
                <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  {hintCost !== null && <p className="text-xs text-yellow-400/70 mb-1">Hint cost: -{hintCost} HP</p>}
                  <p className="text-sm text-foreground/80">{hint}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          let cls = "bg-card border-border hover:border-primary/50 cursor-pointer";
          if (answered) {
            if (idx === question.correctAnswer) cls = "bg-primary/10 border-primary";
            else if (idx === selected) cls = "bg-destructive/10 border-destructive";
            else cls = "bg-card border-border opacity-50";
          }
          return (
            <motion.button
              key={idx}
              whileHover={!answered ? { x: 4 } : {}}
              whileTap={!answered ? { scale: 0.98 } : {}}
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
            <Card className={`border ${correct ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"}`}>
              <CardContent className="p-4 flex gap-3">
                {correct ? <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-semibold mb-1 ${correct ? "text-primary" : "text-destructive"}`}>
                    {correct ? "Correct! +100 pts +20 XP" : "Incorrect — +5 XP for trying"}
                  </p>
                  <p className="text-sm text-foreground/80">{question.explanation}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!answered && !showHint && (
          <Button
            variant="outline" size="sm"
            onClick={handleAskHint}
            disabled={getHint.isPending || (user ? user.hintPoints < hintPointCost : false)}
            className="gap-2 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
          >
            <Lightbulb className="w-4 h-4" />
            {getHint.isPending ? "Thinking..." : `AI Hint (${hintPointCost} HP)`}
          </Button>
        )}
        {answered && (
          <Button onClick={handleNext} className="ml-auto gap-2 bg-primary text-primary-foreground">
            {currentIndex < questions.length - 1 ? "Next Question" : "Complete Mission"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
