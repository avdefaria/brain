import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getModuleAccessMatrix, setDepartmentModuleAccess, getMyModuleAccess } from "@/lib/module-access.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users/permissoes")({
  component: ModulePermissionsPage,
});

function ModulePermissionsPage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyModuleAccess);
  const fetchMatrix = useServerFn(getModuleAccessMatrix);
  const setAccess = useServerFn(setDepartmentModuleAccess);

  const { data: myAccess, isLoading: loadingMyAccess } = useQuery({
    queryKey: ["my-module-access"],
    queryFn: () => fetchAccess(),
  });

  const { data: matrix, isLoading: loadingMatrix } = useQuery({
    queryKey: ["module-access-matrix"],
    queryFn: () => fetchMatrix(),
    enabled: !!myAccess?.isAdmin,
  });

  const handleToggle = async (departmentId: string, moduleKey: string, checked: boolean) => {
    try {
      await setAccess({ data: { departmentId, moduleKey, allowed: checked } });
      queryClient.invalidateQueries({ queryKey: ["module-access-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["my-module-access"] });
    } catch (error) {
      toast.error("Erro ao atualizar permissão");
    }
  };

  if (loadingMyAccess) {
    return <div className="p-8 text-sm text-[var(--ink-3)]">Carregando...</div>;
  }

  if (!myAccess?.isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <div className="h-14 w-14 rounded-full bg-[var(--danger-tint)] flex items-center justify-center text-[var(--danger)]">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-title font-bold text-[var(--ink-1)]">Só administradores</h2>
          <p className="text-sm text-[var(--ink-3)] mt-1">Essa tela é restrita a quem tem papel de Admin no sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Permissões de Módulo</h1>
        <p className="text-sm text-[var(--ink-3)]">Defina quais departamentos têm acesso a cada módulo do sistema</p>
      </div>

      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="border-b border-[var(--line-1)] bg-[var(--surface-2)]/50 p-6">
          <CardTitle className="text-lg font-title font-bold text-[var(--ink-1)] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--violet-500)]" />
            Matriz de acesso
          </CardTitle>
          <p className="text-xs text-[var(--ink-3)] mt-1">
            Quem tem papel de Admin no sistema sempre vê tudo, independente dessa matriz. Quem ainda não tem departamento atribuído (Time → cargo) também vê tudo por padrão.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {loadingMatrix || !matrix ? (
            <div className="text-sm text-[var(--ink-3)] py-8 text-center">Carregando matriz...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line-1)]">
                    <th className="text-left pb-3 pr-4 font-bold text-[var(--ink-1)] text-xs uppercase tracking-wider">Módulo</th>
                    {matrix.departments.map((d: any) => (
                      <th key={d.id} className="text-center pb-3 px-4 font-bold text-[var(--ink-1)] text-xs uppercase tracking-wider">
                        {d.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.modules.map((m: any) => (
                    <tr key={m.key} className="border-b border-[var(--line-1)] last:border-0">
                      <td className="py-4 pr-4 font-medium text-[var(--ink-1)]">{m.label}</td>
                      {matrix.departments.map((d: any) => {
                        const allowed = (matrix.accessByDept[d.id] || []).includes(m.key);
                        return (
                          <td key={d.id} className="text-center px-4">
                            <Checkbox
                              checked={allowed}
                              onCheckedChange={(v) => handleToggle(d.id, m.key, Boolean(v))}
                              className="mx-auto"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
