import { useLocation, Link } from "wouter";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Mail, Shield, Lock, Bot, Trophy, LogOut, Activity
} from "lucide-react";
import { useGetUser } from "@workspace/api-client-react";
import { removeToken } from "@/lib/auth";
import AiChatWidget from "@/components/AiChatWidget";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/phishing", label: "Phishing Detective", icon: Mail },
  { path: "/defense", label: "Attack Defense", icon: Shield },
  { path: "/builder", label: "Secure Builder", icon: Lock },
  { path: "/escape", label: "Escape Room", icon: Activity },
  { path: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetUser();

  function handleLogout() {
    removeToken();
    setLocation("/login");
  }

  const xpPercent = user ? (user.xp % 100) : 0;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-card border-r border-border shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary tracking-widest uppercase">CyberVerse</div>
              <div className="text-xs text-muted-foreground">AI Simulator</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    active
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="active-dot"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="text-xs font-mono text-muted-foreground">
            SOC TERMINAL v2.4 — {location.replace("/", "").toUpperCase() || "DASHBOARD"}
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">XP Progress</div>
                  <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPercent}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">LVL</div>
                  <div className="text-sm font-bold text-primary">{user.level}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-mono text-foreground">{user.username}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="text-primary font-bold">{user.xp}</span> XP
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}
