import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Briefcase, 
  Shield,
  LayoutGrid
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

type CollaboratorRow = {
  id: string;
  full_name: string;
  function: string | null;
  job_function_id: string | null;
  commercial_roles: string[] | null;
  squad_id: string | null;
  squad_name: string | null;
  role: string | null;
  active: boolean | null;
  email: string | null;
  avatar_url: string | null;
  employment_type: string | null;
};

export const listCollaborators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let profileList: Array<Record<string, unknown>> = [];

    const { data: profilesFull, error: fullError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, function, job_function_id, commercial_roles, squad_id, active, avatar_url, employment_type, job_functions:job_function_id(id, name)")
      .order("full_name");

    if (!fullError) {
      profileList = (profilesFull ?? []) as Array<Record<string, unknown>>;
    } else {
      const msg = (fullError.message ?? "").toLowerCase();
      const isMissingColumn =
        msg.includes("commercial_roles") ||
        msg.includes("active") ||
        (fullError as { code?: string }).code === "42703" ||
        msg.includes("does not exist") ||
        msg.includes("column");
      if (isMissingColumn) {
        const { data: profilesBase, error: baseError } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, function, squad_id, avatar_url, employment_type")
          .order("full_name");
        if (baseError) {
          throw new Error(baseError.message);
        } else {
          profileList = (profilesBase ?? []) as Array<Record<string, unknown>>;
        }
      } else {
        const msgLower = (fullError.message ?? "").toLowerCase();
        if (msgLower.includes("job_function") || msgLower.includes("job_functions")) {
          const { data: profilesLegacy, error: legacyError } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, function, commercial_roles, squad_id, active, avatar_url, employment_type")
            .order("full_name");
          if (legacyError) {
            throw new Error(legacyError.message);
          } else {
            profileList = (profilesLegacy ?? []) as Array<Record<string, unknown>>;
          }
        } else {
          throw new Error(fullError.message);
        }
      }
    }

    let rows: CollaboratorRow[] = [];

    if (profileList.length === 0) {
      rows = [];
    } else {
      const ids = profileList
        .map((p) => p["id"] as string)
        .filter((id) => typeof id === "string" && id.length > 0);
      const squadIds = Array.from(
        new Set(
          profileList
            .map((p) => p["squad_id"] as string | null)
            .filter((sid): sid is string => typeof sid === "string" && sid.length > 0),
        ),
      );

      let roleByUser = new Map<string, string>();
      if (ids.length > 0) {
        try {
          const { data: roles } = await supabaseAdmin
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", ids);
          const roleList = (roles ?? []) as Array<Record<string, unknown>>;
          roleList.forEach((r) => {
            const uid = r["user_id"] as string;
            const role = r["role"] as string;
            if (typeof uid === "string" && typeof role === "string" && !roleByUser.has(uid)) {
              roleByUser.set(uid, role);
            }
          });
        } catch (err) {
          console.warn("[listCollaborators] Falha ao enriquecer user_roles, seguindo sem papel:", err);
        }
      }

      let squadNameById = new Map<string, string>();
      if (squadIds.length > 0) {
        try {
          const { data: squads } = await supabaseAdmin
            .from("squads")
            .select("id, name")
            .in("id", squadIds);
          const squadList = (squads ?? []) as Array<Record<string, unknown>>;
          squadList.forEach((s) => {
            const sid = s["id"] as string;
            const name = s["name"] as string;
            if (typeof sid === "string" && typeof name === "string") {
              squadNameById.set(sid, name);
            }
          });
        } catch (err) {
          console.warn("[listCollaborators] Falha ao enriquecer squads, seguindo sem nome do squad:", err);
        }
      }

      let emailById = new Map<string, string>();
      if (ids.length > 0) {
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const users = (usersData?.users ?? []) as Array<{ id: string; email?: string | null }>;
          users.forEach((u) => {
            if (u && typeof u.id === "string" && typeof u.email === "string") {
              emailById.set(u.id, u.email);
            }
          });
        } catch (err) {
          console.warn("[listCollaborators] Falha ao enriquecer e-mails (auth.admin.listUsers), seguindo sem e-mail:", err);
        }
      }

      rows = profileList.map((p) => {
        const id = p["id"] as string;
        const squadId = (p["squad_id"] as string | null) ?? null;
        return {
          id,
          full_name: (p["full_name"] as string) ?? "",
          function: (p["function"] as string | null) ?? null,
          commercial_roles: (p["commercial_roles"] as string[] | null) ?? null,
          squad_id: squadId,
          squad_name: squadId ? (squadNameById.get(squadId) ?? null) : null,
          role: roleByUser.get(id) ?? null,
          active: (p["active"] as boolean | null) ?? null,
          email: emailById.get(id) ?? null,
          avatar_url: (p["avatar_url"] as string | null) ?? null,
          employment_type: (p["employment_type"] as string | null) ?? null,
        } as CollaboratorRow;
      });
    }

    return rows;
  });

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  const first = parts.length > 0 ? (parts[0] as string).charAt(0) : "";
  const last = parts.length > 1 ? (parts[parts.length - 1] as string).charAt(0) : "";
  return (first + last).toUpperCase() || "•";
}

