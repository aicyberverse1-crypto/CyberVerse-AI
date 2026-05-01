import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubmitScore, useSendAiChatMessage } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Shield, CheckCircle, XCircle, Bot, Eye, EyeOff, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PasswordStrength = "very-weak" | "weak" | "medium" | "strong" | "very-strong";

function checkStrength(pw: string): { strength: PasswordStrength; score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]{2,}/.test(pw)) score++;

  if (score <= 2) return { strength: "very-weak", score, label: "Very Weak", color: "#ef4444" };
  if (score <= 3) return { strength: "weak", score, label: "Weak", color: "#f97316" };
  if (score <= 5) return { strength: "medium", score, label: "Medium", color: "#eab308" };
  if (score <= 6) return { strength: "strong", score, label: "Strong", color: "#22c55e" };
  return { strength: "very-strong", score, label: "Very Strong", color: "#00ff88" };
}

export default function Builder() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [hackResult, setHackResult] = useState<"success" | "failed" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submitScore = useSubmitScore();
  const sendChat = useSendAiChatMessage();

  const strength = checkStrength(password);
  const strengthPercent = (strength.score / 8) * 100;

  function simulateHack() {
    if (!password) {
      toast({ title: "Error", description: "Set a password first", variant: "destructive" });
      return;
    }

    const hackSucceeds =
      strength.strength === "very-weak" || strength.strength === "weak" ||
      (!twoFa && strength.strength === "medium");

    setHackResult(hackSucceeds ? "success" : "failed");
    setSubmitted(true);

    const pts = hackSucceeds ? 10 : (twoFa && strength.strength === "very-strong" ? 200 : 100);
    const xp = hackSucceeds ? 5 : (twoFa ? 40 : 20);
    submitScore.mutate({ data: { mode: "builder", score: pts, xpEarned: xp } });

    sendChat.mutate(
      {
        data: {
          message: `Evaluate this password setup: password strength is "${strength.label}" (score ${strength.score}/8), 2FA is ${twoFa ? "enabled" : "disabled"}. Is this secure? What improvements would you suggest?`,
          gameMode: "builder",
        },
      },
      { onSuccess: (data) => setAiAnalysis(data.response) }
    );
  }

  function handleReset() {
    setPassword("");
    setTwoFa(false);
    setAiAnalysis(null);
    setHackResult(null);
    setSubmitted(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Lock className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">Secure Builder</h1>
        <Badge variant="outline" className="ml-auto border-primary/30 text-primary text-xs">
          System Design Challenge
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Design a secure authentication system. Set a strong password and configure 2FA, then simulate a hacking attempt to test your defenses.
      </p>

      {/* Password input */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Password Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>System Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setSubmitted(false); setHackResult(null); }}
                placeholder="Enter your password..."
                className="bg-background/50 border-muted font-mono pr-10"
                disabled={submitted}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {password && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Strength</span>
                <span style={{ color: strength.color }} className="font-semibold">{strength.label}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: strength.color }}
                  animate={{ width: `${strengthPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                {[
                  ["8+ chars", pw => pw.length >= 8],
                  ["12+ chars", pw => pw.length >= 12],
                  ["Uppercase", pw => /[A-Z]/.test(pw)],
                  ["Numbers", pw => /[0-9]/.test(pw)],
                  ["Lowercase", pw => /[a-z]/.test(pw)],
                  ["Symbols", pw => /[^A-Za-z0-9]/.test(pw)],
                ].map(([label, check]) => (
                  <div key={label as string} className={`flex items-center gap-1 ${(check as (pw: string) => boolean)(password) ? "text-primary" : "text-muted-foreground"}`}>
                    {(check as (pw: string) => boolean)(password)
                      ? <CheckCircle className="w-3 h-3" />
                      : <XCircle className="w-3 h-3" />
                    }
                    {label as string}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 2FA toggle */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Adds an extra layer of security</p>
            </div>
            <button
              onClick={() => !submitted && setTwoFa(!twoFa)}
              className={`w-12 h-6 rounded-full transition-colors relative ${twoFa ? "bg-primary" : "bg-muted"}`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white absolute top-0.5"
                animate={{ left: twoFa ? "calc(100% - 22px)" : "2px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Hack simulation */}
      {!submitted ? (
        <Button
          onClick={simulateHack}
          disabled={!password || sendChat.isPending}
          className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          size="lg"
        >
          <Zap className="w-4 h-4" />
          Simulate Hack Attempt
        </Button>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className={`border ${hackResult === "failed" ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"}`}>
              <CardContent className="p-4 flex gap-3 items-start">
                {hackResult === "failed"
                  ? <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  : <Zap className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                }
                <div>
                  <p className={`font-semibold mb-1 ${hackResult === "failed" ? "text-primary" : "text-destructive"}`}>
                    {hackResult === "failed" ? "System Secure — Hack Failed!" : "System Breached!"}
                  </p>
                  <p className="text-sm text-foreground/80">
                    {hackResult === "failed"
                      ? `Your ${strength.label.toLowerCase()} password${twoFa ? " + 2FA" : ""} successfully defended against the attack.`
                      : `A ${strength.label.toLowerCase()} password${twoFa ? "" : " without 2FA"} is vulnerable. The attacker got in.`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {aiAnalysis && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Bot className="w-4 h-4" /> CyberGuard Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-foreground/80 leading-relaxed">{aiAnalysis}</p>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full gap-2">
              Try Different Configuration
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
