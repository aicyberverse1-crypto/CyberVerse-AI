import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetQuestions, getGetQuestionsQueryKey, useSubmitScore, useGetAiHint } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, AlertTriangle, CheckCircle, XCircle, Lightbulb, ChevronRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Phishing() {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: questions = [], isLoading } = useGetQuestions(
    { mode: "phishing" },
    { query: { queryKey: getGetQuestionsQueryKey({ mode: "phishing" }) } }
  );

  const submitScore = useSubmitScore();
  const getHint = useGetAiHint();

  const question = questions[currentIndex];
  const answered = selected !== null;
  const correct = answered && selected === question?.correctAnswer;

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    const isCorrect = idx === question?.correctAnswer;
    const pts = isCorrect ? 100 : 0;
    const xp = isCorrect ? 20 : 5;
    if (isCorrect) setScore(s => s + pts);
    submitScore.mutate({ data: { mode: "phishing", score: pts, xpEarned: xp } });
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setHint(null);
      setShowHint(false);
    } else {
      setCompleted(true);
    }
  }

  function handleReset() {
    setCurrentIndex(0);
    setSelected(null);
    setHint(null);
    setShowHint(false);
    setScore(0);
    setCompleted(false);
  }

  function handleAskHint() {
    if (!question) return;
    getHint.mutate(
      { data: { scenario: question.scenario, question: "What should I look for in this message?", mode: "phishing" } },
      {
        onSuccess: (data) => {
          setHint(data.hint);
          setShowHint(true);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse text-sm font-mono">Loading mission data...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl font-bold text-primary font-mono">
          {score}
        </motion.div>
        <p className="text-muted-foreground">Points earned in Phishing Detective</p>
        <Button onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Play Again
        </Button>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-yellow-400" />
          <h1 className="text-xl font-bold">Phishing Detective</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono border-yellow-400/30 text-yellow-400">
            {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge variant="outline" className="font-mono text-primary">
            {score} pts
          </Badge>
        </div>
      </div>

      {/* Email display */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm text-muted-foreground">Incoming Message</CardTitle>
            <Badge className="ml-auto text-xs border-yellow-400/30 text-yellow-400 bg-yellow-400/10">
              {question.difficulty}
            </Badge>
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
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
                {correct
                  ? <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                }
                <div>
                  <p className={`text-sm font-semibold mb-1 ${correct ? "text-primary" : "text-destructive"}`}>
                    {correct ? "Correct!" : "Incorrect"}
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
        {!answered && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAskHint}
            disabled={getHint.isPending || showHint}
            className="gap-2 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
          >
            <Lightbulb className="w-4 h-4" />
            {getHint.isPending ? "Thinking..." : "Ask AI for Hint"}
          </Button>
        )}
        {answered && (
          <Button onClick={handleNext} className="ml-auto gap-2 bg-primary text-primary-foreground">
            {currentIndex < questions.length - 1 ? "Next Question" : "Complete Mission"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