function roleLabel(role: string | null): string {
  return role === "admin" ? "Admin" : role === "leader" ? "Líder" : role === "collaborator" ? "Usuário" : "—";
}

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorRow | null>(null);
  const [lastCredential, setLastCredential] = useState<CreatedCredential | null>(null);
  const [search, setSearch] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [functionFilter, setFunctionFilter] = useState("all");

  const queryClient = useQueryClient();
  const fetchCollaborators = useServerFn(listCollaborators);

  const { data: collaborators = [], isLoading, isError } = useQuery({
    queryKey: ["collaborators-list"],
    queryFn: () => fetchCollaborators(),
  });

  const squadOptions = useMemo(() => {
    const names = new Set<string>();
    (collaborators as CollaboratorRow[]).forEach((c) => {
      if (c.squad_name) {
        names.add(c.squad_name);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [collaborators]);

  const functionOptions = useMemo(() => {
    const values = new Set<string>();
    (collaborators as CollaboratorRow[]).forEach((c) => {
      if (c.function) {
        values.add(c.function);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [collaborators]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (collaborators as CollaboratorRow[]).filter((c) => {
      const matchesSearch =
        term.length === 0 ||
        c.full_name.toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term);
      const matchesSquad = squadFilter === "all" || (c.squad_name ?? "") === squadFilter;
      const matchesFunction = functionFilter === "all" || (c.function ?? "") === functionFilter;
      return matchesSearch && matchesSquad && matchesFunction ? true : false;
    });
  }, [collaborators, search, squadFilter, functionFilter]);

  const handleCreated = (credential: CreatedCredential) => {
    setLastCredential(credential);
    queryClient.invalidateQueries({ queryKey: ["collaborators-list"] });
  };

  const handleOpenEdit = (collaborator: CollaboratorRow) => {
    setSelectedCollaborator(collaborator);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["collaborators-list"] });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-title font-bold text-[#0E0E16]">
            Usuários
          </h1>
          <p className="text-[#8A8FA3] mt-1">
            Gerencie os usuários e atribua funções no sistema.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-6">
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Usuário
        </Button>
      </div>

      {lastCredential ? (
        <Card className="border-[#D6F0DB] bg-[#F0FAF2] shadow-sm">
          <CardContent className="p-4 text-sm text-[#0E0E16]">
            E-mail: {lastCredential.email} — Senha temporária: {lastCredential.temporaryPassword}
          </CardContent>
        </Card>
      ) : (
        <div className="hidden" />
      )}

      {/* Filters Bar */}
      <Card className="border-[#E4E6F0] shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-[#E4E6F0] bg-[#F7F8FC]"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={squadFilter} onValueChange={setSquadFilter}>
              <SelectTrigger className="w-full md:w-[160px] border-[#E4E6F0] bg-white rounded-full">
                <SelectValue placeholder="Squad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Squads</SelectItem>
                {squadOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-full md:w-[160px] border-[#E4E6F0] bg-white rounded-full">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Funções</SelectItem>
                {functionOptions.map((fn) => (
                  <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border border-[#E4E6F0] rounded-full p-1 bg-white">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  view === "grid" ? "bg-[#3D4FE8] text-white" : "text-[#8A8FA3]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  view === "list" ? "bg-[#3D4FE8] text-white" : "text-[#8A8FA3]"
                )}
              >
                <MoreHorizontal className="h-4 w-4 rotate-90" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listing */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-[#E4E6F0] rounded-2xl space-y-4">
          <div className="h-20 w-20 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
            <Users className="h-10 w-10 animate-pulse" />
          </div>
          <p className="text-sm text-[#8A8FA3]">Carregando usuários...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-[#E4E6F0] rounded-2xl space-y-4">
          <div className="text-center max-w-sm">
            <h3 className="text-lg font-bold text-[#0E0E16]">Não foi possível carregar os usuários</h3>
            <p className="text-sm text-[#8A8FA3] mt-1">
              Tente recarregar a página.
            </p>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="border-[#E4E6F0] shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={c.avatar_url ?? undefined} alt={c.full_name} />
                        <AvatarFallback className="bg-[#EEF0FF] text-[#3D4FE8] font-bold">
                          {getInitials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-[#0E0E16] leading-tight">{c.full_name}</p>
                        <p className="text-xs text-[#8A8FA3] flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {c.email ?? "—"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-full text-[#8A8FA3] hover:bg-[#F7F8FC]">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(c)}>Ver detalhes</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F8FC] border border-[#E4E6F0] px-2.5 py-1 text-[#0E0E16]">
                      <Briefcase className="h-3 w-3 text-[#8A8FA3]" />
                      {c.function ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F8FC] border border-[#E4E6F0] px-2.5 py-1 text-[#0E0E16]">
                      <Shield className="h-3 w-3 text-[#8A8FA3]" />
                      {roleLabel(c.role)}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-full border",
                        c.active === false
                          ? "bg-[#FDECEC] text-[#C03636] border-[#F5C6C6]"
                          : "bg-[#EAFBEF] text-[#1E7A34] border-[#C9EDD2]"
                      )}
                    >
                      {c.active === false ? "Inativo" : "Ativo"}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#8A8FA3]">
                    <span>Squad: <span className="text-[#0E0E16] font-medium">{c.squad_name ?? "Sem squad"}</span></span>
                  </div>
                  {c.commercial_roles && c.commercial_roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {c.commercial_roles.map((cr) => (
                        <Badge key={cr} variant="outline" className="rounded-full border-[#E4E6F0] text-[#0E0E16]">
                          {cr}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="hidden" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-[#E4E6F0]">
                {filtered.map((c) => (
                  <div key={c.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={c.avatar_url ?? undefined} alt={c.full_name} />
                        <AvatarFallback className="bg-[#EEF0FF] text-[#3D4FE8] font-bold">
                          {getInitials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-[#0E0E16] truncate">{c.full_name}</p>
                        <p className="text-xs text-[#8A8FA3] truncate">{c.email ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[#8A8FA3]">{c.function ?? "—"}</span>
                      {c.commercial_roles && c.commercial_roles.length > 0 ? (
                        <span className="text-[#8A8FA3]">{c.commercial_roles.join(", ")}</span>
                      ) : (
                        <span className="hidden" />
                      )}
                      <span className="text-[#0E0E16] font-medium">{c.squad_name ?? "Sem squad"}</span>
                      <span className="inline-flex items-center gap-1 text-[#0E0E16]">
                        <Shield className="h-3 w-3 text-[#8A8FA3]" />
                        {roleLabel(c.role)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-full border",
                          c.active === false
                            ? "bg-[#FDECEC] text-[#C03636] border-[#F5C6C6]"
                            : "bg-[#EAFBEF] text-[#1E7A34] border-[#C9EDD2]"
                        )}
                      >
                        {c.active === false ? "Inativo" : "Ativo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-[#E4E6F0] rounded-2xl space-y-4">
          <div className="h-20 w-20 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
            <Users className="h-10 w-10" />
          </div>
          <div className="text-center max-w-sm">
            <h3 className="text-lg font-bold text-[#0E0E16]">Nenhum usuário encontrado</h3>
            <p className="text-sm text-[#8A8FA3] mt-1">
              Você ainda não cadastrou nenhum membro para a sua equipe no Brain.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full">
            Cadastrar meu primeiro usuário
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
        collaborator={selectedCollaborator}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
