// SafeTrail components (window.SafeTrail). Types are documentation.
import * as React from "react";
type IconName = "check" | "file-check-2" | "lock" | "info" | "circle-alert" | "circle-check" | "chevron-down" | "arrow-right" | "copy" | "inbox" | "eye-off" | "x" | "minus" | "search" | "archive" | "bell" | "users" | "menu" | "arrow-up-down" | "arrow-down" | "arrow-up" | "chevron-left" | "chevron-right" | "clipboard-list" | "message-square" | "paperclip" | "calendar";
export interface IconProps { name: IconName; size?: "sm"; label?: string; className?: string }
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "soft" | "ghost" | "weighty" | "danger" | "danger-solid" | "on-dark" | "ghost-on-dark";
  size?: "lg"; icon?: IconName; iconAfter?: IconName; loading?: boolean; href?: string; children: React.ReactNode;
}
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; helper?: string; error?: string; id?: string }
export interface StatusBadgeProps { status: "escalated" | "review" | "closed" }
export interface TamperCheckProps { time?: string; hash?: string; reviewer?: boolean }
export interface BannerProps { tone?: "info" | "attention" | "success"; children: React.ReactNode; link?: { label: string; href?: string } }
export interface CardProps { title?: string; meta?: string; href?: string; children?: React.ReactNode; className?: string }
export interface EmptyStateProps { title: string; children: React.ReactNode; icon?: IconName; action?: React.ReactElement }
export interface DialogProps { title: string; description?: string; children?: React.ReactNode; actions?: React.ReactElement[]; wide?: boolean; overlay?: boolean }
export interface ToastProps { children: React.ReactNode; icon?: IconName }
export interface TrailPatternProps { tone?: "light" | "dark"; lines?: number; height?: number; offset?: number }
export interface SiteNavProps { links?: { label: string; href: string }[]; cta?: string; name?: string }
export interface HeroProps { eyebrow?: string; title: string; lead?: string; primary: React.ReactElement; secondary?: React.ReactElement; note?: string; visual?: React.ReactElement; pattern?: boolean }
export interface ProductFrameProps { children: React.ReactNode; url?: string; label?: string }
export interface SectionProps { tone?: "canvas" | "card" | "tint" | "dark"; eyebrow?: string; title?: string; lead?: string; align?: "center"; pattern?: boolean; inset?: boolean; id?: string; children?: React.ReactNode }
export interface StepsProps { items: { title: string; body: string }[] }
export interface FeatureRowProps { eyebrow?: string; title: string; body?: string; points?: string[]; visual: React.ReactElement; reverse?: boolean }
export interface TrustPanelProps { does: string[]; doesNot: string[]; doesTitle?: string; doesNotTitle?: string }
export interface PilotStripProps { items: string[] }
export interface FaqProps { items: { q: string; a: string }[]; openFirst?: boolean }
export interface CtaBandProps { title: string; lead?: string; primary?: React.ReactElement }
export interface SiteFooterProps { columns?: { title: string; links: string[] }[]; blurb?: string; note?: string }
export interface SidebarProps { role?: "student" | "reviewer" | "admin"; items?: { label: string; icon: IconName }[]; active?: string; unread?: string[]; user?: string; userRole?: string; initials?: string }
export interface AppShellProps extends SidebarProps { density?: "comfortable" | "compact"; children: React.ReactNode }
export interface PageHeaderProps { title: string; description?: string; action?: React.ReactElement }
export interface StatTileProps { label: string; value: number | string; note?: string; icon?: IconName }
export interface SearchInputProps { label: string; placeholder?: string; defaultValue?: string }
export interface SelectProps { label: string; options: string[]; value?: string; prefix?: string }
export interface FilterChipProps { pressed?: boolean; removable?: boolean; icon?: IconName; children: React.ReactNode }
export interface TabsProps { items: { label: string; count?: number }[]; selected?: number; label?: string }
export interface PaginationProps { page: number; pageSize: number; total: number }
export interface DataTableColumn<R = any> { key: string; label: string; sortable?: boolean; align?: "right"; muted?: boolean; render?: (row: R) => React.ReactNode }
export interface DataTableProps<R = any> { columns: DataTableColumn<R>[]; rows: R[]; sort?: { key: string; dir: "asc" | "desc" }; selected?: string | number; loading?: boolean; caption?: string; footer?: React.ReactElement; emptyTitle?: string; emptyText?: string }
export interface PanelProps { id: string; title: string; meta?: string; children: React.ReactNode }
export interface BarChartProps { data: { label: string; value: number }[]; label: string; height?: number; unit?: string }
export interface StatusBreakdownProps { counts: { escalated?: number; review?: number; closed?: number } }
export interface ActivityFeedProps { items: { kind: "escalated" | "review" | "note" | "attachment" | "closed"; text: string; time: string }[] }
export interface DetailDrawerProps { title: string; meta?: string; children: React.ReactNode; actions?: React.ReactElement[]; overlay?: boolean }
export interface SkeletonProps { variant?: "tile"; width?: string; height?: string }
