import { useState } from "react";
import { useLocation } from "wouter";
import { setToken } from "@/lib/auth";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        toast({
          title: "Registration Successful",
          description: "Operator profile created.",
        });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Registration Failed",
          description: error.message || "Could not create profile.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    registerMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0 pointer-events-none"></div>
      <Card className="w-full max-w-md relative z-10 border-primary/20 bg-card/50 backdrop-blur-md shadow-2xl shadow-primary/5">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full ring-1 ring-primary/30">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">New Operator</CardTitle>
          <CardDescription className="text-muted-foreground">
            Create your profile to access the simulation platform
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Desired Operator ID</Label>
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
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Creating Profile..." : "Create Profile"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Already an operator?{" "}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-primary hover:underline"
              >
                Access Terminal
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
