import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Phishing from "@/pages/phishing";
import Defense from "@/pages/defense";
import Builder from "@/pages/builder";
import Escape from "@/pages/escape";
import AiAssistant from "@/pages/ai-assistant";
import Leaderboard from "@/pages/leaderboard";
import SkillTree from "@/pages/skill-tree";
import Missions from "@/pages/missions";
import Multiplayer from "@/pages/multiplayer";
import DarkWeb from "@/pages/dark-web";
import AppLayout from "@/components/layout/AppLayout";
import { useEffect } from "react";
import { getToken } from "@/lib/auth";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const token = getToken();

  useEffect(() => {
    if (!token) setLocation("/");
  }, [token]);

  if (!token) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/phishing" component={() => <ProtectedRoute component={Phishing} />} />
      <Route path="/defense" component={() => <ProtectedRoute component={Defense} />} />
      <Route path="/builder" component={() => <ProtectedRoute component={Builder} />} />
      <Route path="/escape" component={() => <ProtectedRoute component={Escape} />} />
      <Route path="/ai-assistant" component={() => <ProtectedRoute component={AiAssistant} />} />
      <Route path="/leaderboard" component={() => <ProtectedRoute component={Leaderboard} />} />
      <Route path="/skill-tree" component={() => <ProtectedRoute component={SkillTree} />} />
      <Route path="/missions" component={() => <ProtectedRoute component={Missions} />} />
      <Route path="/multiplayer" component={() => <ProtectedRoute component={Multiplayer} />} />
      <Route path="/dark-web" component={() => <ProtectedRoute component={DarkWeb} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
