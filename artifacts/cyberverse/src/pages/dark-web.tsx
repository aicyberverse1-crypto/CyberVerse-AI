import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Eye, Search, Lock, Globe, CreditCard, Database, Key, Wifi, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { audioEffects } from "@/hooks/useAudio";

const LISTINGS = [
  {
    id: 1,
    category: "Stolen Data",
    icon: Database,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/20",
    title: "CC Fullz — Tier 1 Banks",
    price: "0.015 BTC",
    seller: "d4rk_m4rk3t",
    rating: 4.8,
    volume: "3.2K",
    description: "Credit card data with CVV, expiry, and cardholder info.",
    realThreat: "Full credit card records are harvested through data breaches at retailers, phishing campaigns, or card skimmers on ATMs/gas pumps.",
    protection: ["Use virtual card numbers", "Enable fraud alerts", "Check statements weekly", "Use credit not debit"],
    severity: "CRITICAL",
  },
  {
    id: 2,
    category: "Credentials",
    icon: Key,
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
    title: "Netflix/Streaming Combo 10K",
    price: "0.003 BTC",
    seller: "combo_king",
    rating: 4.5,
    volume: "12K",
    description: "Email:password combos from credential stuffing.",
    realThreat: "Credential stuffing attacks use leaked username/password lists from one site to attack other sites — exploiting password reuse.",
    protection: ["Use unique passwords per site", "Enable 2FA everywhere", "Use a password manager", "Check HaveIBeenPwned.com"],
    severity: "HIGH",
  },
  {
    id: 3,
    category: "Exploit Kits",
    icon: Wifi,
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
    title: "0-Day Chrome RCE PoC",
    price: "2.1 BTC",
    seller: "z3r0_d4y_s3ll",
    rating: 4.9,
    volume: "47",
    description: "Remote code execution in Chrome v119-121.",
    realThreat: "Zero-day exploits are vulnerabilities unknown to the software vendor. They're extremely valuable and used in nation-state attacks and ransomware.",
    protection: ["Keep browser updated", "Enable auto-updates", "Use browser sandboxing", "Consider alternative browsers"],
    severity: "CRITICAL",
  },
  {
    id: 4,
    category: "Malware-as-a-Service",
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
    title: "Ransomware Builder v4.2",
    price: "0.25 BTC",
    seller: "rns_factory",
    rating: 3.9,
    volume: "892",
    description: "Custom ransomware with C2 panel and affiliate program.",
    realThreat: "Ransomware-as-a-Service lets non-technical criminals deploy ransomware for a cut of profits. Responsible for 71% of ransomware attacks.",
    protection: ["Maintain offline backups", "Patch systems promptly", "Segment network", "Train employees on phishing"],
    severity: "CRITICAL",
  },
  {
    id: 5,
    category: "Access Brokers",
    icon: Lock,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    title: "Fortune 500 VPN Access",
    price: "0.8 BTC",
    seller: "acc3ss_br0k3r",
    rating: 5.0,
    volume: "23",
    description: "Admin access to major US corporation internal network.",
    realThreat: "Initial Access Brokers compromise corporate networks and sell that access to ransomware groups. The average time from access sale to ransomware deployment is 28 days.",
    protection: ["Implement Zero Trust architecture", "Enforce MFA on VPN", "Monitor for anomalous logins", "Regular penetration testing"],
    severity: "CRITICAL",
  },
  {
    id: 6,
    category: "PII Data",
    icon: CreditCard,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    title: "SSN + DOB Database — 500K",
    price: "0.45 BTC",
    seller: "pii_dealer",
    rating: 4.2,
    volume: "1.1K",
    description: "Social security numbers with full PII for identity theft.",
    realThreat: "PII (Personally Identifiable Information) is stolen from healthcare breaches, government systems, and financial institutions. Used for tax fraud, loan fraud, and identity theft.",
    protection: ["Freeze your credit", "Monitor for identity theft", "Use identity protection services", "Limit sharing of SSN"],
    severity: "HIGH",
  },
];

const CATEGORIES = ["All", "Stolen Data", "Credentials", "Exploit Kits", "Malware-as-a-Service", "Access Brokers", "PII Data"];

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-400 border-red-400/30 bg-red-400/10",
  HIGH: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};

function CybercrimeStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
      <div className="text-2xl font-black text-red-400 font-mono">{value}</div>
      <div className="text-xs font-semibold text-foreground mt-1">{label}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

