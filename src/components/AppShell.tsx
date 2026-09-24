import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  Layers,
  Network,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Wrench,
  Target,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTeamPresenceTracker } from "@/hooks/use-team-presence";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyModuleAccess } from "@/lib/module-access.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { getMyNotifications, dismissNotification } from "@/lib/notifications.functions";
import { X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MyProfileModal } from "@/components/MyProfileModal";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  collapsed?: boolean;
  active?: boolean;
  children?: { label: string; href: string }[];
}

function SidebarItem({ icon: Icon, label, href, collapsed, active, children }: SidebarItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Se houver submenus, o item principal deve expandir se um filho estiver ativo
  const hasActiveChild = children?.some(child => location.pathname === child.href);
  const isCurrentlyActive = active || hasActiveChild;

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--r-md)] transition-colors text-sm font-medium group",
          isCurrentlyActive ? "bg-[var(--violet-tint-16)] text-[var(--violet-300)]" : "text-[var(--ink-3)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)]",
          collapsed && "justify-center px-2"
        )}
      >
        <Link
          to={href}
          className="flex items-center gap-3 flex-1"
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>{label}</span>}
        </Link>

        {!collapsed && children && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1 hover:bg-white/10 rounded-[var(--r-sm)] transition-colors"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", (isOpen || hasActiveChild) && "rotate-180")} />
          </button>
        )}
      </div>

      {!collapsed && (isOpen || hasActiveChild) && children && (
        <div className="ml-8 mt-1 space-y-1">
          {children.map((child) => (
            <Link
              key={child.href}
              to={child.href}
              className={cn(
                "block px-3 py-2 text-xs transition-colors rounded-[var(--r-sm)]",
                location.pathname === child.href
                  ? "text-[var(--violet-300)] font-bold bg-[var(--violet-tint-08)]"
                  : "text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[var(--surface-3)]"
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  // No mobile o drawer é sempre full-width quando aberto — "colapsado" é um
  // conceito só de desktop (barra fininha ao lado do conteúdo).
  const effectiveCollapsed = sidebarCollapsed && !isMobile;
  useTeamPresenceTracker();

  // Fecha o menu mobile ao navegar — sem isso o drawer ficava aberto por
  // cima da tela nova depois de tocar num link.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchAccess = useServerFn(getMyModuleAccess);
  const { data: access } = useQuery({
    queryKey: ["my-module-access"],
    queryFn: () => fetchAccess(),
    staleTime: 5 * 60 * 1000,
  });
  const canSee = (moduleKey: string) => !access || access.allowedModules.includes(moduleKey);

  const fetchProfile = useServerFn(getMyProfile);
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(getMyNotifications);
  const dismissNotificationFn = useServerFn(dismissNotification);
  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30 * 1000,
  });
  const handleDismissNotification = async (id: string) => {
    // Otimista: some da lista na hora, sem esperar o servidor confirmar.
    queryClient.setQueryData(["my-notifications"], (prev: any[] = []) => prev.filter((n) => n.id !== id));
    try {
      await dismissNotificationFn({ data: { id } });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu do sistema.");
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-1)] transition-colors duration-300">
      {/* Backdrop do drawer mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-[232px] border-r border-[var(--line-1)] bg-[var(--surface-1)] transition-transform duration-300 md:transition-all",
          "md:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "md:w-20" : "md:w-[232px]"
        )}
      >
        <div className="flex h-full flex-col p-4">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 px-2">
            <div
              className="w-6 h-6 rounded-full shrink-0"
              style={{
                background: "radial-gradient(circle at 35% 30%, var(--violet-200), var(--violet-500) 70%)",
                boxShadow: "var(--glow-orb)",
              }}
            />
            {!effectiveCollapsed && (
              <span className="text-xl font-title font-medium text-[var(--ink-1)] tracking-[-0.01em]">
                Brain
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            <SidebarItem
              icon={LayoutDashboard}
              label="Início"
              href="/dashboard"
              collapsed={effectiveCollapsed}
              active={location.pathname === "/dashboard"}
            />
            {canSee("clientes") && (
              <SidebarItem
                icon={Briefcase}
                label="Clientes"
                href="/clients"
                collapsed={effectiveCollapsed}
                active={location.pathname.startsWith("/clients")}
                children={[
                  { label: "Gestão de clientes", href: "/clients/manage" },
                  { label: "Análise de churn", href: "/clients/churn" },
                  { label: "Contratos", href: "/clients/contracts" },
                ]}
              />
            )}
            {canSee("projetos") && (
              <SidebarItem
                icon={Layers}
                label="Projetos"
                href="/projects"
                collapsed={effectiveCollapsed}
                active={location.pathname.startsWith("/projects")}
                children={[
                  { label: "Tarefas", href: "/projects/tasks" },
                  { label: "Gestão de Entregas", href: "/projects/deliverables" },
                  { label: "Aprovação de Conteúdo", href: "/projects/content-approval" },
                ]}
              />
            )}
            {canSee("comercial") && (
              <SidebarItem
                icon={Target}
                label="Comercial"
                href="/comercial"
                collapsed={effectiveCollapsed}
                active={location.pathname.startsWith("/comercial")}
                children={[
                  { label: "CRM", href: "/comercial/crm" },
                ]}
              />
            )}
            {canSee("financas") && (
              <SidebarItem
                icon={DollarSign}
                label="Finanças"
                href="/financas"
                collapsed={effectiveCollapsed}
                active={location.pathname.startsWith("/financas")}
                children={[
                  { label: "Recebimentos", href: "/financas/recebimentos" },
                  { label: "Contas a pagar", href: "/financas/contas-a-pagar" },
                  { label: "Inadimplência", href: "/financas/inadimplencia" },
                ]}
              />
            )}
            {canSee("toolkit") && (
              <SidebarItem
                icon={Wrench}
                label="Toolkit"
                href="/em-breve"
                collapsed={effectiveCollapsed}
              />
            )}
            {canSee("time") && (
              <SidebarItem
                icon={Network}
                label="Time"
                href="/users"
                collapsed={effectiveCollapsed}
                active={location.pathname.startsWith("/users")}
                children={access?.isAdmin ? [
                  { label: "Permissões de Módulo", href: "/users/permissoes" },
                ] : undefined}
              />
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-auto space-y-4 pt-4">
            <div className="flex items-center gap-2 px-2 py-4 border-t border-[var(--line-1)]">
              <button className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--surface-3)] text-[var(--ink-3)] hover:text-[var(--ink-1)]">
                <HelpCircle className="h-4 w-4" />
              </button>
              {!effectiveCollapsed && (
                <button
                  onClick={handleLogout}
                  className="ml-auto flex items-center justify-center h-8 w-8 rounded-full bg-[var(--surface-3)] text-[var(--danger)] hover:bg-[var(--danger-tint)]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collapse Button — só desktop, no mobile o drawer abre/fecha pelo hambúrguer */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-3)] hover:text-[var(--violet-300)] md:flex"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-all duration-300",
          "ml-0",
          sidebarCollapsed ? "md:ml-20" : "md:ml-[232px]"
        )}
      >
        {/* Top Header */}
        <header className="brain-aurora sticky top-0 z-20 flex h-[60px] w-full items-center justify-between gap-2 border-b border-[var(--line-1)] bg-[var(--bg-1)] px-4 md:px-8">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-3)] hover:text-[var(--ink-1)] md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative w-full max-w-md min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
              <Input
                placeholder="Buscar cliente, squad ou colaborador..."
                className="w-full border-none bg-[var(--surface-2)] pl-10 text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus-visible:ring-1 focus-visible:ring-[var(--violet-500)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-3)] hover:text-[var(--ink-1)]">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--danger)]"></span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-1)]">
                <div className="px-4 py-3 border-b border-[var(--line-1)]">
                  <p className="text-sm font-bold">Notificações</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-[var(--ink-3)]">Nenhuma notificação.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { if (n.link) window.location.href = n.link; }}
                        className={cn(
                          "flex items-start gap-2 px-4 py-3 border-b border-[var(--line-1)] last:border-0 transition-colors",
                          n.link && "cursor-pointer hover:bg-[var(--surface-3)]",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--ink-1)]">{n.title}</p>
                          {n.message && <p className="text-xs text-[var(--ink-3)] truncate">{n.message}</p>}
                          <p className="text-[10px] text-[var(--ink-3)] mt-0.5">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDismissNotification(n.id);
                          }}
                          className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[var(--surface-4)]"
                          aria-label="Dispensar notificação"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-[var(--surface-2)] p-1 transition-colors">
                  <Avatar className="h-8 w-8 ring-2 ring-[var(--violet-500)] ring-offset-2 ring-offset-[var(--bg-1)]">
                    <AvatarImage src={myProfile?.avatarUrl ?? undefined} alt={myProfile?.fullName || ""} />
                    <AvatarFallback className="bg-[var(--violet-300)] text-[var(--ink-inverse)]">
                      {initialsOf(myProfile?.fullName || "?")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-1)]">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>Perfil</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-[var(--danger)]">
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0 overflow-x-clip">
          {children}
        </main>
      </div>

      <MyProfileModal isOpen={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </div>
  );
}