/*
 * Design system NP Hair Express ("Sua Vez Express"). Importe SEMPRE daqui:
 *   import { Button, GlassCard, NpThemeProvider } from "@design-system";
 * Os tokens (--np-*) entram pelo src/index.css; os estilos dos componentes entram por este arquivo.
 */
import "./styles/index.css";

// tema
export { NpThemeProvider, useNpTheme, NP_THEME_STORAGE_KEY, type NpTheme, type NpThemeProviderProps } from "./theme/ThemeProvider";

// core
export { Icon, iconRegistry, type IconName, type IconSource, type IconProps } from "./components/core/Icon";
export { Button, IconButton, type ButtonProps, type IconButtonProps } from "./components/core/Button";
export { Input, PasswordInput, Checkbox, type InputProps, type CheckboxProps } from "./components/core/Input";
export { UploadButton, type UploadButtonProps, type UploadState } from "./components/core/UploadButton";
export { Badge, CountBadge, StatusPill, StatusIndicator, Avatar, type BadgeProps, type BadgeTone, type CountBadgeProps, type StatusPillProps, type ProfessionalStatus, type AvatarProps } from "./components/core/Badge";
export { ThemeToggle, type ThemeToggleProps } from "./components/core/ThemeToggle";

// surfaces
export { GlassCard, StatCard, EmptyState, Skeleton, type GlassCardProps, type StatCardProps, type EmptyStateProps } from "./components/surfaces/GlassCard";
export { LineChart, BarChart, type LineChartProps, type BarChartProps } from "./components/surfaces/Charts";
export { CalendarCard, TaskList, type CalendarCardProps, type TaskListProps, type TaskItem, type DayMark } from "./components/surfaces/CalendarCard";

// navigation
export { GlassSidebar, type GlassSidebarProps, type SidebarItem, type SidebarSection, type SidebarChild } from "./components/navigation/GlassSidebar";
export { NavTabs, type NavTabsProps, type NavTab } from "./components/navigation/NavTabs";
export { TopBar, type TopBarProps } from "./components/navigation/TopBar";

// auth
export { LoginSlider, type LoginSliderProps, type LoginSliderValues } from "./components/auth/LoginSlider";

// domain (salão)
export { QueueTicketCard, ProfessionalCard, type QueueTicketCardProps, type ProfessionalCardProps, type TicketStatus } from "./components/domain/QueueTicketCard";
export { CheckoutCard, DiffField, DEFAULT_PAYMENT_METHODS, type CheckoutCardProps, type CheckoutItem, type PaymentMethod, type DiffFieldProps } from "./components/domain/CheckoutCard";
export { CashCard, Receipt, type CashCardProps, type CashLine, type ReceiptProps } from "./components/domain/CashCard";
export { PendingCard, type PendingCardProps, type PendingSeverity } from "./components/domain/PendingCard";

// data
export { RecordsTable, Tag, type RecordsTableProps, type RecordsColumn } from "./components/data/RecordsTable";

// templates
export { AppShell, type AppShellProps } from "./templates/AppShell";
export { PageHeader, type PageHeaderProps } from "./templates/PageHeader";

// utilidades e marca
export { cx, brl, parseBrl } from "./lib/cx";
export { npAssets } from "./assets";
