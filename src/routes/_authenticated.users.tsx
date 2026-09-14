import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { CreateCollaboratorModal, type CreatedCredential } from "@/components/CreateCollaboratorModal";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [lastCredential, setLastCredential] = useState<CreatedCredential | null>(null);

  const handleCreated = (credential: CreatedCredential) => {
    setLastCredential(credential);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-title font-bold text-[#0E0E16]">
            Colaboradores
          </h1>
          <p className="text-[#8A8FA3] mt-1">
            Gerencie a equipe e atribua funções no sistema.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-6">
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Colaborador
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
              className="pl-10 border-[#E4E6F0] bg-[#F7F8FC]"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select>
              <SelectTrigger className="w-full md:w-[160px] border-[#E4E6F0] bg-white rounded-full">
                <SelectValue placeholder="Squad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Squads</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="dev">Dev</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full md:w-[160px] border-[#E4E6F0] bg-white rounded-full">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Funções</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="dev">Desenvolvedor</SelectItem>
                <SelectItem value="copy">Copywriter</SelectItem>
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

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-[#E4E6F0] rounded-2xl space-y-4">
        <div className="h-20 w-20 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
          <Users className="h-10 w-10" />
        </div>
        <div className="text-center max-w-sm">
          <h3 className="text-lg font-bold text-[#0E0E16]">Nenhum colaborador encontrado</h3>
          <p className="text-sm text-[#8A8FA3] mt-1">
            Você ainda não cadastrou nenhum membro para a sua equipe no Brain.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full">
          Cadastrar meu primeiro colaborador
        </Button>
      </div>

      <CreateCollaboratorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleCreated}
      />
    </div>
  );
}
