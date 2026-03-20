import {
  Landmark,
  BrickWall,
  SquareStack,
  Home,
  Building2,
  Zap,
  Paintbrush,
  PanelTop,
  Wrench,
  Trophy,
  Bot,
  Smartphone,
  ArrowLeftRight,
  Ruler,
  Calculator,
  ClipboardCheck,
  Search,
  X,
  Hammer,
  Crosshair,
  Lightbulb,
  MessageCircle,
  BookOpen,
  Sun,
  Moon,
  Timer,
  Beaker,
  BarChart3,
  Grid3X3,
  DollarSign,
  Droplets,
  type LucideIcon,
} from "lucide-react";

/** Map string keys → Lucide icon components */
const ICON_MAP: Record<string, LucideIcon> = {
  // Categories
  foundation: Landmark,
  walls: BrickWall,
  flooring: SquareStack,
  roofing: Home,
  facade: Building2,
  engineering: Zap,
  interior: Paintbrush,
  ceiling: PanelTop,
  // Tools
  converter: ArrowLeftRight,
  area: Ruler,
  calculator: Calculator,
  checklist: ClipboardCheck,
  timer: Timer,
  measure: Beaker,
  compare: BarChart3,
  tile: Grid3X3,
  cost: DollarSign,
  primer: Droplets,
  // UI
  trophy: Trophy,
  bot: Bot,
  phone: Smartphone,
  search: Search,
  close: X,
  hammer: Hammer,
  target: Crosshair,
  lightbulb: Lightbulb,
  chat: MessageCircle,
  book: BookOpen,
  wrench: Wrench,
  sun: Sun,
  moon: Moon,
};

interface CategoryIconProps {
  /** Icon key from ICON_MAP */
  icon: string;
  /** Size in pixels */
  size?: number;
  /** Color (CSS color string) */
  color?: string;
  /** Additional CSS class */
  className?: string;
}

export default function CategoryIcon({
  icon,
  size = 20,
  color,
  className = "",
}: CategoryIconProps) {
  const Icon = ICON_MAP[icon];
  if (!Icon) return <span className={className}>{icon}</span>;
  return <Icon size={size} color={color} strokeWidth={1.8} className={className} />;
}

export { ICON_MAP };
