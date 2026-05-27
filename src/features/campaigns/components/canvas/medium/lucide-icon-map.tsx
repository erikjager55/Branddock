/**
 * Lucide icon-name resolver voor Puck-componenten (FeatureGrid + co).
 *
 * AI-generator produceert icon-namen als strings ("zap" / "shield-check" /
 * "RULER"). Deze helper normaliseert + maps naar Lucide React-components,
 * met fallback naar null wanneer geen match (caller toont text-label).
 *
 * Allowlist beperkt tot ~50 icons die typisch voorkomen op landing-pages
 * (features, trust-badges, action-icons). Veel groter zou bundle-bloat
 * geven; veel kleiner zou te veel AI-suggesties missen.
 */
import * as React from 'react';
import {
  Zap, Sparkles, TrendingUp, Shield, ShieldCheck,
  Droplet, Droplets, Ruler, Layers, Activity, Award, BadgeCheck,
  Check, CheckCircle, CheckCircle2, ChevronRight, ChevronDown, Circle,
  Clock, Cpu, Database, Eye, FileText, Flame, Flag, Globe,
  Heart, Home, Image as ImageIcon, Info, Layout, Leaf,
  LineChart, Lock, Mail, MapPin, MessageCircle, Monitor, Moon, Package,
  PenTool, Phone, PieChart, Play, Plus, Rocket, Search, Server,
  Settings, Star, Sun, Target, ThumbsUp, Truck, User, Users,
  Wrench, Wand, Crown, Gem, Palette, Brush, Building, Briefcase,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  sparkles: Sparkles,
  'trending-up': TrendingUp,
  shield: Shield,
  'shield-check': ShieldCheck,
  droplet: Droplet,
  droplets: Droplets,
  ruler: Ruler,
  layers: Layers,
  activity: Activity,
  award: Award,
  'badge-check': BadgeCheck,
  check: Check,
  'check-circle': CheckCircle,
  'check-circle-2': CheckCircle2,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  circle: Circle,
  clock: Clock,
  cpu: Cpu,
  database: Database,
  eye: Eye,
  'file-text': FileText,
  flame: Flame,
  flag: Flag,
  globe: Globe,
  heart: Heart,
  home: Home,
  image: ImageIcon,
  info: Info,
  layout: Layout,
  leaf: Leaf,
  'line-chart': LineChart,
  lock: Lock,
  mail: Mail,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  monitor: Monitor,
  moon: Moon,
  package: Package,
  'pen-tool': PenTool,
  phone: Phone,
  'pie-chart': PieChart,
  play: Play,
  plus: Plus,
  rocket: Rocket,
  search: Search,
  server: Server,
  settings: Settings,
  star: Star,
  sun: Sun,
  target: Target,
  'thumbs-up': ThumbsUp,
  truck: Truck,
  user: User,
  users: Users,
  wrench: Wrench,
  wand: Wand,
  crown: Crown,
  gem: Gem,
  palette: Palette,
  brush: Brush,
  building: Building,
  briefcase: Briefcase,
};

/**
 * Normaliseert icon-name input naar canonical Lucide kebab-case key.
 * Voorbeelden:
 *  - "ShieldCheck" → "shield-check"
 *  - "SHIELD_CHECK" → "shield-check"
 *  - "shield check" → "shield-check"
 *  - "Zap" → "zap"
 */
export function normalizeIconName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Strip leading "lucide-" prefix als aanwezig
  const stripped = trimmed.replace(/^lucide[-_/]/i, '');
  // Detect CamelCase → kebab-case; splits ook digit-na-letter (CheckCircle2
  // → check-circle-2 zoals Lucide naming-convention)
  const kebab = stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  return kebab;
}

/**
 * Returnt Lucide-component voor naam of null wanneer geen match.
 */
export function resolveLucideIcon(rawName: string): LucideIcon | null {
  const key = normalizeIconName(rawName);
  if (!key) return null;
  return ICON_MAP[key] ?? null;
}

interface IconBlockProps {
  name: string;
  color: string;
  size?: number;
  /** Stroke-weight uit brand-iconography tokens (Fase C v4). Default 1.75. */
  strokeWeight?: number;
  /** Style voor de wrapper-div (alignment, margin, etc.). */
  wrapperStyle?: React.CSSProperties;
  /** Text-label rendering wanneer geen SVG-match — caller bepaalt styling. */
  fallbackTextStyle?: React.CSSProperties;
}

/**
 * Render-helper voor icon-prefix in feature-cards:
 *  - Match Lucide-naam → SVG (24px brand-color)
 *  - Geen match → tekst-label (caller's fallbackTextStyle)
 *  - Lege naam → null (geen render)
 */
export function IconBlock({
  name,
  color,
  size = 24,
  strokeWeight = 1.75,
  wrapperStyle,
  fallbackTextStyle,
}: IconBlockProps): React.ReactElement | null {
  if (!name || !name.trim()) return null;
  const Icon = resolveLucideIcon(name);
  if (Icon) {
    // React.createElement i.p.v. JSX om react-hooks/static-components
    // warning te omzeilen — Icon is bewust runtime-resolved per icon-name.
    return (
      <div style={wrapperStyle} aria-hidden="true">
        {React.createElement(Icon, { size, color, strokeWidth: strokeWeight })}
      </div>
    );
  }
  // Fallback: text-label (current legacy behavior)
  return (
    <div style={fallbackTextStyle} aria-hidden="true">
      {name}
    </div>
  );
}
