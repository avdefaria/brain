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
  Tag
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { getDeliverableTypes } from "@/lib/deliverables.functions";
import { createTask } from "@/lib/tasks.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const taskSchema = z.object({
  title: z.string().min(2, "Título é obrigatório"),
  client_id: z.string().min(1, "Cliente é obrigatório"),
  stage: z.string(),
  priority: z.string(),
  deadline: z.string().optional(),
  deliverable_type_id: z.string().optional(),
  sku_reference: z.string().optional(),
});

interface CreateTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskModal({ isOpen, onOpenChange }: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const fetchClients = useServerFn(getClientsWithChannels);
  const fetchDeliverableTypes = useServerFn(getDeliverableTypes);
  const createTaskFn = useServerFn(createTask);

  const [clients, setClients] = useState<any[]>([]);
  const [deliverableTypes, setDeliverableTypes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchClients().then(setClients);
      fetchDeliverableTypes().then(setDeliverableTypes);
    }
  }, [isOpen]);

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      stage: "todo",
      priority: "medium",
      title: "",
      client_id: "",
      deadline: "",
      deliverable_type_id: "",
      sku_reference: "",
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

  const onSubmit = async (data: any) => {
    try {
      const content = editor?.getHTML();
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
      <DialogContent className="sm:max-w-[600px] border-[#E4E6F0] p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-[#F7F8FC] border-b border-[#E4E6F0]">
          <DialogTitle className="text-xl font-title font-bold text-[#0E0E16] flex items-center gap-2">
            <PlusIcon className="h-5 w-5 text-[#3D4FE8]" /> Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> Título da Tarefa
            </Label>
            <Input 
              {...register("title")} 
              placeholder="Ex: Criar artes para campanha..."
              className={cn("border-[#E4E6F0] rounded-xl focus-visible:ring-[#3D4FE8]", errors.title && "border-red-500")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
                <Layout className="h-3 w-3" /> Cliente
              </Label>
              <Select onValueChange={(v) => setValue("client_id", v)}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
                <ListOrdered className="h-3 w-3" /> Etapa
              </Label>
              <Select defaultValue="todo" onValueChange={(v) => setValue("stage", v)}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Novas tarefas</SelectItem>
                  <SelectItem value="doing">Fazendo</SelectItem>
                  <SelectItem value="review">Aprovação</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
                <Flag className="h-3 w-3" /> Prioridade
              </Label>
              <Select defaultValue="medium" onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl">
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
              <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" /> Data de Entrega
              </Label>
              <Input type="date" {...register("deadline")} className="border-[#E4E6F0] rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
                <ListOrdered className="h-3 w-3" /> Tipo de Entregável
              </Label>
              <Select onValueChange={(v) => setValue("deliverable_type_id", v)}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {deliverableTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
                <Type className="h-3 w-3" /> SKU / Código do produto
              </Label>
              <Input {...register("sku_reference")} placeholder="Ex: SKU-123" className="border-[#E4E6F0] rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> Descrição
            </Label>
            <div className="border border-[#E4E6F0] rounded-xl min-h-[150px] p-4 prose prose-sm max-w-none focus-within:ring-1 focus-within:ring-[#3D4FE8]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 bg-[#F7F8FC] border-t border-[#E4E6F0]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-[#8A8FA3]">
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 font-bold px-8">
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