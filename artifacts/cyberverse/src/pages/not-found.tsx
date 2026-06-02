import { Link } from "wouter";
import { Terminal, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-6 max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <p className="text-xs font-mono text-red-400 uppercase tracking-widest mb-2">// ERROR 404</p>
          <h1 className="text-3xl font-black font-mono text-foreground">PAGE NOT FOUND</h1>
          <p className="mt-3 text-sm text-muted-foreground font-mono">
            The requested module does not exist in this system.
          </p>
        </div>
        <Link href="/dashboard">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 text-primary text-sm font-mono hover:bg-primary/10 transition-colors cursor-pointer">
            <Terminal className="w-4 h-4" />
            Return to Dashboard
          </span>
        </Link>
      </div>
    </div>
  );
}
