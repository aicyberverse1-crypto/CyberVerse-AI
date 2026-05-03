import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Newspaper, AlertTriangle, Shield, Bot, ChevronDown, ExternalLink, Zap, Lock, Globe, Eye } from "lucide-react";
import { useSendAiChatMessage } from "@workspace/api-client-react";
import { audioEffects } from "@/hooks/useAudio";

// Cyber news memory: shown inline per article
const MOCK_NEWS = [
  {
    id: 1,
    title: "Massive Healthcare Data Breach Exposes 23 Million Patient Records",
    source: "CyberWatch Daily",
    date: "May 3, 2026",
    category: "Breach",
    severity: "CRITICAL",
    summary: "A ransomware group breached the largest US healthcare network, exfiltrating PII, medical records, and insurance data. The attack vector was an unpatched VPN appliance.",
    impact: "23M patients affected across 47 states",
    lesson: "Patch management is not optional — a single unpatched VPN gateway led to a $340M breach. Healthcare is the #1 most targeted sector.",
    tips: ["Audit all internet-facing appliances monthly", "Implement network segmentation for medical systems", "Assume breach — deploy endpoint detection on all devices"],
    icon: Lock,
    color: "text-red-400",
    bg: "border-red-400/20 bg-red-400/5",
  },
  {
    id: 2,
    title: "New Ransomware 'BlackMamba' Uses AI to Rewrite Its Own Code",
    source: "ThreatPost",
    date: "May 2, 2026",
    category: "Malware",
    severity: "HIGH",
    summary: "BlackMamba is a polymorphic ransomware that uses a local LLM to regenerate its code on each infection, evading signature-based detection entirely.",
    impact: "500+ companies hit across 30 countries",
    lesson: "Signature-based antivirus is losing the war. AI-powered malware can mutate in real-time. Behavioral detection and zero-trust architecture are now essential.",
    tips: ["Deploy EDR (Endpoint Detection & Response) tools", "Behavioral analytics catch what signatures miss", "Network segmentation limits ransomware spread"],
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "border-orange-400/20 bg-orange-400/5",
  },
  {
    id: 3,
    title: "State-Sponsored Hackers Exploit Chrome Zero-Day in Spear Phishing Campaign",
    source: "Google Threat Intelligence",
    date: "May 1, 2026",
    category: "Vulnerability",
    severity: "CRITICAL",
    summary: "A nation-state APT group exploited a zero-day in Chrome's V8 engine to deliver spyware via malicious PDF links sent to government officials.",
    impact: "Active exploitation in 12 countries",
    lesson: "Zero-days are often delivered via phishing. Even fully patched browsers can have unknown vulnerabilities. Defense-in-depth and user awareness are your best protection.",
    tips: ["Enable Chrome auto-updates", "Treat unsolicited links with extreme caution", "Use browser isolation for high-value targets"],
    icon: Globe,
    color: "text-yellow-400",
    bg: "border-yellow-400/20 bg-yellow-400/5",
  },
  {
    id: 4,
    title: "FBI Warning: QR Code Phishing (Quishing) Up 400% in 2026",
    source: "FBI Cyber Division",
    date: "Apr 30, 2026",
    category: "Phishing",
    severity: "HIGH",
    summary: "QR codes in emails, flyers, and physical spaces are increasingly used to bypass email filters and deliver phishing pages. Attackers replace legitimate QR codes in parking lots and cafes.",
    impact: "Estimated $1.2B losses in Q1 2026",
    lesson: "QR codes are the new phishing link. Users trained to hover over links have no equivalent reflex for QR codes. Always check the URL after scanning before entering credentials.",
    tips: ["Verify QR code destinations before acting", "Never scan QR codes in unexpected emails", "Use a QR scanner that previews the URL"],
    icon: Eye,
    color: "text-primary",
    bg: "border-primary/20 bg-primary/5",
  },
  {
    id: 5,
    title: "Critical Supply Chain Attack Targets 1,200 npm Packages",
    source: "Snyk Security",
    date: "Apr 29, 2026",
    category: "Supply Chain",
    severity: "HIGH",
    summary: "Attackers compromised maintainer accounts via credential stuffing to inject malicious code into popular npm packages, stealing environment variables and secrets from CI/CD pipelines.",
    impact: "1,200 packages, millions of downloads",
    lesson: "Open-source dependencies are an attack surface. Unpinned packages can be silently backdoored. Enable MFA for package registry accounts and pin dependency versions.",
    tips: ["Pin dependency versions (lock files)", "Enable MFA on npm/PyPI accounts", "Run dependency audits in CI/CD pipeline"],
    icon: Shield,
    color: "text-blue-400",
    bg: "border-blue-400/20 bg-blue-400/5",
  },
  {
    id: 6,
    title: "Water Treatment Facility Hack: Attacker Changes Chemical Levels Remotely",
    source: "ICS-CERT",
    date: "Apr 27, 2026",
    category: "Critical Infrastructure",
    severity: "CRITICAL",
    summary: "An attacker used default credentials on a remote access system to access a water treatment plant SCADA system, attempting to increase sodium hydroxide levels to dangerous concentrations.",
    impact: "100,000 residents at risk before detection",
    lesson: "OT/ICS systems (power grids, water treatment, hospitals) are increasingly targeted by nation-states. Default credentials are a systemic problem. Air-gapping critical control systems is now a necessity.",
    tips: ["Change ALL default credentials on ICS/SCADA systems", "Air-gap critical infrastructure control networks", "Implement anomaly detection on control system traffic"],
    icon: Zap,
    color: "text-purple-400",
    bg: "border-purple-400/20 bg-purple-400/5",
  },
];

