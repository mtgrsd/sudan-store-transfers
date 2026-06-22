import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import Logo from "./Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Building2,
  FileText,
  PlusCircle,
  QrCode,
  BookText,
  ScrollText,
  Settings,
  MessageCircle,
  Coins,
  BarChart3,
  LogOut,
  KeyRound,
  UserCog,
  ArrowLeftRight,
  Palette,
  Webhook as WebhookIcon,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  matchPrefix?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { label: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "العمليات",
    items: [
      { label: "إدارة الإيصالات", href: "/admin/transfers", icon: FileText, matchPrefix: true },
      { label: "إيصال جديد", href: "/admin/transfers/new", icon: PlusCircle },
      { label: "التحقق عبر QR", href: "/verify", icon: QrCode },
    ],
  },
  {
    label: "الإدارة المالية",
    items: [
      { label: "إدارة الوكلاء", href: "/admin/agents", icon: Building2, matchPrefix: true },
      { label: "القيود المحاسبية", href: "/admin/accounting", icon: BookText },
      { label: "نقل الرصيد", href: "/admin/balance-transfer", icon: ArrowLeftRight, adminOnly: true },
      { label: "العملات وأسعار الصرف", href: "/admin/currencies", icon: Coins, adminOnly: true },
      { label: "التقارير والإحصائيات", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "النظام",
    items: [
      { label: "المستخدمون", href: "/admin/users", icon: UserCog, adminOnly: true },
      { label: "تخصيص الإيصال", href: "/admin/receipt-template", icon: Palette, adminOnly: true },
      { label: "Webhooks", href: "/admin/webhooks", icon: WebhookIcon, adminOnly: true },
      { label: "سجل العمليات", href: "/admin/audit-log", icon: ScrollText, adminOnly: true },
      { label: "إعدادات النظام", href: "/admin/settings", icon: Settings, adminOnly: true },
      { label: "إعدادات واتساب", href: "/admin/settings/whatsapp", icon: MessageCircle, adminOnly: true },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير عام",
  admin: "مدير النظام",
  employee: "موظف",
  agent: "وكيل",
};

export default function AdminLayout({ children, title, actions }: { children: ReactNode; title?: string; actions?: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <SidebarProvider>
      <Sidebar side="right" collapsible="icon" className="border-l border-r-0">
        <SidebarHeader className="h-16 justify-center border-b">
          <div className="flex items-center gap-2 px-2">
            <Logo className="h-9 w-auto shrink-0" iconOnly />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-extrabold leading-tight">متجر السودان</p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight">نظام التحويلات المالية</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.adminOnly || isAdmin);
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => {
                      const isActive = item.matchPrefix
                        ? location === item.href || location.startsWith(item.href + "/")
                        : location === item.href;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.href)}
                            tooltip={item.label}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-right hover:bg-accent/50 transition-colors group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarFallback className="text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-semibold leading-none">{user?.name || "-"}</p>
                  <p className="truncate text-xs text-muted-foreground mt-1">
                    {user?.role ? ROLE_LABELS[user.role] ?? user.role : "-"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setLocation("/admin/settings")}>
                <KeyRound className="ml-2 h-4 w-4" />
                إعدادات الحساب
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="h-9 w-9 rounded-lg" />
            {title && <h1 className="truncate text-base font-bold sm:text-lg">{title}</h1>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            {actions && actions}
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-5 space-y-5 max-w-[1600px] w-full mx-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
