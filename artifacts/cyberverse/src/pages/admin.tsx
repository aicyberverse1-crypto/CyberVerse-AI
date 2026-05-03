import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getToken, removeToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, Users, TrendingUp, Target, LogOut, Trash2, Search,
  ChevronUp, ChevronDown, RefreshCw, AlertTriangle, BarChart3,
  Crown, Zap, Activity, Filter
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AdminUser = {
  id: number;
  username: string;
  rankTier: string;
  totalScore: number;
  accuracyRate: number;
  streakDays: number;
  hintPoints: number;
  level: number;
  xp: number;
  gamesPlayed: number;
  hackerType: string;
  isTopHacker: boolean;
  createdAt: string;
};

type Analytics = {
  totalUsers: number;
  avgScore: number;
  avgAccuracy: number;
  totalQuestionsAnswered: number;
  rankDist: Record<string, number>;
  topUsers: { id: number; username: string; totalScore: number; rankTier: string; accuracyRate: number }[];
  bottomUsers: { id: number; username: string; totalScore: number; rankTier: string; accuracyRate: number }[];
};

const RANK_ORDER = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Elite Hacker"];
const RANK_COLORS: Record<string, string> = {
  "Bronze": "text-amber-600 bg-amber-600/10 border-amber-600/30",
  "Silver": "text-slate-400 bg-slate-400/10 border-slate-400/30",
  "Gold": "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  "Platinum": "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  "Diamond": "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "Elite Hacker": "text-purple-400 bg-purple-400/10 border-purple-400/30",
};

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [sortField, setSortField] = useState<keyof AdminUser>("totalScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<"users" | "analytics">("users");

  // Guard: only admins can view this page
  useEffect(() => {
    const isAdmin = localStorage.getItem("cv_is_admin");
    if (!isAdmin || !getToken()) {
      setLocation("/");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (rankFilter) params.set("rank", rankFilter);
    const res = await fetch(`${BASE}/api/admin/users?${params}`, { headers: authHeaders() });
    if (res.status === 403) { setLocation("/"); return; }
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }, [search, rankFilter]);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch(`${BASE}/api/admin/analytics`, { headers: authHeaders() });
    if (!res.ok) return;
    setAnalytics(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchAnalytics()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchAnalytics]);

  async function handleDelete(user: AdminUser) {
    setDeletingId(user.id);
    const res = await fetch(`${BASE}/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      await fetchAnalytics();
    }
    setDeletingId(null);
    setConfirmDelete(null);
  }

  function handleLogout() {
    removeToken();
    localStorage.removeItem("cv_is_admin");
    setLocation("/");
  }

  function handleSort(field: keyof AdminUser) {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const av = a[sortField] as number | string;
    const bv = b[sortField] as number | string;
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  function SortIcon({ field }: { field: keyof AdminUser }) {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-400/20 flex items-center justify-center ring-1 ring-red-400/30">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <span className="text-sm font-black font-mono text-red-400 tracking-widest">CYBERVERSE</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-2">ADMIN CONTROL PANEL</span>
          </div>
          <Badge className="bg-red-400/10 text-red-400 border-red-400/30 text-[10px] font-mono ml-2">
            CLASSIFIED
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); Promise.all([fetchUsers(), fetchAnalytics()]).finally(() => setLoading(false)); }} className="gap-1.5 text-xs h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stats overview */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: "Total Operators", value: analytics.totalUsers, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
              { icon: TrendingUp, label: "Avg Score", value: analytics.avgScore.toLocaleString(), color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
              { icon: Target, label: "Avg Accuracy", value: `${analytics.avgAccuracy}%`, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
              { icon: Activity, label: "Questions Answered", value: analytics.totalQuestionsAnswered.toLocaleString(), color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
            ].map(s => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border ${s.bg}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
                      <div className="text-[11px] text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {(["users", "analytics"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "users" ? <><Users className="w-3.5 h-3.5 inline mr-1.5" />User Management</> : <><BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />Analytics</>}
            </button>
          ))}
        </div>

        {/* USER MANAGEMENT TAB */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search + filter bar */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs font-mono bg-card border-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={rankFilter}
                  onChange={e => setRankFilter(e.target.value)}
                  className="h-9 px-3 text-xs font-mono bg-card border border-border rounded-md text-foreground"
                >
                  <option value="">All Ranks</option>
                  {RANK_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="text-xs font-mono text-muted-foreground self-center">
                {sortedUsers.length} operator{sortedUsers.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* User table */}
            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {[
                        { label: "#", field: "id" as keyof AdminUser },
                        { label: "Username", field: "username" as keyof AdminUser },
                        { label: "Rank", field: "rankTier" as keyof AdminUser },
                        { label: "Score", field: "totalScore" as keyof AdminUser },
                        { label: "Accuracy", field: "accuracyRate" as keyof AdminUser },
                        { label: "Streak", field: "streakDays" as keyof AdminUser },
                        { label: "Hint Pts", field: "hintPoints" as keyof AdminUser },
                        { label: "Level", field: "level" as keyof AdminUser },
                        { label: "Joined", field: "createdAt" as keyof AdminUser },
                        { label: "", field: null },
                      ].map((col, i) => (
                        <th
                          key={i}
                          onClick={col.field ? () => handleSort(col.field!) : undefined}
                          className={`px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${col.field ? "cursor-pointer hover:text-foreground" : ""}`}
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.field && <SortIcon field={col.field} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground animate-pulse">Loading operators...</td></tr>
                    ) : sortedUsers.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No operators found</td></tr>
                    ) : (
                      sortedUsers.map((user, idx) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground">{user.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-bold">
                                {user.hackerType === "attacker" ? "⚔" : "🛡"} {user.username}
                              </span>
                              {user.isTopHacker && <Crown className="w-3 h-3 text-yellow-400" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] border ${RANK_COLORS[user.rankTier] ?? ""}`}>
                              {user.rankTier}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-primary font-bold">{user.totalScore.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={user.accuracyRate >= 80 ? "text-primary" : user.accuracyRate >= 60 ? "text-yellow-400" : "text-red-400"}>
                              {user.accuracyRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-orange-400">{user.streakDays}d 🔥</td>
                          <td className="px-4 py-3 text-yellow-400">{user.hintPoints}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-primary" />
                              {user.level}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(user)}
                              disabled={deletingId === user.id}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top performers */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-400" /> Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  {analytics.topUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono w-5 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                          #{i + 1}
                        </span>
                        <span className="font-bold text-foreground">{u.username}</span>
                        <Badge className={`text-[9px] border ${RANK_COLORS[u.rankTier] ?? ""}`}>{u.rankTier}</Badge>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-primary font-bold">{u.totalScore.toLocaleString()}</div>
                        <div className="text-muted-foreground">{u.accuracyRate.toFixed(0)}% acc</div>
                      </div>
                    </div>
                  ))}
                  {analytics.topUsers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>}
                </CardContent>
              </Card>

              {/* Needs improvement */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> Needs Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  {analytics.bottomUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono w-5 text-muted-foreground">#{i + 1}</span>
                        <span className="font-bold text-foreground">{u.username}</span>
                        <Badge className={`text-[9px] border ${RANK_COLORS[u.rankTier] ?? ""}`}>{u.rankTier}</Badge>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-orange-400 font-bold">{u.totalScore.toLocaleString()}</div>
                        <div className="text-muted-foreground">{u.accuracyRate.toFixed(0)}% acc</div>
                      </div>
                    </div>
                  ))}
                  {analytics.bottomUsers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>}
                </CardContent>
              </Card>
            </div>

            {/* Rank distribution */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Rank Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  {RANK_ORDER.map(rank => {
                    const count = analytics.rankDist[rank] ?? 0;
                    const pct = analytics.totalUsers > 0 ? (count / analytics.totalUsers) * 100 : 0;
                    return (
                      <div key={rank} className="flex items-center gap-3 text-xs">
                        <span className={`w-24 font-mono font-bold ${RANK_COLORS[rank]?.split(" ")[0] ?? ""}`}>{rank}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-muted-foreground">{count}</span>
                        <span className="w-10 text-right font-mono text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-red-400/30 rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delete Operator</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-1">
                Permanently delete <strong className="text-red-400">{confirmDelete.username}</strong>?
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                All scores, progress, and data for this operator will be erased from the database.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} className="flex-1 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletingId === confirmDelete.id}
                  className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingId === confirmDelete.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
