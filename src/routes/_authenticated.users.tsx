import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  CheckSquare,
  Gauge,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CreateCollaboratorModal, type CreatedCredential } from "@/components/CreateCollaboratorModal";
import { EditCollaboratorModal } from "@/components/EditCollaboratorModal";
import { getTeamOverview } from "@/lib/team.functions";
import { useTeamOnlineIds } from "@/hooks/use-team-presence";
import { efficiencyBand, formatTrackedTime, formatElapsedDays } from "@/lib/efficiency";

type TeamMember = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  function: string | null;
  cargos: { id: string; name: string; department_id: string | null; department_name: string | null }[];
  job_function_ids: string[];
  department_ids: string[];
  cargo: string | null;
  role: string | null;
  employment_type: string | null;
  active: boolean;
  squads: { id: string; name: string; color: string | null; type: string }[];
  squad_ids: string[];
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  activeTasks: number;
  completedThisWeek: number;
  efficiency: number | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  const first = parts.length > 0 ? (parts[0] as string).charAt(0) : "";
  const last = parts.length > 1 ? (parts[parts.length - 1] as string).charAt(0) : "";
  return (first + last).toUpperCase() || "•";
}

function roleLabel(role: string | null): string {
  return role === "admin" ? "Admin" : role === "leader" ? "Líder" : role === "collaborator" ? "Usuário" : "—";
}

function progressColor(pct: number): string {
  return pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
}

export const Route = createFileRoute("/_authenticated/users")({
  component: TeamPage,
});

function TeamPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [lastCredential, setLastCredential] = useState<CreatedCredential | null>(null);
  const [search, setSearch] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [cargoFilter, setCargoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();
  const fetchTeamOverview = useServerFn(getTeamOverview);
  const onlineIds = useTeamOnlineIds();
  const location = useLocation();
  const isExactUsers = location.pathname === "/users" || location.pathname === "/users/";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["team-overview"],
    queryFn: () => fetchTeamOverview({ data: {} as any }),
  });

  const members = ((data as any)?.members || []) as TeamMember[];
  const squads = ((data as any)?.squads || []) as { id: string; name: string; type: string }[];
  const kpis = (data as any)?.kpis || { totalMembers: 0, squadsCount: 0, activeTasksTotal: 0, avgPerformance: 0 };

  const cargoOptions = useMemo(() => {
    const byId = new Map<string, string>();
    members.forEach((m) => m.cargos.forEach((c) => byId.set(c.id, c.name)));
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        term.length === 0 ||
        m.full_name.toLowerCase().includes(term) ||
        (m.email ?? "").toLowerCase().includes(term) ||
        (m.cargo ?? "").toLowerCase().includes(term);
      const matchesSquad = squadFilter === "all" || m.squad_ids.includes(squadFilter);
      const matchesCargo = cargoFilter === "all" || m.job_function_ids.includes(cargoFilter);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? m.active : !m.active);
      return matchesSearch && matchesSquad && matchesCargo && matchesStatus;
    });
  }, [members, search, squadFilter, cargoFilter, statusFilter]);

  const handleCreated = (credential: CreatedCredential) => {
    setLastCredential(credential);
    queryClient.invalidateQueries({ queryKey: ["team-overview"] });
  };

  const handleOpenEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["team-overview"] });
  };

  const kpiCards = [
    { label: "Total de Membros", value: String(kpis.totalMembers), subtitle: `Em ${kpis.squadsCount} squads`, icon: Users, color: "text-[var(--violet-500)]" },
    { label: "Online Agora", value: String(onlineIds.size), subtitle: kpis.totalMembers > 0 ? `${Math.round((onlineIds.size / kpis.totalMembers) * 100)}% disponível` : "—", icon: Wifi, color: "text-[var(--success)]" },
    { label: "Tarefas Ativas", value: String(kpis.activeTasksTotal), subtitle: "Atribuídas no time", icon: CheckSquare, color: "text-[var(--warning)]" },
    { label: "AVG Performance", value: `${kpis.avgPerformance}%`, subtitle: "Últimos 7 dias", icon: Gauge, color: "text-[var(--success)]" },
  ];

  return (
    <>
    {isExactUsers && (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-widest">Pessoas</p>
          <h1 className="text-3xl font-title font-bold text-[var(--ink-1)]">
            Time
          </h1>
          <p className="text-[var(--ink-3)] mt-1">
            Gerencie os membros do time e atribua funções no sistema.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full px-6">
          <Plus className="h-4 w-4 mr-2" />
          Criar Membro
        </Button>
      </div>

      {lastCredential ? (
        <Card className="border-[var(--success-tint)] bg-[var(--success-tint)] shadow-sm">
          <CardContent className="p-4 text-sm text-[var(--ink-1)]">
            E-mail: {lastCredential.email} — Senha temporária: {lastCredential.temporaryPassword}
          </CardContent>
        </Card>
      ) : (
        <div className="hidden" />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-[var(--line-1)] shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("h-10 w-10 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl flex items-center justify-center shadow-sm shrink-0", k.color)}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest">{k.label}</p>
                <h3 className="text-lg font-bold text-[var(--ink-1)] font-jakarta">{isLoading ? "…" : k.value}</h3>
                <p className="text-[10px] text-[var(--ink-3)] truncate">{k.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Bar */}
      <Card className="border-[var(--line-1)] shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
            <Input
              placeholder="Buscar por nome, cargo ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-[var(--line-1)] bg-[var(--surface-2)]"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <Select value={squadFilter} onValueChange={setSquadFilter}>
              <SelectTrigger className="w-full md:w-[160px] border-[var(--line-1)] bg-[var(--surface-1)] rounded-full">
                <SelectValue placeholder="Squad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Squads</SelectItem>
                {squads.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} {s.type === "comercial" ? "(Comercial)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="w-full md:w-[160px] border-[var(--line-1)] bg-[var(--surface-1)] rounded-full">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {cargoOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[140px] border-[var(--line-1)] bg-[var(--surface-1)] rounded-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listing */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface-1)] border border-dashed border-[var(--line-1)] rounded-2xl space-y-4">
          <div className="h-20 w-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
            <Users className="h-10 w-10 animate-pulse" />
          </div>
          <p className="text-sm text-[var(--ink-3)]">Carregando time...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface-1)] border border-dashed border-[var(--line-1)] rounded-2xl space-y-4">
          <div className="text-center max-w-sm">
            <h3 className="text-lg font-bold text-[var(--ink-1)]">Não foi possível carregar o time</h3>
            <p className="text-sm text-[var(--ink-3)] mt-1">
              Tente recarregar a página.
            </p>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const isOnline = onlineIds.has(m.id);
            const pct = m.efficiency ?? 0;
            return (
              <Card key={m.id} className="border-[var(--line-1)] shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                        <AvatarFallback className="bg-[var(--violet-tint-16)] text-[var(--violet-500)] font-bold">
                          {getInitials(m.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--ink-1)] leading-tight truncate">{m.full_name}</p>
                        <p className="text-xs text-[var(--ink-3)] truncate">{m.cargo ?? "Sem cargo"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-full border text-[10px] font-bold",
                          isOnline
                            ? "bg-[var(--success-tint)] text-[var(--success)] border-[var(--success-tint)]"
                            : "bg-[var(--surface-2)] text-[var(--ink-3)] border-[var(--line-1)]"
                        )}
                      >
                        {isOnline ? "Online" : "Offline"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-full text-[var(--ink-3)] hover:bg-[var(--surface-2)]">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(m)}>Ver detalhes</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Progresso</span>
                      <span className="text-xs font-bold text-[var(--ink-1)] tabular">{m.efficiency === null ? "—" : `${pct}%`}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: progressColor(pct) }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-[var(--surface-2)] p-2 text-center">
                      <p className="text-sm font-bold text-[var(--ink-1)] tabular">{m.activeTasks}</p>
                      <p className="text-[9px] text-[var(--ink-3)] uppercase tracking-wider">Tarefas</p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-2)] p-2 text-center">
                      <p className="text-sm font-bold text-[var(--ink-1)] tabular">{m.completedThisWeek}</p>
                      <p className="text-[9px] text-[var(--ink-3)] uppercase tracking-wider">Na semana</p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-2)] p-2 text-center">
                      <p className="text-sm font-bold text-[var(--ink-1)] tabular">{m.efficiency === null ? "—" : `${m.efficiency}%`}</p>
                      <p className="text-[9px] text-[var(--ink-3)] uppercase tracking-wider">Eficiência</p>
                    </div>
                  </div>

                  {m.executionRatioPct !== null && (
                    <div
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] font-bold",
                        efficiencyBand(m.executionRatioPct) === "ok" ? "bg-[var(--success)]/10 text-[var(--success)]" :
                        efficiencyBand(m.executionRatioPct) === "atencao" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                        "bg-[var(--danger)]/10 text-[var(--danger)]"
                      )}
                      title="Tempo trabalhado (cronômetro) vs tempo corrido das tarefas atribuídas"
                    >
                      <Gauge className="h-3 w-3" />
                      Execução: {formatTrackedTime(m.executionTrackedSeconds)} / {formatElapsedDays(m.executionElapsedDays)}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-1)] text-[10px]">
                      {roleLabel(m.role)}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-full border text-[10px]",
                        m.active === false
                          ? "bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger-tint)]"
                          : "bg-[var(--success-tint)] text-[var(--success)] border-[var(--success-tint)]"
                      )}
                    >
                      {m.active === false ? "Inativo" : "Ativo"}
                    </Badge>
                    {m.squads.map((s) => (
                      <Badge key={s.id} variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-1)] text-[10px]" style={s.color ? { borderColor: `${s.color}55`, color: s.color } : undefined}>
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface-1)] border border-dashed border-[var(--line-1)] rounded-2xl space-y-4">
          <div className="h-20 w-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
            <Users className="h-10 w-10" />
          </div>
          <div className="text-center max-w-sm">
            <h3 className="text-lg font-bold text-[var(--ink-1)]">Nenhum membro encontrado</h3>
            <p className="text-sm text-[var(--ink-3)] mt-1">
              Você ainda não cadastrou nenhum membro para o seu time no Brain.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full">
            Criar meu primeiro membro
          </Button>
        </div>
      )}

      <CreateCollaboratorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleCreated}
      />

      <EditCollaboratorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        collaborator={selectedMember}
        onSuccess={handleEditSuccess}
      />
    </div>
    )}
    <Outlet />
    </>
  );
}