const CATEGORIES = ["All", "Breach", "Malware", "Vulnerability", "Phishing", "Supply Chain", "Critical Infrastructure"];
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-400/20 text-red-400 border-red-400/30",
  HIGH: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  MEDIUM: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
};

export default function News() {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const sendChat = useSendAiChatMessage();

  const filtered = filter === "All" ? MOCK_NEWS : MOCK_NEWS.filter(n => n.category === filter);

  async function getAiExplanation(news: typeof MOCK_NEWS[0]) {
    if (aiExplanations[news.id]) return;
    setLoadingId(news.id);
    audioEffects.typing();
    sendChat.mutate(
      { data: { message: `Explain this cybersecurity incident in simple terms for a beginner student: "${news.title}". ${news.summary} What should ordinary people and companies learn from this? Keep it concise and practical (3-4 sentences).` } },
      {
        onSuccess: (data) => {
          setAiExplanations(prev => ({ ...prev, [news.id]: data.response }));
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
            <p className="text-xs text-muted-foreground font-mono">Live threats · AI-explained · Real-world impact</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground">LIVE FEED</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border font-mono transition-all ${
              filter === cat ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News items */}
      <div className="space-y-4">
        {filtered.map((item, i) => {
          const Icon = item.icon;
          const isOpen = expanded === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className={`border transition-all ${item.bg}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-foreground leading-snug">{item.title}</h3>
                        <Badge className={`text-[10px] shrink-0 ${SEVERITY_COLORS[item.severity]}`}>{item.severity}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mb-2">
                        <span>{item.source}</span>
                        <span>·</span>
                        <span>{item.date}</span>
                        <span>·</span>
                        <span className={item.color}>{item.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                      <p className="text-xs text-orange-400 font-semibold mt-1.5">{item.impact}</p>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-4 border-t border-current/20 pt-4"
                      >
                        {/* Lesson */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> What You Should Learn
                          </p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{item.lesson}</p>
                        </div>

                        {/* Action tips */}
                        <div>
                          <p className="text-xs font-bold text-foreground mb-2">Defensive Actions:</p>
                          <div className="space-y-1">
                            {item.tips.map(tip => (
                              <div key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
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
                                {loadingId === item.id ? (
                                  <span className="animate-pulse">Thinking...</span>
                                ) : (
                                  <><Bot className="w-3 h-3" /> Ask AI</>
                                )}
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
