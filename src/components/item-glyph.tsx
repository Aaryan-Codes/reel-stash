import {
  BookOpen,
  Brain,
  Clapperboard,
  CookingPot,
  Database,
  FolderGit2,
  Globe,
  Lock,
  Music,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { pickItemIcon, iconTone, type ItemIconName } from "@/lib/item-icon";
import type { ReelBrief } from "@/lib/extractors/brief";
import { cn } from "@/lib/utils";

const ICONS: Record<ItemIconName, LucideIcon> = {
  github: FolderGit2,
  recipe: CookingPot,
  website: Globe,
  learning: BookOpen,
  spark: Sparkles,
  terminal: Terminal,
  brain: Brain,
  database: Database,
  phone: Smartphone,
  shield: Shield,
  video: Clapperboard,
  music: Music,
  palette: Palette,
  lock: Lock,
  globe: Globe,
  book: BookOpen,
};

export function ItemGlyph({
  category,
  brief,
  title,
  summary,
  size = "md",
}: {
  category?: string | null;
  brief?: ReelBrief | null;
  title?: string | null;
  summary?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const name = pickItemIcon({ category, brief, title, summary });
  const Icon = ICONS[name];
  const tone = iconTone(brief?.type || category);
  const box =
    size === "lg" ? "h-14 w-14 rounded-xl" : size === "sm" ? "h-9 w-9 rounded-lg" : "h-12 w-12 rounded-xl";
  const glyph = size === "lg" ? 26 : size === "sm" ? 16 : 22;

  return (
    <div className={cn("flex shrink-0 items-center justify-center", box, tone.tile)} aria-hidden>
      <Icon size={glyph} strokeWidth={1.7} />
    </div>
  );
}
