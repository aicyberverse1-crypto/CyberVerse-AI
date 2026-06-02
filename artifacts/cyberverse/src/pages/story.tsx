import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronRight, Lock, CheckCircle, Star, Swords, Shield, AlertTriangle, Trophy, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetUser } from "@workspace/api-client-react";
import { audioEffects } from "@/hooks/useAudio";

interface DialogueLine {
  speaker: "NARRATOR" | "AGENT" | "ENEMY" | "SYSTEM";
  text: string;
}

interface StoryLevel {
  id: number;
  chapter: string;
  title: string;
  subtitle: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Final Boss";
  xpReward: number;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  requiredXp: number;
  dialogue: DialogueLine[];
  challenge: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
  completionText: string;
}

const STORY_LEVELS: StoryLevel[] = [
  {
    id: 1,
    chapter: "Chapter 1",
    title: "First Contact",
    subtitle: "A suspicious email lands in your inbox...",
    difficulty: "Beginner",
    xpReward: 50,
    icon: Shield,
    color: "text-green-400",
    bgColor: "border-green-400/30 bg-green-400/5",
    requiredXp: 0,
    dialogue: [
      { speaker: "NARRATOR", text: "Year 2031. You are a junior analyst at CyberCorp. It's your first week on the job." },
      { speaker: "SYSTEM",   text: "[ALERT] New email received from: CEO_Updates@cybercorp-secure.net" },
      { speaker: "AGENT",    text: "Hmm... this looks like it's from the CEO, but something feels off. Let me check." },
      { speaker: "ENEMY",    text: "URGENT: Click here to verify your employee credentials before 5PM or your account will be suspended." },
      { speaker: "NARRATOR", text: "Your first test as a cybersecurity analyst has arrived. What do you do?" },
    ],
    challenge: {
      question: "The email has a domain 'cybercorp-secure.net' — your company domain is 'cybercorp.com'. What is this?",
      options: [
        "A legitimate IT security notification",
        "A phishing email using a lookalike domain",
        "An internal system error",
        "A newsletter from HR",
      ],
      correct: 1,
      explanation: "Correct! This is a classic lookalike domain attack. Attackers register domains like 'company-secure.net' to impersonate legitimate companies. Always verify the exact domain before clicking any links.",
    },
    completionText: "You spotted the phishing attempt and reported it to the security team. +50 XP. The attack was blocked.",
  },
  {
    id: 2,
    chapter: "Chapter 2",
    title: "The Breach",
    subtitle: "System logs reveal something terrifying...",
    difficulty: "Intermediate",
    xpReward: 100,
    icon: AlertTriangle,
    color: "text-orange-400",
    bgColor: "border-orange-400/30 bg-orange-400/5",
    requiredXp: 200,
    dialogue: [
      { speaker: "NARRATOR", text: "Three months later. You've been promoted to incident responder. At 3AM, the alarms go off." },
      { speaker: "SYSTEM",   text: "[CRITICAL] Unusual outbound traffic detected — 4.2GB/hr to IP 185.234.xx.xx (Eastern Europe)" },
      { speaker: "AGENT",    text: "That's a data exfiltration pattern. Someone is stealing our data right now." },
      { speaker: "SYSTEM",   text: "[LOG] Process: svchost.exe | Port: 443 | Protocol: HTTPS | Encrypted" },
      { speaker: "NARRATOR", text: "The attacker is using HTTPS to blend in with normal traffic. You have seconds to act." },
    ],
    challenge: {
      question: "An infected machine is sending 4.2GB/hr of encrypted data to an unknown IP. Your FIRST response should be:",
      options: [
        "Reboot the infected machine to stop the process",
        "Immediately isolate the machine from the network",
        "Email the IT department and wait for morning",
        "Run a full antivirus scan on the machine",
      ],
      correct: 1,
      explanation: "Correct! Network isolation is the first step. Rebooting destroys evidence, antivirus scans while the exfil is ongoing waste time, and waiting costs data. Isolate first, investigate second.",
    },
    completionText: "You isolated the machine in time. Forensic analysis reveals a supply-chain backdoor. +100 XP. You're promoted to Senior Analyst.",
  },
  {
    id: 3,
    chapter: "Chapter 3",
    title: "Shadow Network",
    subtitle: "A nation-state APT has infiltrated your infrastructure...",
    difficulty: "Advanced",
    xpReward: 200,
    icon: Swords,
    color: "text-red-400",
    bgColor: "border-red-400/30 bg-red-400/5",
    requiredXp: 500,
    dialogue: [
      { speaker: "NARRATOR", text: "Six months after the breach. You're leading the forensic investigation." },
      { speaker: "AGENT",    text: "This wasn't random. The exfiltrated data matches our R&D project codenamed NOVA." },
      { speaker: "SYSTEM",   text: "[INTELLIGENCE] IOCs match APT-29 (Cozy Bear) — Russian state-sponsored threat actor." },
      { speaker: "ENEMY",    text: "[INTERCEPTED] We've been inside their network for 8 months. They never knew." },
      { speaker: "NARRATOR", text: "The attackers used living-off-the-land techniques — no malware, just built-in Windows tools. How did they stay hidden so long?" },
    ],
    challenge: {
      question: "APT-29 used 'living-off-the-land' techniques (PowerShell, WMI, native tools). Why is this so hard to detect?",
      options: [
        "Antivirus can't scan PowerShell scripts",
        "Native system tools don't trigger antivirus signatures since they're legitimate programs",
        "State-sponsored hackers have special bypass codes",
        "Windows Defender is turned off by default",
      ],
      correct: 1,
      explanation: "Exactly! Living-off-the-land (LoTL) attacks use legitimate tools like PowerShell, WMI, and certutil that are whitelisted. Traditional AV is blind to them. Behavioral analytics and UEBA (User and Entity Behavior Analytics) are required to detect these patterns.",
    },
    completionText: "You documented the full attack chain and helped patch the systemic gap. +200 XP. Your report becomes a national cybersecurity case study.",
  },
  {
    id: 4,
    chapter: "Chapter 4",
    title: "Project DARKFALL",
    subtitle: "The final confrontation — infrastructure at risk.",
    difficulty: "Final Boss",
    xpReward: 500,
    icon: Trophy,
    color: "text-purple-400",
    bgColor: "border-purple-400/30 bg-purple-400/5",
    requiredXp: 1000,
    dialogue: [
      { speaker: "NARRATOR",  text: "One year later. You're the Head of Cyber Defense at CyberCorp. A global crisis begins." },
      { speaker: "SYSTEM",    text: "[CRITICAL] Power grid SCADA systems in 12 cities reporting anomalous command injections." },
      { speaker: "AGENT",     text: "This is it. This is what everything has been building toward. They're targeting critical infrastructure." },
      { speaker: "ENEMY",     text: "[BROADCAST] Project DARKFALL is live. In 60 minutes, the lights go out." },
      { speaker: "NARRATOR",  text: "You have one hour. The world is watching. What's your move?" },
    ],
    challenge: {
      question: "SCADA systems controlling power grids are under active attack via command injection. The BEST defensive architecture is:",
      options: [
        "Install antivirus on all SCADA terminals immediately",
        "Air-gap the control network and switch to manual override protocols",
        "Block all internet traffic for 1 hour",
        "Reboot the SCADA servers to clear the injected commands",
      ],
      correct: 1,
      explanation: "Air-gapping industrial control systems (ICS) from external networks is the gold standard defense. SCADA systems weren't designed for internet security. Air-gapping + manual override is the fail-safe that keeps the lights on.",
    },
    completionText: "Project DARKFALL neutralized. You saved the grid. +500 XP. You are recognized as an Elite Cyber Defender. The war continues — but today, you won.",
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-400/20 text-green-400 border-green-400/30",
  Intermediate: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  Advanced: "bg-red-400/20 text-red-400 border-red-400/30",
  "Final Boss": "bg-purple-400/20 text-purple-400 border-purple-400/30",
};

const SPEAKER_COLORS: Record<string, string> = {
  NARRATOR: "text-muted-foreground italic",
  AGENT: "text-primary font-semibold",
  ENEMY: "text-red-400 font-semibold",
  SYSTEM: "text-yellow-400 font-mono",
};

type Phase = "map" | "dialogue" | "challenge" | "result";

export default function StoryMode() {
  const { data: user } = useGetUser();
  const [activeLevel, setActiveLevel] = useState<StoryLevel | null>(null);
  const [phase, setPhase] = useState<Phase>("map");
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("cv_story_completed") ?? "[]")); } catch { return new Set(); }
  });

  const userXp = user?.xp ?? 0;

  function startLevel(level: StoryLevel) {
    if (userXp < level.requiredXp) return;
    setActiveLevel(level);
    setPhase("dialogue");
    setDialogueIdx(0);
    setSelected(null);
    audioEffects.alert();
  }

  function nextDialogue() {
    if (!activeLevel) return;
    if (dialogueIdx < activeLevel.dialogue.length - 1) {
      setDialogueIdx(i => i + 1);
    } else {
      setPhase("challenge");
      audioEffects.typing();
    }
  }

  function selectAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === activeLevel!.challenge.correct;
    if (correct) {
      audioEffects.success();
      const newCompleted = new Set(completed).add(activeLevel!.id);
      setCompleted(newCompleted);
      localStorage.setItem("cv_story_completed", JSON.stringify([...newCompleted]));
      setTimeout(() => setPhase("result"), 800);
    } else {
      audioEffects.error();
    }
  }

  if (phase !== "map" && activeLevel) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => { setPhase("map"); setActiveLevel(null); }}>
          ← Back to Mission Map
        </Button>

        <div className={`rounded-xl border p-4 ${activeLevel.bgColor}`}>
          <div className="flex items-center gap-2 mb-1">
            <activeLevel.icon className={`w-5 h-5 ${activeLevel.color}`} />
            <span className={`text-xs font-mono ${activeLevel.color}`}>{activeLevel.chapter}</span>
            <Badge className={`ml-auto text-[10px] ${DIFFICULTY_COLORS[activeLevel.difficulty]}`}>{activeLevel.difficulty}</Badge>
          </div>
          <h2 className="text-lg font-bold">{activeLevel.title}</h2>
          <p className="text-xs text-muted-foreground">{activeLevel.subtitle}</p>
        </div>

        {/* Dialogue phase */}
        <AnimatePresence mode="wait">
          {phase === "dialogue" && (
            <motion.div key={dialogueIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="border border-border">
                <CardContent className="p-5 space-y-3">
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {dialogueIdx + 1} / {activeLevel.dialogue.length}
                  </div>
                  <div className={`text-[10px] font-bold tracking-widest mb-1 ${SPEAKER_COLORS[activeLevel.dialogue[dialogueIdx].speaker].split(" ")[0]}`}>
                    [{activeLevel.dialogue[dialogueIdx].speaker}]
                  </div>
                  <p className={`text-sm leading-relaxed ${SPEAKER_COLORS[activeLevel.dialogue[dialogueIdx].speaker]}`}>
                    {activeLevel.dialogue[dialogueIdx].text}
                  </p>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={nextDialogue} className="gap-1.5">
                      {dialogueIdx < activeLevel.dialogue.length - 1 ? <><ChevronRight className="w-3.5 h-3.5" /> Continue</> : <><Swords className="w-3.5 h-3.5" /> Begin Challenge</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Challenge phase */}
          {phase === "challenge" && (
            <motion.div key="challenge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-primary/30">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary font-mono">MISSION CRITICAL DECISION</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">{activeLevel.challenge.question}</p>
                  <div className="space-y-2">
                    {activeLevel.challenge.options.map((opt, i) => {
                      const isSelected = selected === i;
                      const isCorrect = i === activeLevel.challenge.correct;
                      const showResult = selected !== null;
                      return (
                        <motion.button
                          key={i}
                          whileHover={selected === null ? { x: 4 } : {}}
                          onClick={() => selectAnswer(i)}
                          className={`w-full text-left text-xs px-4 py-3 rounded-lg border transition-all ${
                            showResult
                              ? isCorrect
                                ? "border-green-400/60 bg-green-400/10 text-green-400"
                                : isSelected
                                  ? "border-red-400/60 bg-red-400/10 text-red-400"
                                  : "border-border text-muted-foreground opacity-50"
                              : "border-border hover:border-primary/40 hover:bg-primary/5 text-foreground"
                          }`}
                        >
                          <span className="font-mono mr-2">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                          {showResult && isCorrect && <CheckCircle className="w-3.5 h-3.5 inline ml-2 text-green-400" />}
                        </motion.button>
                      );
                    })}
                  </div>
                  {selected !== null && selected !== activeLevel.challenge.correct && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-400/5 border border-red-400/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-red-400 font-bold">Incorrect. </span>
                        {activeLevel.challenge.explanation}
                      </p>
                      <Button size="sm" className="mt-2 text-xs h-7" onClick={() => setSelected(null)}>Try again</Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Result phase */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border border-green-400/30 bg-green-400/5">
                <CardContent className="p-6 text-center space-y-3">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                    <Trophy className="w-10 h-10 text-yellow-400 mx-auto" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-green-400">Mission Complete!</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{activeLevel.completionText}</p>
                  <div className="bg-black/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Lesson learned:</p>
                    <p className="text-xs text-foreground/80">{activeLevel.challenge.explanation}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">+{activeLevel.xpReward} XP</span>
                    <span className="text-xs text-muted-foreground">(play Training modes to actually earn XP)</span>
                  </div>
                  <Button onClick={() => { setPhase("map"); setActiveLevel(null); }} className="w-full">
                    Back to Mission Map
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Story Mode</h1>
          <p className="text-xs text-muted-foreground font-mono">Mission-based progression · Real cybersecurity scenarios</p>
        </div>
        <div className="ml-auto text-xs font-mono text-muted-foreground">
          {completed.size}/{STORY_LEVELS.length} chapters complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${(completed.size / STORY_LEVELS.length) * 100}%` }}
          transition={{ duration: 1 }}
        />
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 gap-4">
        {STORY_LEVELS.map((level, i) => {
          const locked = userXp < level.requiredXp;
          const done = completed.has(level.id);
          return (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`border transition-all ${done ? "border-green-400/30 bg-green-400/5" : locked ? "border-border opacity-60" : level.bgColor} ${!locked && !done ? "hover:shadow-[0_0_20px_rgba(34,197,94,0.08)]" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-400/20" : locked ? "bg-muted/30" : "bg-black/30"}`}>
                      {done ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : locked ? (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <level.icon className={`w-6 h-6 ${level.color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-mono ${level.color}`}>{level.chapter}</span>
                        <Badge className={`text-[10px] ${DIFFICULTY_COLORS[level.difficulty]}`}>{level.difficulty}</Badge>
                        {done && <Badge className="text-[10px] bg-green-400/20 text-green-400 border-green-400/30">✓ Complete</Badge>}
                        <span className="ml-auto text-[10px] text-yellow-400 font-mono">+{level.xpReward} XP</span>
                      </div>
                      <h3 className="text-sm font-bold mb-0.5">{level.title}</h3>
                      <p className="text-xs text-muted-foreground">{level.subtitle}</p>
                      {locked && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">🔒 Requires {level.requiredXp} XP (you have {userXp})</p>
                      )}
                    </div>
                    {!locked && (
                      <Button
                        size="sm"
                        variant={done ? "outline" : "default"}
                        onClick={() => startLevel(level)}
                        className="shrink-0"
                      >
                        {done ? "Replay" : "Start"} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
