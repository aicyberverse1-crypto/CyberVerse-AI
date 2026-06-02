import { lazy, Suspense, Component, type ReactNode, type ErrorInfo, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getToken } from "@/lib/auth";

// ─── Lazy-loaded pages (code-split per route) ─────────────────────────────────
const Landing     = lazy(() => import("@/pages/landing"));
const Login       = lazy(() => import("@/pages/login"));
const Register    = lazy(() => import("@/pages/register"));
const Dashboard   = lazy(() => import("@/pages/dashboard"));
const Phishing    = lazy(() => import("@/pages/phishing"));
const Defense     = lazy(() => import("@/pages/defense"));
const Builder     = lazy(() => import("@/pages/builder"));
const Escape      = lazy(() => import("@/pages/escape"));
const AiAssistant = lazy(() => import("@/pages/ai-assistant"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const SkillTree   = lazy(() => import("@/pages/skill-tree"));
const Missions    = lazy(() => import("@/pages/missions"));
const Multiplayer = lazy(() => import("@/pages/multiplayer"));
const DarkWeb     = lazy(() => import("@/pages/dark-web"));
const News        = lazy(() => import("@/pages/news"));
const Certificate = lazy(() => import("@/pages/certificate"));
const Profile     = lazy(() => import("@/pages/profile"));
const Terminal    = lazy(() => import("@/pages/terminal"));
const Story       = lazy(() => import("@/pages/story"));
const Admin       = lazy(() => import("@/pages/admin"));
const NotFound    = lazy(() => import("@/pages/not-found"));
const AppLayout   = lazy(() => import("@/components/layout/AppLayout"));

// ─── React Query client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Route-level loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-muted-foreground animate-pulse">LOADING MODULE...</span>
      </div>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): EBState {
    return { hasError: true, message: error instanceof Error ? error.message : "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CyberVerse] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-bold text-red-400 font-mono">SYSTEM ERROR</h2>
            <p className="text-xs text-muted-foreground font-mono">{this.state.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, message: "" }); window.location.href = "/dashboard"; }}
              className="mt-4 px-4 py-2 text-xs border border-primary text-primary rounded-lg hover:bg-primary/10 font-mono transition-all"
            >
              ↩ Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected route ──────────────────────────────────────────────────────────
function ProtectedRoute({ component: Comp }: { component: React.LazyExoticComponent<React.ComponentType> }) {
  const [, setLocation] = useLocation();
  const token = getToken();

  useEffect(() => {
    if (!token) setLocation("/");
  }, [token, setLocation]);

  if (!token) return null;

  return (
    <Suspense fallback={<PageLoader />}>
      <AppLayout>
        <Comp />
      </AppLayout>
    </Suspense>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"          component={Landing} />
        <Route path="/login"     component={Login} />
        <Route path="/register"  component={Register} />

        <Route path="/dashboard"    component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/phishing"     component={() => <ProtectedRoute component={Phishing} />} />
        <Route path="/defense"      component={() => <ProtectedRoute component={Defense} />} />
        <Route path="/builder"      component={() => <ProtectedRoute component={Builder} />} />
        <Route path="/escape"       component={() => <ProtectedRoute component={Escape} />} />
        <Route path="/ai-assistant" component={() => <ProtectedRoute component={AiAssistant} />} />
        <Route path="/leaderboard"  component={() => <ProtectedRoute component={Leaderboard} />} />
        <Route path="/skill-tree"   component={() => <ProtectedRoute component={SkillTree} />} />
        <Route path="/missions"     component={() => <ProtectedRoute component={Missions} />} />
        <Route path="/multiplayer"  component={() => <ProtectedRoute component={Multiplayer} />} />
        <Route path="/dark-web"     component={() => <ProtectedRoute component={DarkWeb} />} />
        <Route path="/news"         component={() => <ProtectedRoute component={News} />} />
        <Route path="/certificate"  component={() => <ProtectedRoute component={Certificate} />} />
        <Route path="/profile"      component={() => <ProtectedRoute component={Profile} />} />
        <Route path="/terminal"     component={() => <ProtectedRoute component={Terminal} />} />
        <Route path="/story"        component={() => <ProtectedRoute component={Story} />} />
        <Route path="/admin"        component={() => <Suspense fallback={<PageLoader />}><Admin /></Suspense>} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
