import * as React from "react";
import {
  ArrowDown, ArrowDownRight, ArrowLeftRight, ArrowUpRight, Banknote, Bell, Calendar, ChartNoAxesColumn, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock, CreditCard, Crown, Ellipsis, Equal, ExternalLink,
  Eye, EyeOff, House, Info, LayoutDashboard, LoaderCircle, LogOut, Megaphone, Menu, Monitor, Moon, OctagonAlert,
  PanelLeft, Paperclip, Percent, Plus, QrCode, Scissors, Search, Settings, ShieldCheck, ShoppingBag, SkipForward,
  Sun, Tag, Ticket, TicketPlus, TriangleAlert, Upload, UserRound, Users, Volume2, Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Registro de ícones Lucide do design system (nome kebab-case → componente).
 * No export do Claude Design o Icon baixava o Lucide por CDN; aqui usa o lucide-react
 * do projeto. O registro fechado mantém o bundle pequeno e deixa o nome tipado.
 * Ícone novo: importe do lucide-react e acrescente aqui.
 */
export const iconRegistry = {
  "arrow-down": ArrowDown,
  "arrow-down-right": ArrowDownRight,
  "arrow-left-right": ArrowLeftRight,
  "arrow-up-right": ArrowUpRight,
  banknote: Banknote,
  bell: Bell,
  calendar: Calendar,
  "chart-no-axes-column": ChartNoAxesColumn,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-check": CircleCheck,
  clock: Clock,
  "credit-card": CreditCard,
  crown: Crown,
  ellipsis: Ellipsis,
  equal: Equal,
  "external-link": ExternalLink,
  eye: Eye,
  "eye-off": EyeOff,
  house: House,
  info: Info,
  "layout-dashboard": LayoutDashboard,
  "loader-circle": LoaderCircle,
  "log-out": LogOut,
  megaphone: Megaphone,
  menu: Menu,
  monitor: Monitor,
  moon: Moon,
  "octagon-alert": OctagonAlert,
  "panel-left": PanelLeft,
  paperclip: Paperclip,
  percent: Percent,
  plus: Plus,
  "qr-code": QrCode,
  scissors: Scissors,
  search: Search,
  settings: Settings,
  "shield-check": ShieldCheck,
  "shopping-bag": ShoppingBag,
  "skip-forward": SkipForward,
  sun: Sun,
  tag: Tag,
  ticket: Ticket,
  "ticket-plus": TicketPlus,
  "triangle-alert": TriangleAlert,
  upload: Upload,
  "user-round": UserRound,
  users: Users,
  "volume-2": Volume2,
  wallet: Wallet,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconRegistry;
/** Nome do registro ou um componente Lucide qualquer. */
export type IconSource = IconName | LucideIcon;

export interface IconProps {
  /** Nome Lucide em kebab-case ("scissors", "arrow-up-right") ou o componente Lucide */
  name: IconSource;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Ícone Lucide: traço 2 px, cantos arredondados, currentColor. */
export function Icon({ name, size = 20, strokeWidth = 2, color = "currentColor", className = "", style }: IconProps) {
  const Cmp: LucideIcon = typeof name === "string" ? iconRegistry[name] : name;
  if (!Cmp) return null;
  return (
    <Cmp
      aria-hidden="true"
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      color={color}
      className={("np-icon " + className).trim()}
      style={{ flex: "none", ...style }}
    />
  );
}
