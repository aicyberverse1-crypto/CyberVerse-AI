import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { setToken } from "@/lib/auth";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Shield, Swords, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioEffects } from "@/hooks/useAudio";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"credentials" | "hacker-type">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hackerType, setHackerType] = useState<"defender" | "attacker" | null>(null);

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        audioEffects.success();
        toast({
          title: "Operator Profile Created",
          description: `Welcome, ${data.user.username}. You start with 500 hint points!`,
        });
        setLocation("/dashboard");
      },
      onError: (error) => {
        audioEffects.error();
        toast({
          title: "Registration Failed",
          description: error.message || "Could not create profile.",
          variant: "destructive",
        });
      },
    },
  });

  function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    audioEffects.typing();
    setStep("hacker-type");
  }

  function handleTypeSelect(type: "defender" | "attacker") {
    setHackerType(type);
    audioEffects.typing();
  }

  function handleFinalSubmit() {
    if (!hackerType) return;
    registerMutation.mutate({ data: { username, password, hackerType } });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0 pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === "credentials" ? (
          <motion.div key="credentials" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="w-full max-w-md relative z-10">
            <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-2xl shadow-primary/5">
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full ring-1 ring-primary/30">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-primary">New Operator</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Step 1 of 2 — Create your credentials
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCredentialsSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Operator ID</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="jdoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-background/50 border-muted focus-visible:ring-primary font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Passkey</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50 border-muted focus-visible:ring-primary font-mono"
                      required
                      minLength={6}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                  <div className="text-sm text-center text-muted-foreground">
                    Already an operator?{" "}
                    <button type="button" onClick={() => setLocation("/login")} className="text-primary hover:underline">
                      Access Terminal
                    </button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="hacker-type" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full max-w-lg relative z-10">
            <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-2xl shadow-primary/5">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight text-primary">Choose Your Path</CardTitle>
                <CardDescription>
                  Step 2 of 2 — Select your hacker identity. This determines your skill tree.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Defender */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTypeSelect("defender")}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      hackerType === "defender"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <Shield className="w-8 h-8 text-primary mb-3" />
                    <p className="font-bold text-sm text-primary mb-1">Defender</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Blue Team operator. Secure systems, detect threats, defend infrastructure.
                    </p>
                    <div className="mt-3 space-y-1">
                      {["Firewall Boost", "Hint Efficiency", "Shield Mode"].map((s) => (
                        <div key={s} className="text-xs text-primary/70 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-primary/50" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </motion.button>

                  {/* Attacker */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTypeSelect("attacker")}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      hackerType === "attacker"
                        ? "border-red-400 bg-red-400/10"
                        : "border-border hover:border-red-400/50 bg-card"
                    }`}
                  >
                    <Swords className="w-8 h-8 text-red-400 mb-3" />
                    <p className="font-bold text-sm text-red-400 mb-1">Attacker</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Red Team operator. Exploit systems, crack security, simulate attacks.
                    </p>
                    <div className="mt-3 space-y-1">
                      {["Exploit Mastery", "Speed Hack", "Overclock Mode"].map((s) => (
                        <div key={s} className="text-xs text-red-400/70 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-red-400/50" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </motion.button>
                </div>

                <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded-lg p-3">
                  🎁 You start with <span className="text-primary font-bold">500 hint points</span> and can change your type later
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("credentials")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={!hackerType || registerMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {registerMutation.isPending ? "Initializing..." : "Deploy Agent"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
