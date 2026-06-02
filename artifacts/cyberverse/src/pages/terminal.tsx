import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Zap, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { audioEffects } from "@/hooks/useAudio";

interface HistoryLine {
  type: "input" | "output" | "error" | "success" | "info";
  text: string;
  delay?: number;
}

const NETWORK_SCAN_OUTPUT = [
  { type: "info" as const, text: "Initializing nmap scan on 192.168.1.0/24..." },
  { type: "output" as const, text: "Starting Nmap 7.94 ( https://nmap.org )" },
  { type: "output" as const, text: "Scanning 256 hosts [2 ports/host]" },
  { type: "success" as const, text: "192.168.1.1   open  80/tcp   http    nginx 1.24.0" },
  { type: "success" as const, text: "192.168.1.1   open  443/tcp  https   TLSv1.3" },
  { type: "output" as const, text: "192.168.1.5   filtered  22/tcp  ssh" },
  { type: "error" as const,   text: "192.168.1.12  VULNERABLE — Port 21 (FTP) open with anonymous login!" },
  { type: "error" as const,   text: "192.168.1.47  VULNERABLE — Port 23 (Telnet) open — unencrypted!" },
  { type: "output" as const, text: "192.168.1.103 open  3306/tcp mysql   MySQL 8.0" },
  { type: "info" as const,   text: "Scan complete: 256 IPs | 3 hosts up | 2 critical vulnerabilities found." },
  { type: "error" as const,  text: "⚠  ALERT: Disable FTP and Telnet immediately — they transmit credentials in plaintext!" },
];

const ANALYZE_EMAIL_OUTPUT = [
  { type: "info" as const,   text: "Loading email sample from phishing-corpus/sample-0042.eml..." },
  { type: "output" as const, text: "FROM: paypal-security@paypal-secure-notifications.net" },
  { type: "output" as const, text: "SUBJECT: Urgent: Your account has been limited" },
  { type: "output" as const, text: "DATE: " + new Date().toUTCString() },
  { type: "info" as const,   text: "Running SPF/DKIM/DMARC checks..." },
  { type: "error" as const,  text: "SPF FAIL — sender domain 'paypal-secure-notifications.net' is NOT authorized" },
  { type: "error" as const,  text: "DKIM FAIL — No valid DKIM signature found" },
  { type: "error" as const,  text: "DMARC FAIL — Domain policy: reject; result: fail" },
  { type: "info" as const,   text: "Running link analysis..." },
  { type: "error" as const,  text: "MALICIOUS LINK: https://paypal-secure-notifications.net/verify → IP 185.234.xx.xx (Russia)" },
  { type: "error" as const,  text: "Domain age: 3 days | Registrar: NameCheap | WHOIS hidden" },
  { type: "success" as const, text: "VERDICT: PHISHING — Do NOT click any links. Report to security team." },
  { type: "info" as const,   text: "Red flags: domain spoofing, auth failures, urgency language, suspicious link geography." },
];

const DECRYPT_FILE_OUTPUT = [
  { type: "info" as const,   text: "Loading encrypted file: /evidence/message.enc" },
  { type: "output" as const, text: "Header: AES-256-CBC | IV: a3f8c1d2e4b6..." },
  { type: "info" as const,   text: "Attempting decryption with recovered key..." },
  { type: "output" as const, text: "████████████████████ 100%" },
  { type: "success" as const, text: "Decryption successful!" },
  { type: "output" as const, text: "" },
  { type: "output" as const, text: "--- DECRYPTED CONTENT ---" },
  { type: "success" as const, text: "Operation BLACKOUT: Target servers identified at 10.0.0.15-18" },
  { type: "success" as const, text: "Exfil window: 03:00–04:00 UTC | Channel: DNS tunneling over port 53" },
  { type: "success" as const, text: "Agent CIPHER authenticated — proceed to phase 2" },
  { type: "output" as const, text: "--- END CONTENT ---" },
  { type: "info" as const,   text: "Key: AES-256-CBC with PBKDF2 derivation (100k iterations, SHA-256)" },
  { type: "info" as const,   text: "Lesson: Symmetric encryption is only as strong as key management. Rotate keys regularly!" },
];

const HELP_OUTPUT = [
  { type: "info" as const,   text: "CyberVerse Terminal v2.0 — Simulated Hacker Toolkit" },
  { type: "output" as const, text: "" },
  { type: "success" as const, text: "Available commands:" },
  { type: "output" as const, text: "  scan network     — Run a simulated network vulnerability scan" },
  { type: "output" as const, text: "  analyze email    — Analyze a phishing email sample" },
  { type: "output" as const, text: "  decrypt file     — Decrypt a simulated intercepted message" },
  { type: "output" as const, text: "  whoami           — Show operator identity" },
  { type: "output" as const, text: "  status           — Show system status" },
  { type: "output" as const, text: "  clear            — Clear terminal" },
  { type: "output" as const, text: "  help             — Show this help menu" },
  { type: "output" as const, text: "" },
  { type: "info" as const,   text: "All simulations are educational. No real systems are affected." },
];

const COMMANDS: Record<string, HistoryLine[]> = {
  "scan network": NETWORK_SCAN_OUTPUT,
  "analyze email": ANALYZE_EMAIL_OUTPUT,
  "decrypt file": DECRYPT_FILE_OUTPUT,
  "help": HELP_OUTPUT,
};

