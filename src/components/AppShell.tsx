import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  Layers,
  Network, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquareText, 
  Database,
  Moon,
  Sun,
  TrendingUp,
  DollarSign,
  UserCheck,
  Wrench,
  User,
  CreditCard,
  Target,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          "flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium group",
          isCurrentlyActive ? "bg-[#3D4FE8] text-white" : "text-[#8A8FA3] hover:bg-[#F7F8FC] hover:text-[#0E0E16]",
          collapsed && "justify-center px-2"
        )}
      >
        <Link
          to={href}
          className="flex items-center gap-3 flex-1"
        >
          <Icon className="h-5 w-5 shrink-0" />
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
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
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
              onClick={() => console.log('clicou no filho', child.href)}
              className={cn(
                "block px-3 py-2 text-xs transition-colors rounded-md",
                location.pathname === child.href 
                  ? "text-[#3D4FE8] font-bold bg-[#F7F8FC]" 
                  : "text-[#8A8FA3] hover:text-[#0E0E16] hover:bg-[#F7F8FC]"
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu do sistema.");
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8FC] dark:bg-[#0E0E16] transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-[#E4E6F0] bg-white transition-all duration-300 dark:bg-[#1A1A24] dark:border-[#2A2A36]",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-full flex-col p-4">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-8 h-5 bg-[#3D4FE8] rounded-full flex items-center justify-center relative">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            {!sidebarCollapsed && (
              <span className="text-xl font-title font-bold text-[#0E0E16] dark:text-white">
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
              collapsed={sidebarCollapsed}
              active={location.pathname === "/dashboard"}
            />
            <SidebarItem
              icon={Briefcase}
              label="Clientes"
              href="/clients"
              collapsed={sidebarCollapsed}
              active={location.pathname.startsWith("/clients")}
              children={[
                { label: "Gestão de clientes", href: "/clients/manage" },
                { label: "Análise de churn", href: "/clients/churn" },
                { label: "Contratos", href: "/clients/contracts" },
              ]}
            />
            <SidebarItem
              icon={Layers}
              label="Projetos"
              href="/projects"
              collapsed={sidebarCollapsed}
              active={location.pathname.startsWith("/projects")}
              children={[
                { label: "Tarefas", href: "/projects/tasks" },
                { label: "Gestão de Entregas", href: "/projects/deliverables" },
                { label: "Aprovação de Conteúdo", href: "/projects/content-approval" },
              ]}
            />
            <SidebarItem
              icon={Target}
              label="Comercial"
              href="/comercial"
              collapsed={sidebarCollapsed}
              active={location.pathname.startsWith("/comercial")}
              children={[
                { label: "CRM", href: "/comercial/crm" },
              ]}
            />
            <SidebarItem
              icon={DollarSign}
              label="Finanças"
              href="/financas"
              collapsed={sidebarCollapsed}
              active={location.pathname.startsWith("/financas")}
              children={[
                { label: "Recebimentos", href: "/financas" },
                { label: "Contas a pagar", href: "/financas/contas-a-pagar" },
              ]}
            />
            <SidebarItem
              icon={UserCheck}
              label="Recursos Humanos"
              href="/em-breve"
              collapsed={sidebarCollapsed}
            />
            <SidebarItem
              icon={Wrench}
              label="Toolkit"
              href="/em-breve"
              collapsed={sidebarCollapsed}
            />
            <SidebarItem
              icon={Network}
              label="Gestão de usuários"
              href="/em-breve"
              collapsed={sidebarCollapsed}
            />
            <SidebarItem
              icon={User}
              label="Perfil e assinatura"
              href="/em-breve"
              collapsed={sidebarCollapsed}
            />
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-auto space-y-4 pt-4">
            <Button
              variant="outline"
              className={cn(
                "w-full border-[#E4E6F0] bg-[#F7F8FC] text-[#3D4FE8] hover:bg-[#3D4FE8] hover:text-white rounded-full transition-all",
                sidebarCollapsed ? "p-0 h-10 w-10 justify-center" : "justify-start px-4 h-11"
              )}
            >
              <MessageSquareText className="h-5 w-5 mr-2" />
              {!sidebarCollapsed && <span className="text-sm font-semibold">Pergunte à IA</span>}
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-[#8A8FA3] px-2">
                {!sidebarCollapsed && <span>Armazenamento</span>}
                <span>85%</span>
              </div>
              <div className="h-1 w-full bg-[#E4E6F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#3D4FE8] w-[85%]"></div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2 py-4 border-t border-[#E4E6F0] dark:border-[#2A2A36]">
              <button
                onClick={toggleDarkMode}
                className="flex items-center justify-center h-8 w-8 rounded-full bg-[#F7F8FC] text-[#8A8FA3] hover:text-[#0E0E16] dark:bg-[#2A2A36]"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className="flex items-center justify-center h-8 w-8 rounded-full bg-[#F7F8FC] text-[#8A8FA3] hover:text-[#0E0E16] dark:bg-[#2A2A36]">
                <HelpCircle className="h-4 w-4" />
              </button>
              {!sidebarCollapsed && (
                <button 
                  onClick={handleLogout}
                  className="ml-auto flex items-center justify-center h-8 w-8 rounded-full bg-[#F7F8FC] text-red-500 hover:bg-red-50 dark:bg-[#2A2A36]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#E4E6F0] bg-white text-[#8A8FA3] hover:text-[#3D4FE8] dark:bg-[#1A1A24] dark:border-[#2A2A36]"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E4E6F0] bg-white px-8 dark:bg-[#1A1A24] dark:border-[#2A2A36]">
          <div className="flex w-full max-w-md items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
              <Input
                placeholder="Buscar cliente, squad ou colaborador..."
                className="w-full border-none bg-[#F7F8FC] pl-10 focus-visible:ring-1 focus-visible:ring-[#3D4FE8] dark:bg-[#2A2A36]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F8FC] text-[#8A8FA3] hover:text-[#0E0E16] dark:bg-[#2A2A36]">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#EF4444]"></span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-[#F7F8FC] p-1 transition-colors dark:hover:bg-[#2A2A36]">
                  <Avatar className="h-8 w-8 ring-2 ring-[#3D4FE8] ring-offset-2">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-[#3D4FE8] text-white">AF</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-[#E4E6F0] dark:border-[#2A2A36]">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Configurações</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}