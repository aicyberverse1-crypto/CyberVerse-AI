import { useState, useEffect, useRef, type RefObject } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";
import { audioEffects } from "@/hooks/useAudio";

const BOOT_LINES = [
  { text: "[ BIOS ] Initializing quantum security core...", delay: 0, color: "text-muted-foreground" },
  { text: "[ SYS  ] Loading threat intelligence modules...", delay: 400, color: "text-muted-foreground" },
  { text: "[ NET  ] Establishing encrypted tunnel... OK", delay: 800, color: "text-primary" },
  { text: "[ AI   ] Activating CyberGuard neural network...", delay: 1200, color: "text-muted-foreground" },
  { text: "[ AI   ] GPT-4o-mini core ONLINE", delay: 1700, color: "text-primary" },
  { text: "[ SEC  ] Scanning for intrusions... CLEAR", delay: 2200, color: "text-primary" },
  { text: "[ DB   ] Loading 10,000+ threat scenarios...", delay: 2700, color: "text-muted-foreground" },
  { text: "[ SYS  ] All systems operational.", delay: 3100, color: "text-primary" },
  { text: "[ AUTH ] Awaiting operator authentication...", delay: 3500, color: "text-yellow-400" },
];

function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`relative select-none ${className}`}>
      <span className="relative z-10">{text}</span>
      <span
        className="absolute inset-0 text-red-500/50 animate-glitch1"
        aria-hidden="true"
        style={{ clipPath: "polygon(0 20%, 100% 20%, 100% 40%, 0 40%)" }}
      >
        {text}
      </span>
      <span
        className="absolute inset-0 text-primary/40 animate-glitch2"
        aria-hidden="true"
        style={{ clipPath: "polygon(0 60%, 100% 60%, 100% 80%, 0 80%)" }}
      >
        {text}
      </span>
    </div>
  );
}

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 13;
    const cols = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(cols).fill(1);

    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ@#$%&";

    function draw() {
      ctx!.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.fillStyle = "#00ff8840";
      ctx!.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx!.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas!.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 45);
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    return () => { clearInterval(interval); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-25" />;
}

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
        // Typing animation
        let j = 0;
        const interval = setInterval(() => {
          j++;
          setTyped(prev => ({ ...prev, [i]: line.text.slice(0, j) }));
          if (j >= line.text.length) clearInterval(interval);
        }, 12);

        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => { setDone(true); onComplete(); }, 800);
        }
      }, line.delay);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="font-mono text-xs space-y-1 text-left max-w-lg"
    >
      {BOOT_LINES.map((line, i) =>
        visibleLines.includes(i) ? (
          <div key={i} className={`${line.color} leading-relaxed`}>
            <span>{typed[i] ?? ""}</span>
            {typed[i]?.length === line.text.length ? null : <span className="animate-pulse">▋</span>}
          </div>
        ) : null
      )}
      {done && <div className="text-primary mt-2 animate-pulse">▋</div>}
    </motion.div>
  );
}