function colorClass(type: HistoryLine["type"]) {
  switch (type) {
    case "error":   return "text-red-400";
    case "success": return "text-green-400";
    case "info":    return "text-cyan-400";
    case "input":   return "text-primary font-bold";
    default:        return "text-foreground/80";
  }
}

export default function TerminalMode() {
  const [history, setHistory] = useState<HistoryLine[]>([
    { type: "info", text: "CyberVerse Terminal v2.0 — Simulated Hacking Environment" },
    { type: "info", text: 'Type "help" for available commands.' },
    { type: "output", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function appendLines(lines: HistoryLine[], afterMs = 0) {
    setIsTyping(true);
    lines.forEach((line, i) => {
      setTimeout(() => {
        setHistory(h => [...h, line]);
        if (i === lines.length - 1) setIsTyping(false);
      }, afterMs + i * 80);
    });
  }

  async function runCommand(cmd: string) {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;

    setCmdHistory(h => [trimmed, ...h]);
    setCmdIdx(-1);
    setHistory(h => [...h, { type: "input", text: `operator@cyberverse:~$ ${trimmed}` }]);
    setInput("");
    audioEffects.typing();

    if (trimmed === "clear") {
      setHistory([
        { type: "info", text: "CyberVerse Terminal v2.0 — Simulated Hacking Environment" },
        { type: "info", text: 'Type "help" for available commands.' },
        { type: "output", text: "" },
      ]);
      return;
    }

    if (trimmed === "whoami") {
      const user = localStorage.getItem("cv_username") ?? "operator";
      appendLines([
        { type: "success", text: `User: ${user}` },
        { type: "output", text: "Role: Penetration Tester (Trainee)" },
        { type: "output", text: "Clearance: Level 2 — Restricted" },
        { type: "output", text: "Shell: /bin/cybersh" },
      ]);
      return;
    }

    if (trimmed === "status") {
      appendLines([
        { type: "success", text: "System Status: OPERATIONAL" },
        { type: "output", text: `Uptime: ${Math.floor(Math.random() * 72 + 1)}h ${Math.floor(Math.random() * 60)}m` },
        { type: "output", text: "CPU: 12% | RAM: 4.2GB / 16GB | NET: 1Gbps" },
        { type: "info",   text: "Firewall: ACTIVE | VPN: CONNECTED | IDS: ENABLED" },
        { type: "success", text: "No active threats detected." },
      ]);
      return;
    }

    const matched = COMMANDS[trimmed];
    if (matched) {
      appendLines(matched);
      audioEffects.alert();
    } else {
      setHistory(h => [...h,
        { type: "error", text: `Command not found: ${trimmed}` },
        { type: "info",  text: 'Type "help" to see available commands.' },
      ]);
      audioEffects.error();
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { runCommand(input); return; }
    if (e.key === "ArrowUp") {
      const nextIdx = Math.min(cmdIdx + 1, cmdHistory.length - 1);
      setCmdIdx(nextIdx);
      setInput(cmdHistory[nextIdx] ?? "");
    }
    if (e.key === "ArrowDown") {
      const nextIdx = Math.max(cmdIdx - 1, -1);
      setCmdIdx(nextIdx);
      setInput(nextIdx === -1 ? "" : cmdHistory[nextIdx]);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Hacker Terminal</h1>
            <p className="text-xs text-muted-foreground font-mono">Simulated command-line environment · Educational only</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-mono text-green-400">SECURE SHELL ACTIVE</span>
        </div>
      </div>

      {/* Quick command buttons */}
      <div className="flex flex-wrap gap-2">
        {["scan network", "analyze email", "decrypt file", "whoami", "help"].map(cmd => (
          <button
            key={cmd}
            disabled={isTyping}
            onClick={() => runCommand(cmd)}
            className="text-xs px-3 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 font-mono transition-all disabled:opacity-40"
          >
            &gt; {cmd}
          </button>
        ))}
      </div>

      {/* Terminal window */}
      <Card className="border border-primary/20 bg-black/60">
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/20">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">operator@cyberverse:~$</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-[9px] text-primary font-mono">ENCRYPTED</span>
          </div>
        </div>
        <CardContent className="p-0">
          <div
            className="h-96 overflow-y-auto p-4 font-mono text-xs space-y-0.5 cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <AnimatePresence initial={false}>
              {history.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`leading-relaxed ${colorClass(line.type)}`}
                >
                  {line.text || "\u00A0"}
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-primary"
              >
                <span className="animate-pulse">▌ processing...</span>
              </motion.div>
            )}

            {!isTyping && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-primary">operator@cyberverse:~$</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  className="flex-1 bg-transparent outline-none text-foreground caret-primary placeholder:text-muted-foreground/40"
                  placeholder="type a command..."
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </CardContent>
      </Card>

      {/* Learning tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Zap, label: "Network Scanning", desc: "Learn to identify open ports and exposed services.", color: "text-yellow-400 border-yellow-400/20" },
          { icon: AlertTriangle, label: "Email Forensics", desc: "Detect phishing via SPF, DKIM, and DMARC analysis.", color: "text-red-400 border-red-400/20" },
          { icon: Shield, label: "Cryptography", desc: "Understand encryption, key management, and cipher analysis.", color: "text-primary border-primary/20" },
        ].map(item => (
          <div key={item.label} className={`rounded-lg border p-3 ${item.color} bg-black/20`}>
            <item.icon className={`w-4 h-4 mb-1.5 ${item.color.split(" ")[0]}`} />
            <div className="text-xs font-bold mb-0.5">{item.label}</div>
            <div className="text-[10px] text-muted-foreground">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
