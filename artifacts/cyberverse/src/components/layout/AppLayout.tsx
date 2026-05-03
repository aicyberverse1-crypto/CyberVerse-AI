import { useLocation, Link } from "wouter";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Mail, Shield, Lock, Bot, Trophy, LogOut, Activity,
  TreePine, Swords, Users, Lightbulb, Globe, Zap
} from "lucide-react";
import { useGetUser } from "@workspace/api-client-react";
import { removeToken } from "@/lib/auth";
import AiChatWidget from "@/components/AiChatWidget";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/phishing", label: "Phishing Detective", icon: Mail },
  { path: "/defense", label: "Attack Defense", icon: Shield },
  { path: "/builder", label: "Secure Builder", icon: Lock },
  { path: "/escape", label: "Escape Room", icon: Activity },
  { path: "/multiplayer", label: "Multiplayer", icon: Users },
  { path: "/missions", label: "AI Missions", icon: Swords },
  { path: "/dark-web", label: "Dark Web Intel", icon: Globe },
  { path: "/skill-tree", label: "Skill Tree", icon: TreePine },
  { path: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const RANK_COLORS: Record<string, string> = {
  "Bronze": "text-amber-600",
  "Silver": "text-slate-400",
  "Gold": "text-yellow-400",
  "Platinum": "text-cyan-400",
  "Diamond": "text-blue-400",
  "Elite Hacker": "text-purple-400",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetUser();

  function handleLogout() {
    removeToken();
    setLocation("/");
  }

  const xpPercent = user ? (user.xp % 100) : 0;
  const rankColor = RANK_COLORS[user?.rankTier ?? "Bronze"] ?? "text-amber-600";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-card border-r border-border shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-black text-primary tracking-widest uppercase font-mono">CyberVerse</div>
              <div className="text-[9px] text-muted-foreground font-mono">Train Like a Hacker. Think Like AI.</div>
            </div>
          </div>
        </div>

        {/* User mini profile */}
        {user && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className={`text-xs font-bold font-mono ${user.hackerType === "attacker" ? "text-red-400" : "text-primary"}`}>
                {user.hackerType === "attacker" ? "⚔" : "🛡"} {user.username}
              </div>
            </div>
            <div className={`text-[10px] font-semibold ${rankColor} mt-0.5`}>{user.rankTier}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground font-mono">Lv{user.level}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px]">
              <span className="text-muted-foreground">
                <Lightbulb className="w-2.5 h-2.5 inline mr-0.5 text-yellow-400" />
                <span className="text-yellow-400 font-bold">{user.hintPoints}</span> HP
              </span>
              <span className="text-muted-foreground">
                🔥 <span className="text-orange-400 font-bold">{user.streakDays}</span>d
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileHover={{ x: 3 }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    active
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.path === "/dark-web" && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono">NEW</span>
                  )}
                  {active && <motion.div layoutId="active-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            SOC TERMINAL v2.5 — {location.replace("/", "").replace(/-/g, " ").toUpperCase() || "DASHBOARD"}
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-400/10 rounded border border-yellow-400/20">
                <Lightbulb className="w-3 h-3 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">{user.hintPoints}</span>
                <span className="text-[10px] text-muted-foreground">HP</span>
              </div>
              <Badge variant="outline" className={`text-[10px] border-current ${rankColor}`}>
                {user.rankTier}
              </Badge>
              {user.isTopHacker && (
                <Badge className="text-[10px] bg-yellow-400/20 border-yellow-400/40 text-yellow-400">
                  👑 Top Hacker
                </Badge>
              )}
              <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded border border-border">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-xs font-mono">{user.username}</span>
                <span className="text-[10px] text-muted-foreground">Lv{user.level}</span>
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}