// Konami code Easter egg sequence: ↑↑↓↓←→←→BA
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"matrix" | "boot" | "title" | "cta">("matrix");
  const [showBoot, setShowBoot] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const konamiProgress = useRef<number>(0);

  useEffect(() => {
    if (getToken()) { setLocation("/dashboard"); return; }
    const t1 = setTimeout(() => setPhase("boot"), 800);
    const t2 = setTimeout(() => setShowBoot(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  function handleBootComplete() {
    setTimeout(() => setPhase("title"), 400);
    setTimeout(() => setPhase("cta"), 1200);
  }

  function handleEnter() {
    audioEffects.alert();
    setTimeout(() => {
      audioEffects.typing();
      setLocation("/login");
    }, 200);
  }

  // Konami code listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && phase === "cta") handleEnter();
      // Easter egg: track Konami sequence
      if (e.key === KONAMI[konamiProgress.current]) {
        konamiProgress.current += 1;
        if (konamiProgress.current === KONAMI.length) {
          konamiProgress.current = 0;
          setEasterEgg(true);
          audioEffects.levelUp();
          setTimeout(() => setEasterEgg(false), 5000);
        }
      } else {
        konamiProgress.current = 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center relative overflow-hidden">
      <style>{`
        @keyframes glitch1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-3px, 1px); }
          40% { transform: translate(3px, -1px); }
          60% { transform: translate(-2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        @keyframes glitch2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(3px, -2px); }
          40% { transform: translate(-3px, 2px); }
          60% { transform: translate(2px, 1px); }
          80% { transform: translate(-2px, -1px); }
        }
        .animate-glitch1 { animation: glitch1 0.4s infinite steps(1); }
        .animate-glitch2 { animation: glitch2 0.4s infinite steps(1) 0.1s; }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .scanline {
          animation: scanline 4s linear infinite;
          background: linear-gradient(transparent, rgba(0,255,136,0.04), transparent);
          height: 80px;
          position: absolute;
          width: 100%;
          pointer-events: none;
        }
      `}</style>

      {/* Matrix rain */}
      <MatrixRain />

      {/* Scanline */}
      <div className="scanline" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,136,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Corner decorations */}
      {["top-4 left-4 border-t border-l", "top-4 right-4 border-t border-r", "bottom-4 left-4 border-b border-l", "bottom-4 right-4 border-b border-r"].map((c, i) => (
        <div key={i} className={`absolute w-8 h-8 border-primary/40 ${c}`} />
      ))}

      {/* Top status bar */}
      <div className="absolute top-6 left-0 right-0 flex justify-between items-center px-8 text-[10px] font-mono text-primary/40">
        <span>SYS:ONLINE</span>
        <span className="tracking-widest">CYBERVERSE SECURITY PLATFORM v2.5</span>
        <span className="text-primary animate-pulse">● LIVE</span>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-4xl w-full">
        {/* Boot phase */}
        <AnimatePresence>
          {showBoot && phase === "boot" && (
            <motion.div
              key="boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full max-w-lg bg-black/80 border border-primary/20 rounded-lg p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-primary/20">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                <div className="w-3 h-3 rounded-full bg-primary/70" />
                <span className="ml-2 text-xs font-mono text-muted-foreground">CYBERVERSE_TERMINAL — bash</span>
              </div>
              <BootSequence onComplete={handleBootComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title phase */}
        <AnimatePresence>
          {(phase === "title" || phase === "cta") && (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <div className="mb-2">
                <div className="text-xs font-mono text-primary/60 tracking-[0.4em] uppercase mb-4">
                  ⚡ CLASSIFIED — SIMULATION PLATFORM
                </div>
                <GlitchText
                  text="CYBERVERSE AI"
                  className="text-6xl md:text-8xl font-black text-primary tracking-tight font-mono"
                />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-muted-foreground font-mono mt-4"
              >
                Train Like a Hacker.{" "}
                <span className="text-primary">Think Like AI.</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-8 mt-6 text-xs font-mono"
              >
                {[
                  { label: "THREATS", value: "10K+" },
                  { label: "AI SCENARIOS", value: "∞" },
                  { label: "OPERATORS", value: "LIVE" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold text-primary">{s.value}</div>
                    <div className="text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <AnimatePresence>
          {phase === "cta" && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.button
                onClick={handleEnter}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ boxShadow: ["0 0 20px rgba(0,255,136,0.2)", "0 0 40px rgba(0,255,136,0.5)", "0 0 20px rgba(0,255,136,0.2)"] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-10 py-4 bg-primary text-black font-black text-lg font-mono tracking-widest rounded-lg border border-primary hover:bg-primary/90 transition-all"
              >
                [ PRESS ENTER TO HACK ]
              </motion.button>

              <button
                onClick={() => setLocation("/register")}
                className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                New operator? Request access →
              </button>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-2 justify-center mt-2"
              >
                {["🛡 Phishing Detection", "⚔ Attack Defense", "🧠 AI Missions", "🏆 Global Leaderboard", "🌐 Dark Web Sim"].map(f => (
                  <span key={f} className="text-[10px] font-mono px-3 py-1 rounded-full border border-primary/20 text-primary/60 bg-primary/5">
                    {f}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Easter egg overlay — triggered by Konami code ↑↑↓↓←→←→BA */}
      <AnimatePresence>
        {easterEgg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/90 border-2 border-primary rounded-2xl p-10 text-center max-w-sm mx-4 shadow-[0_0_80px_rgba(0,255,136,0.5)]">
              <div className="text-5xl mb-4">🕶</div>
              <div className="text-2xl font-black text-primary font-mono tracking-widest mb-2">ACCESS GRANTED</div>
              <div className="text-sm font-mono text-muted-foreground mb-4">SECRET AGENT MODE UNLOCKED</div>
              <div className="text-xs font-mono text-primary/70 leading-relaxed">
                You found the Konami code.<br />
                The shadows know your name, Agent.<br />
                <span className="text-yellow-400">+∞ respect</span> added to your profile.
              </div>
              <div className="mt-4 text-[10px] font-mono text-muted-foreground/40 tracking-widest">
                ↑↑↓↓←→←→BA — CLASSIFIED
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <div className="text-[10px] font-mono text-muted-foreground/40 tracking-widest">
          AUTHORIZED PERSONNEL ONLY — SIMULATION ENVIRONMENT — EDUCATIONAL USE
        </div>
      </div>
    </div>
  );
}
