import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, AlertTriangle, Shield, Bot, ChevronDown,
  Lock, Globe, Eye, Zap, RefreshCw, Clock
} from "lucide-react";
import { useSendAiChatMessage } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth";
import { audioEffects } from "@/hooks/useAudio";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NewsItem {
  id: number;
  title: string;
  source: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  summary: string;
  impact: string;
  lesson: string;
  tips: string[];
  color: string;
}

// ─── Icon + colour helpers ────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  "text-red-400":    AlertTriangle,
  "text-orange-400": Shield,
  "text-yellow-400": Globe,
  "text-primary":    Eye,
  "text-blue-400":   Lock,
  "text-purple-400": Zap,
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-400/20 text-red-400 border-red-400/30",
  HIGH:     "bg-orange-400/20 text-orange-400 border-orange-400/30",
  MEDIUM:   "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
};

const CATEGORIES = ["All", "Breach", "Malware", "Vulnerability", "Phishing", "Supply Chain", "Critical Infrastructure"];

// ─── Fallback data (shown while AI loads or on error) ────────────────────────

const FALLBACK: NewsItem[] = [
  {
    id: 1, title: "Massive Healthcare Data Breach Exposes 23M Records",
    source: "CyberWatch Daily", category: "Breach", severity: "CRITICAL",
    summary: "A ransomware group breached the largest US healthcare network via an unpatched VPN appliance, exfiltrating PII and medical records.",
    impact: "23M patients affected across 47 states",
    lesson: "Patch management is not optional — a single unpatched gateway led to a $340M breach.",
    tips: ["Audit all internet-facing appliances monthly", "Implement network segmentation", "Deploy endpoint detection on all devices"],
    color: "text-red-400",
  },
  {
    id: 2, title: "AI-Powered Ransomware 'BlackMamba' Rewrites Its Own Code",
    source: "ThreatPost", category: "Malware", severity: "HIGH",
    summary: "BlackMamba uses a local LLM to regenerate its payload on each infection, evading all signature-based detection.",
    impact: "500+ companies hit across 30 countries",
    lesson: "Behavioral detection and zero-trust architecture are now essential.",
    tips: ["Deploy EDR tools", "Behavioral analytics catch what signatures miss", "Segment your network to limit spread"],
    color: "text-orange-400",
  },
  {
    id: 3, title: "State-Sponsored APT Exploits Chrome Zero-Day",
    source: "Google Threat Intelligence", category: "Vulnerability", severity: "CRITICAL",
    summary: "A nation-state group exploited a V8 engine zero-day to deliver spyware via malicious PDF links sent to government officials.",
    impact: "Active exploitation in 12 countries",
    lesson: "Zero-days are often delivered via phishing. Defense-in-depth is your best protection.",
    tips: ["Enable Chrome auto-updates", "Treat unsolicited links with caution", "Use browser isolation for high-value targets"],
    color: "text-yellow-400",
  },
  {
    id: 4, title: "FBI Warning: QR Code Phishing Up 400% in 2026",
    source: "FBI Cyber Division", category: "Phishing", severity: "HIGH",
    summary: "QR codes are increasingly used to bypass email filters. Attackers replace legitimate QR codes in public spaces.",
    impact: "Estimated $1.2B losses in Q1 2026",
    lesson: "Always verify the URL destination after scanning a QR code before entering any credentials.",
    tips: ["Verify QR destinations before acting", "Never scan QR codes in unexpected emails", "Use a scanner that previews the URL"],
    color: "text-primary",
  },
  {
    id: 5, title: "Supply Chain Attack Targets 1,200 npm Packages",
    source: "Snyk Security", category: "Supply Chain", severity: "HIGH",
    summary: "Attackers compromised maintainer accounts via credential stuffing to inject malicious code into popular npm packages.",
    impact: "1,200 packages, millions of downloads",
    lesson: "Enable MFA on all package registry accounts and pin dependency versions.",
    tips: ["Pin dependency versions", "Enable MFA on npm accounts", "Run dependency audits in CI/CD"],
    color: "text-blue-400",
  },
  {
    id: 6, title: "Water Treatment Facility Hack Changes Chemical Levels",
    source: "ICS-CERT", category: "Critical Infrastructure", severity: "CRITICAL",
    summary: "An attacker used default credentials on a remote access system to modify sodium hydroxide levels in a water treatment SCADA system.",
    impact: "100,000 residents at risk before detection",
    lesson: "Air-gap critical OT/ICS control networks from internet-accessible systems.",
    tips: ["Change ALL default credentials on ICS systems", "Air-gap critical infrastructure networks", "Implement anomaly detection on control traffic"],
    color: "text-purple-400",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function News() {
  const [filter, setFilter]           = useState("All");
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId]     = useState<number | null>(null);
  const [news, setNews]               = useState<NewsItem[]>(FALLBACK);
  const [fetching, setFetching]       = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [usingAI, setUsingAI]         = useState(false);
  const sendChat                      = useSendAiChatMessage();

  const fetchNews = useCallback(async (forceRefresh = false) => {
    const token = getToken();
    if (!token) return;
    setFetching(true);
    try {
      if (forceRefresh) {
        await fetch("/api/ai/news/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const res = await fetch("/api/ai/news", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        setNews(data.items as NewsItem[]);
        setLastUpdated(new Date(data.generatedAt));
        setUsingAI(true);
        audioEffects.success();
      }
    } catch {
      // Keep fallback data silently
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const filtered = filter === "All" ? news : news.filter(n => n.category === filter);

  async function getAiExplanation(item: NewsItem) {
    if (aiExplanations[item.id]) return;
    setLoadingId(item.id);
    audioEffects.typing();
    sendChat.mutate(
      { data: { message: `Explain this cybersecurity incident in simple terms for a beginner: "${item.title}". ${item.summary} What should ordinary people and companies learn? Keep it to 3-4 concise sentences.` } },
      {
        onSuccess: (data) => {
          setAiExplanations(prev => ({ ...prev, [item.id]: data.response }));
          setLoadingId(null);
          audioEffects.success();
        },
        onError: () => setLoadingId(null),
      }
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Newspaper className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Cyber Threat Intelligence Feed</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {usingAI ? "AI-generated · updates every 15 min" : "Curated intel · AI-explained · Real-world impact"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            disabled={fetching}
            onClick={() => fetchNews(true)}
          >
            <RefreshCw className={`w-3 h-3 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Refreshing…" : "Refresh Feed"}
          </Button>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${usingAI ? "bg-primary" : "bg-red-400"} animate-pulse`} />
            <span className="text-xs font-mono text-muted-foreground">{usingAI ? "AI LIVE" : "STATIC"}</span>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {fetching && !usingAI && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border font-mono transition-all ${
              filter === cat
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News items */}
      <div className="space-y-4">
        {filtered.map((item, i) => {
          const IconComponent = ICON_MAP[item.color] ?? Shield;
          const isOpen = expanded === item.id;
          const bgClass = item.color.replace("text-", "border-").replace("-400", "-400/20") + " " +
                          item.color.replace("text-", "bg-").replace("-400", "-400/5");

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={`border transition-all ${bgClass}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
                      <IconComponent className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-foreground leading-snug">{item.title}</h3>
                        <Badge className={`text-[10px] shrink-0 ${SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.MEDIUM}`}>
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mb-2">
                        <span>{item.source}</span>
                        <span>·</span>
                        <span className={item.color}>{item.category}</span>
                        {usingAI && <span>· <span className="text-primary">AI</span></span>}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                      <p className="text-xs text-orange-400 font-semibold mt-1.5">{item.impact}</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-4 border-t border-current/20 pt-4 overflow-hidden"
                      >
                        {/* Lesson */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> What You Should Learn
                          </p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{item.lesson}</p>
                        </div>

                        {/* Tips */}
                        <div>
                          <p className="text-xs font-bold text-foreground mb-2">Defensive Actions:</p>
                          <div className="space-y-1">
                            {(item.tips ?? []).map((tip, ti) => (
                              <div key={ti} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-primary mt-0.5">▸</span>
                                {tip}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI explanation */}
                        <div className="bg-muted/30 border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-primary" /> CyberGuard AI Explains
                            </p>
                            {!aiExplanations[item.id] && (
                              <Button
                                size="sm"
                                onClick={() => getAiExplanation(item)}
                                disabled={loadingId === item.id}
                                className="h-6 text-[10px] px-2 gap-1"
                              >
                                {loadingId === item.id
                                  ? <span className="animate-pulse">Thinking…</span>
                                  : <><Bot className="w-3 h-3" /> Ask AI</>}
                              </Button>
                            )}
                          </div>
                          {aiExplanations[item.id] ? (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-xs text-foreground/80 leading-relaxed"
                            >
                              {aiExplanations[item.id]}
                            </motion.p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Click "Ask AI" to get a personalized explanation of this incident.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => { setExpanded(isOpen ? null : item.id); if (!isOpen) audioEffects.alert(); }}
                    className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    {isOpen ? "Collapse" : "Read analysis + defensive tips"}
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
