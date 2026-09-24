import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Type,
  User,
  Flag,
  ListOrdered,
  Layout,
  Tag,
  Building2
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { getDeliverableTypes, createDeliverableType } from "@/lib/deliverables.functions";
import { createTask, getParentTaskOptions, getTaskStages, getAccountsForClient, getInternalTargets, createInternalTarget } from "@/lib/tasks.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { NicheSelector } from "./NicheSelector";
import { DatePicker } from "./DatePicker";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const taskSchema = z.object({
  title: z.string().min(2, "Título é obrigatório"),
  client_id: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  is_internal: z.boolean().optional(),
  internal_target_id: z.string().nullable().optional(),
  stage: z.string(),
  priority: z.string(),
  deadline: z.string().optional(),
  start_date: z.string().optional(),
  deliverable_type_id: z.string().optional(),
  parent_task_id: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (!data.is_internal && !data.client_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cliente é obrigatório", path: ["client_id"] });
  }
});

interface CreateTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

export function CreateTaskModal({ isOpen, onOpenChange, defaultClientId }: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const fetchClients = useServerFn(getClientsWithChannels);
  const fetchDeliverableTypes = useServerFn(getDeliverableTypes);
  const createDeliverableTypeFn = useServerFn(createDeliverableType);
  const fetchParentTaskOptions = useServerFn(getParentTaskOptions);
  const fetchTaskStages = useServerFn(getTaskStages);
  const fetchAccountsForClient = useServerFn(getAccountsForClient);
  const fetchInternalTargets = useServerFn(getInternalTargets);
  const createInternalTargetFn = useServerFn(createInternalTarget);
  const createTaskFn = useServerFn(createTask);

  const [clients, setClients] = useState<any[]>([]);
  const [deliverableTypes, setDeliverableTypes] = useState<any[]>([]);
  const [parentTaskOptions, setParentTaskOptions] = useState<any[]>([]);
  const [taskStages, setTaskStages] = useState<any[]>([]);
  const [accountOptions, setAccountOptions] = useState<any[]>([]);
  const [internalTargets, setInternalTargets] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchClients().then(setClients);
      fetchDeliverableTypes().then(setDeliverableTypes);
      fetchParentTaskOptions({ data: undefined }).then(setParentTaskOptions);
      fetchTaskStages().then(setTaskStages);
      fetchInternalTargets().then(setInternalTargets);
    }
  }, [isOpen]);

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      stage: "todo",
      priority: "medium",
      title: "",
      client_id: "",
      account_id: null,
      is_internal: false,
      internal_target_id: null,
      deadline: "",
      start_date: "",
      deliverable_type_id: "",
      parent_task_id: null,
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Descreva os detalhes da tarefa...',
      }),
    ],
    content: '',
  });

  useEffect(() => {
    if (isOpen && defaultClientId) {
      setValue("client_id", defaultClientId);
    }
  }, [isOpen, defaultClientId]);

  const watchedClientId = watch("client_id");
  const watchedIsInternal = watch("is_internal");

  useEffect(() => {
    if (!watchedClientId) {
      setAccountOptions([]);
      setValue("account_id", null);
      return;
    }
    fetchAccountsForClient({ data: { clientId: watchedClientId } }).then((accounts) => {
      setAccountOptions(accounts);
      // Só uma conta pra esse cliente: seleciona sozinho, sem fricção.
      setValue("account_id", accounts.length === 1 ? accounts[0].id : null);
    });
  }, [watchedClientId]);

  const handleAddInternalTarget = async (name: string) => {
    try {
      const newTarget = await createInternalTargetFn({ data: { name } });
      setInternalTargets((prev) => [...prev, newTarget]);
      setValue("internal_target_id", newTarget.id);
      toast.success(`Frente "${newTarget.name}" adicionada`);
    } catch (err) {
      toast.error("Erro ao adicionar frente interna");
    }
  };

  const handleAddDeliverableType = async (name: string) => {
    try {
      const newType = await createDeliverableTypeFn({ data: { name } });
      setDeliverableTypes((prev) => [...prev, newType]);
      setValue("deliverable_type_id", newType.id);
      toast.success(`Tipo "${newType.name}" adicionado`);
    } catch (err) {
      toast.error("Erro ao adicionar tipo de entregável");
    }
  };

  const handleToggleInternal = (checked: boolean) => {
    setValue("is_internal", checked);
    if (checked) {
      setValue("client_id", null);
      setValue("account_id", null);
    } else {
      setValue("internal_target_id", null);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const content = editor && !editor.isEmpty ? editor.getHTML() : null;
      await createTaskFn({
        data: {
          ...data,
          description: content
        }
      });
      toast.success("Tarefa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["deliverables-progress"] });
      onOpenChange(false);
      reset();
      editor?.commands.setContent('');
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-[var(--line-1)] p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-[var(--surface-2)] border-b border-[var(--line-1)]">
          <DialogTitle className="text-xl font-title font-bold text-[var(--ink-1)] flex items-center gap-2">
            <PlusIcon className="h-5 w-5 text-[var(--violet-500)]" /> Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> Título da Tarefa
            </Label>
            <Input
              {...register("title")}
              placeholder="Ex: Criar artes para campanha..."
              className={cn("border-[var(--line-1)] rounded-xl focus-visible:ring-[var(--violet-500)]", errors.title && "border-[var(--danger)]")}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
            <Checkbox
              id="is_internal"
              checked={!!watchedIsInternal}
              onCheckedChange={(checked) => handleToggleInternal(!!checked)}
            />
            <Label htmlFor="is_internal" className="text-sm font-medium text-[var(--ink-1)] cursor-pointer">
              Tarefa interna (demanda da própria Ongo, sem cliente)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {watchedIsInternal ? (
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                  <Building2 className="h-3 w-3" /> Frente interna
                </Label>
                <NicheSelector
                  selectedId={watch("internal_target_id")}
                  options={internalTargets}
                  onChange={(id) => setValue("internal_target_id", id)}
                  onAddNiche={handleAddInternalTarget}
                  placeholder="Selecionar frente interna..."
                  searchPlaceholder="Buscar frente..."
                  emptyLabel="Nenhuma frente encontrada"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                    <Layout className="h-3 w-3" /> Cliente
                  </Label>
                  <Select value={watch("client_id") || undefined} onValueChange={(v) => setValue("client_id", v)}>
                    <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(errors as any).client_id && <p className="text-xs text-[var(--danger)]">{(errors as any).client_id.message}</p>}
                </div>

                {accountOptions.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                      <Layout className="h-3 w-3" /> Conta
                    </Label>
                    <Select value={watch("account_id") || undefined} onValueChange={(v) => setValue("account_id", v)}>
                      <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountOptions.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.account_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                <ListOrdered className="h-3 w-3" /> Etapa
              </Label>
              <Select defaultValue="todo" onValueChange={(v) => setValue("stage", v)}>
                <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                <Flag className="h-3 w-3" /> Prioridade
              </Label>
              <Select defaultValue="medium" onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" /> Data de Entrega
              </Label>
              <DatePicker value={watch("deadline")} onChange={(date) => setValue("deadline", date || "")} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" /> Data de Início
              </Label>
              <DatePicker value={watch("start_date")} onChange={(date) => setValue("start_date", date || "")} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
                <ListOrdered className="h-3 w-3" /> Tipo de Entregável
              </Label>
              <NicheSelector
                selectedId={watch("deliverable_type_id")}
                options={deliverableTypes}
                onChange={(id) => setValue("deliverable_type_id", id)}
                onAddNiche={handleAddDeliverableType}
                placeholder="Selecionar tipo de entregável..."
                searchPlaceholder="Buscar tipo..."
                emptyLabel="Nenhum tipo encontrado"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
              <ListOrdered className="h-3 w-3" /> Subtarefa de
            </Label>
            <Select onValueChange={(v) => setValue("parent_task_id", v === "none" ? null : v)}>
              <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                <SelectValue placeholder="Nenhuma (tarefa principal)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (tarefa principal)</SelectItem>
                {parentTaskOptions.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> Descrição
            </Label>
            <div className="border border-[var(--line-1)] rounded-xl min-h-[150px] p-4 prose prose-sm max-w-none focus-within:ring-1 focus-within:ring-[var(--violet-500)]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 bg-[var(--surface-2)] border-t border-[var(--line-1)]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-[var(--ink-3)]">
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 font-bold px-8">
            Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}