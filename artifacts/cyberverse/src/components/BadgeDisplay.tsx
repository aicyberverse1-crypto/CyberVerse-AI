import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const GLOW_CLASS = "shadow-[0_0_14px_rgba(34,197,94,0.18)]";

// ✅ FIX: Export added
export const BADGE_DEFS = {
  top_hacker: {
    label: "Top Hacker",
    icon: "👑",
    desc: "Highest daily score",
    color: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
  },
  phishing_master: {
    label: "Phishing Master",
    icon: "🎣",
    desc: "10+ correct phishing answers",
    color: "border-blue-400/40 bg-blue-400/10 text-blue-400",
  },
  speed_runner: {
    label: "Speed Runner",
    icon: "⚡",
    desc: "Lightning-fast average response",
    color: "border-primary/40 bg-primary/10 text-primary",
  },
  defender_pro: {
    label: "Defender Pro",
    icon: "🛡️",
    desc: "Defense score over 300",
    color: "border-green-400/40 bg-green-400/10 text-green-400",
  },
} as const;

// ✅ Optional: type safety (very useful)
export type BadgeKey = keyof typeof BADGE_DEFS;

export function getStreakTitle(streakDays: number): string | null {
  if (streakDays >= 10) return "Unstoppable 🔥🔥";
  if (streakDays >= 5) return "On Fire 🔥";
  if (streakDays >= 3) return "Rising ⚡";
  return null;
}

interface BadgeDisplayProps {
  badges: BadgeKey[]; // ✅ improved type
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  animate?: boolean;
}

export function BadgeDisplay({
  badges,
  size = "sm",
  showLabels = false,
  animate = true,
}: BadgeDisplayProps) {
  if (!badges || badges.length === 0) return null;

  const sizeClasses = {
    sm: "text-sm px-1.5 py-0.5 text-[10px]",
    md: "text-base px-2 py-1 text-xs",
    lg: "text-xl px-3 py-1.5 text-sm",
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {badges.map((badgeId, i) => {
        const def = BADGE_DEFS[badgeId];
        if (!def) return null;

        const badge = (
          <motion.div
            key={badgeId}
            initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
            animate={animate ? { opacity: 1, scale: 1 } : undefined}
            transition={animate ? { delay: i * 0.1 } : undefined}
            className={`inline-flex items-center gap-1 rounded-full border font-mono font-bold ${GLOW_CLASS} ${sizeClasses[size]} ${def.color}`}
          >
            <span>{def.icon}</span>
            {showLabels && <span>{def.label}</span>}
          </motion.div>
        );

        return (
          <Tooltip key={badgeId}>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-bold">
                {def.icon} {def.label}
              </p>
              <p className="text-muted-foreground">{def.desc}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

interface StreakTitleProps {
  streakDays: number;
  className?: string;
  animate?: boolean;
}

export function StreakTitle({
  streakDays,
  className = "",
  animate = true,
}: StreakTitleProps) {
  const title = getStreakTitle(streakDays);
  if (!title) return null;

  const isUnstoppable = streakDays >= 10;
  const isOnFire = streakDays >= 5;

  return (
    <motion.span
      initial={animate ? { opacity: 0, x: -10 } : undefined}
      animate={animate ? { opacity: 1, x: 0 } : undefined}
      className={`inline-flex items-center font-mono font-bold text-xs px-2 py-0.5 rounded-full border ${
        animate ? "transition-all duration-300" : ""
      } ${
        isUnstoppable
          ? "text-red-400 border-red-400/40 bg-red-400/10 shadow-[0_0_8px_rgba(248,113,113,0.4)]"
          : isOnFire
          ? "text-orange-400 border-orange-400/40 bg-orange-400/10 shadow-[0_0_8px_rgba(251,146,60,0.4)]"
          : "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
      } ${className}`}
    >
      {title}
    </motion.span>
  );
}

interface IdentityLineProps {
  username: string;
  rankTier: string;
  hackerType: string;
  streakDays: number;
  badges: BadgeKey[];
  isTopHacker?: boolean;
}

export function IdentityLine({
  username,
  rankTier,
  hackerType,
  streakDays,
  badges,
  isTopHacker,
}: IdentityLineProps) {
  const streakTitle = getStreakTitle(streakDays);
  const role = hackerType === "attacker" ? "Attacker ⚔️" : "Defender 🛡️";

  return (
    <div className="flex items-center flex-wrap gap-1.5 text-xs font-mono">
      <span className="font-bold text-foreground">{username}</span>
      <span className="text-muted-foreground">•</span>
      <span className="text-purple-400">{rankTier}</span>
      <span className="text-muted-foreground">•</span>
      <span
        className={
          hackerType === "attacker" ? "text-red-400" : "text-primary"
        }
      >
        {role}
      </span>

      {streakTitle && (
        <>
          <span className="text-muted-foreground">•</span>
          <StreakTitle streakDays={streakDays} animate={false} />
        </>
      )}

      {badges.length > 0 && (
        <>
          <span className="text-muted-foreground">•</span>
          <BadgeDisplay badges={badges} size="sm" animate={false} />
        </>
      )}
    </div>
  );
}