export default function DarkWeb() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [investigatedId, setInvestigatedId] = useState<number | null>(null);
  const [neutralized, setNeutralized] = useState<Set<number>>(new Set());
  const [showWarning, setShowWarning] = useState(true);

  const filtered = activeCategory === "All" ? LISTINGS : LISTINGS.filter(l => l.category === activeCategory);

  function handleInvestigate(id: number) {
    audioEffects.alert();
    setInvestigatedId(id === investigatedId ? null : id);
  }

  function handleNeutralize(id: number) {
    audioEffects.success();
    setNeutralized(prev => new Set([...prev, id]));
    setInvestigatedId(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Warning banner */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-400/10 border border-yellow-400/40 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-400">⚠ SIMULATION ENVIRONMENT — EDUCATIONAL ONLY</p>
              <p className="text-xs text-muted-foreground mt-1">
                This Dark Web simulator is a <strong>completely fictional, safe educational tool</strong>. No actual criminal activity is represented or facilitated.
                All listings are fabricated to teach operators how cybercrime markets operate and how to defend against them.
              </p>
            </div>
            <button onClick={() => setShowWarning(false)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">
              Dismiss ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Dark Web Intelligence Center</h1>
            <p className="text-xs text-muted-foreground font-mono">.onion :: SIMULATION_MODE :: CLASSIFIED</p>
          </div>
        </div>
        <Badge className="bg-primary/20 border-primary/40 text-primary text-xs">
          <Shield className="w-3 h-3 mr-1" /> Analyst Mode
        </Badge>
      </div>

      {/* Cybercrime Stats — Why This Matters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Why This Matters — Real-World Cybercrime Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <CybercrimeStat value="$10.5T" label="Global cybercrime cost" sub="By 2025 annually" />
            <CybercrimeStat value="33B" label="Records breached" sub="Every year worldwide" />
            <CybercrimeStat value="94%" label="Breaches via phishing" sub="Most attacks start here" />
            <CybercrimeStat value="287 days" label="Time to detect breach" sub="Industry average" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cybercrime is the world's third-largest economy. Understanding how dark web marketplaces operate helps security professionals
            defend against real threats. The listings below represent actual categories of goods traded — learning to recognize them is
            the first step to stopping them.
          </p>
        </CardContent>
      </Card>

      {/* Score */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted-foreground">THREATS NEUTRALIZED:</span>
          <span className="text-primary font-bold">{neutralized.size}/{LISTINGS.length}</span>
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden ml-2">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${(neutralized.size / LISTINGS.length) * 100}%` }}
            />
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
          Mission: Neutralize All Threats
        </Badge>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-mono ${
              activeCategory === cat
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="space-y-3">
        {filtered.map((listing, i) => {
          const Icon = listing.icon;
          const isNeutralized = neutralized.has(listing.id);
          const isOpen = investigatedId === listing.id;

          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={`border transition-all ${isNeutralized ? "bg-primary/5 border-primary/20 opacity-60" : listing.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isNeutralized ? "bg-primary/20" : "bg-black/40"}`}>
                      {isNeutralized
                        ? <CheckCircle className="w-5 h-5 text-primary" />
                        : <Icon className={`w-5 h-5 ${listing.color}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className={`text-sm font-bold font-mono ${isNeutralized ? "text-primary line-through" : listing.color}`}>
                          {listing.title}
                        </p>
                        <Badge className={`text-[10px] ${SEVERITY_COLOR[listing.severity]}`}>{listing.severity}</Badge>
                        {isNeutralized && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">✓ NEUTRALIZED</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                        <span className="text-yellow-400">{listing.price}</span>
                        <span>seller: {listing.seller}</span>
                        <span>★ {listing.rating}</span>
                        <span>{listing.volume} sales</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{listing.description}</p>
                    </div>
                    {!isNeutralized && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvestigate(listing.id)}
                        className={`gap-1.5 text-xs border-current ${listing.color} hover:bg-current/10 shrink-0`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        {isOpen ? "Close" : "Investigate"}
                        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </Button>
                    )}
                  </div>

                  {/* Investigation panel */}
                  <AnimatePresence>
                    {isOpen && !isNeutralized && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-current/20 space-y-4"
                      >
                        <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Real-World Threat Intelligence
                          </p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{listing.realThreat}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Defensive Countermeasures
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {listing.protection.map(p => (
                              <div key={p} className="flex items-center gap-1.5 text-xs text-foreground/80">
                                <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                                {p}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleNeutralize(listing.id)}
                          className="w-full gap-2 bg-primary text-black font-bold text-xs"
                        >
                          <Shield className="w-4 h-4" />
                          ✓ Mark as Neutralized — Defenses Applied
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {neutralized.size === LISTINGS.length && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-primary/10 border-primary">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🛡</div>
              <p className="text-lg font-bold text-primary">Dark Web Intelligence Complete!</p>
              <p className="text-sm text-muted-foreground mt-2">
                You've successfully identified and applied defenses against all {LISTINGS.length} threat categories.
                This knowledge makes you a stronger defender in the real world.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
