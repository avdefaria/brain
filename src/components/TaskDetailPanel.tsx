import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  MessageSquare, 
  Paperclip, 
  History, 
  Share2, 
  Trash2,
  Calendar,
  Clock,
  Flag,
  User,
  Tag as TagIcon,
  Briefcase,
  Plus,
  X,
  FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { 
  updateTask, 
  updateTaskAssignees, 
  updateTaskTags, 
  createTag, 
  getTags, 
  getProfiles,
  addTaskAttachment,
  deleteTaskAttachment,
  deleteTask
} from "@/lib/tasks.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectProfiles } from "./MultiSelectProfiles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskDetailPanelProps {
  task: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailPanel({ task, isOpen, onOpenChange }: TaskDetailPanelProps) {
  const queryClient = useQueryClient();
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Queries
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => getTags() });
  const { data: allProfiles = [] } = useQuery({ queryKey: ['profiles'], queryFn: () => getProfiles() });

  // Mutations
  const updateTaskFn = useServerFn(updateTask);
  const updateAssigneesFn = useServerFn(updateTaskAssignees);
  const updateTagsFn = useServerFn(updateTaskTags);
  const createTagFn = useServerFn(createTag);
  const addAttachmentFn = useServerFn(addTaskAttachment);
  const deleteAttachmentFn = useServerFn(deleteTaskAttachment);
  const deleteTaskFn = useServerFn(deleteTask);

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpdate = async (updates: any) => {
    try {
      await updateTaskFn({ data: { id: task.id, ...updates } });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarefa atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleAssigneesChange = async (userIds: string[]) => {
    try {
      await updateAssigneesFn({ data: { taskId: task.id, userIds } });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Responsáveis atualizados");
    } catch (error) {
      toast.error("Erro ao atualizar responsáveis");
    }
  };

  const handleTagsChange = async (tagIds: string[]) => {
    try {
      await updateTagsFn({ data: { taskId: task.id, tagIds } });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      toast.error("Erro ao atualizar tags");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${task.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath);

      await addAttachmentFn({
        data: {
          taskId: task.id,
          fileName: file.name,
          fileUrl: publicUrl
        }
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Arquivo enviado");
    } catch (error) {
      console.error(error);
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    
    try {
      await deleteTaskFn({ data: { id: task.id } });
      toast.success("Tarefa excluída");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      toast.error("Erro ao excluir tarefa");
    }
  };

  const handleShare = (type: 'email' | 'whatsapp') => {
    const text = `Tarefa: ${task.title}\nPrioridade: ${task.priority}\nEtapa: ${task.stage}\nLink: ${window.location.href}`;
    const subject = `Compartilhando tarefa: ${task.title}`;
    
    if (type === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  if (!task) return null;

  const currentTagIds = task.tags?.map((t: any) => t.id) || [];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] border-[#E4E6F0] p-0 flex flex-col">
        <SheetHeader className="p-6 bg-[#F7F8FC] border-b border-[#E4E6F0] space-y-4">
          <div className="flex items-center justify-between">
            <Select 
              value={task.priority} 
              onValueChange={(val) => handleUpdate({ priority: val })}
            >
              <SelectTrigger className={cn(
                "w-fit h-7 text-[9px] uppercase font-bold border-none rounded-full px-3 py-0",
                task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 
                'bg-green-100 text-green-600'
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:bg-white rounded-full border border-transparent hover:border-[#E4E6F0]">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="end">
                  <Button variant="ghost" className="w-full justify-start text-xs" onClick={() => handleShare('email')}>
                    Via E-mail
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-xs" onClick={() => handleShare('whatsapp')}>
                    Via WhatsApp
                  </Button>
                </PopoverContent>
              </Popover>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-[#8A8FA3] hover:bg-white hover:text-red-500 rounded-full border border-transparent hover:border-[#E4E6F0]"
                onClick={handleDeleteTask}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SheetTitle className="text-xl font-title font-bold text-[#0E0E16]">{task.title}</SheetTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8A8FA3] font-bold uppercase tracking-widest">Entrega: {task.client}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> Etapa
              </p>
              <Select value={task.stage} onValueChange={(val) => handleUpdate({ stage: val })}>
                <SelectTrigger className="h-8 text-sm font-bold bg-transparent border-none p-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="doing">Fazendo</SelectItem>
                  <SelectItem value="review">Revisão</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Prazo
              </p>
              <Input 
                type="date" 
                className="h-8 text-xs font-bold bg-transparent border-none p-0 focus:ring-0" 
                value={task.raw_deadline ? new Date(task.raw_deadline).toISOString().split('T')[0] : ''}
                onChange={(e) => handleUpdate({ deadline: e.target.value })}
              />
            </div>

            <div className="space-y-1 col-span-2">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2 mb-2">
                <User className="h-3 w-3" /> Responsáveis
              </p>
              <MultiSelectProfiles 
                selectedIds={task.assignees?.map((a: any) => a.id) || []}
                options={allProfiles}
                onChange={handleAssigneesChange}
              />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="h-3 w-3" /> SKU / Código
              </p>
              <p className="text-sm font-bold text-[#0E0E16]">
                {task.sku_reference || "N/A"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <TagIcon className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1 items-center">
                {task.tags?.map((tag: any) => (
                  <Badge key={tag.id} variant="secondary" className="text-[9px] bg-[#F7F8FC] border-[#E4E6F0] text-[#8A8FA3]">
                    {tag.name}
                    <button onClick={() => handleTagsChange(currentTagIds.filter((id: string) => id !== tag.id))}>
                      <X className="h-2 w-2 ml-1" />
                    </button>
                  </Badge>
                ))}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-5 w-5 rounded-full border-[#E4E6F0]">
                      <Plus className="h-3 w-3 text-[#8A8FA3]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar tag..." className="h-8" />
                      <CommandList>
                        <CommandEmpty>
                          <Button 
                            variant="ghost" 
                            className="w-full text-xs justify-start"
                            onClick={async () => {
                              const name = prompt("Nome da nova tag:");
                              if (name) {
                                const newTag = await createTagFn({ data: { name } });
                                handleTagsChange([...currentTagIds, newTag.id]);
                              }
                            }}
                          >
                            + Criar tag
                          </Button>
                        </CommandEmpty>
                        <CommandGroup>
                          {allTags.filter((t: any) => !currentTagIds.includes(t.id)).map((tag: any) => (
                            <CommandItem
                              key={tag.id}
                              onSelect={() => handleTagsChange([...currentTagIds, tag.id])}
                              className="text-xs"
                            >
                              {tag.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest">Descrição</h4>
            <Textarea 
              className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E4E6F0] text-sm text-[#0E0E16] min-h-[100px]"
              value={task.description || ""}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder="Adicione uma descrição..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="h-3 w-3" /> Anexos
              </h4>
              <label className="cursor-pointer">
                <Input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                <div className="text-[10px] font-bold text-[#3D4FE8] uppercase hover:underline">
                  {isUploading ? "Enviando..." : "+ Adicionar"}
                </div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {task.attachments?.map((file: any) => (
                <div key={file.id} className="p-2 bg-[#F7F8FC] border border-[#E4E6F0] rounded-xl flex items-center gap-2 group relative">
                  <FileText className="h-4 w-4 text-[#8A8FA3]" />
                  <a href={file.file_path} target="_blank" rel="noreferrer" className="text-[10px] font-medium truncate flex-1 hover:text-[#3D4FE8]">
                    {file.file_name}
                  </a>
                  <button 
                    onClick={async () => {
                      if (confirm(`Excluir anexo ${file.file_name}?`)) {
                        await deleteAttachmentFn({ data: { id: file.id, taskId: task.id, fileName: file.file_name } });
                        queryClient.invalidateQueries({ queryKey: ['tasks'] });
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#3D4FE8] rounded-2xl text-white space-y-3 shadow-lg shadow-[#3D4FE8]/20">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Tempo registrado</p>
              <p className="text-xl font-bold font-jakarta tabular-nums">{formatTime(seconds)}</p>
            </div>
            <Button 
              onClick={() => setTimerActive(!timerActive)}
              className="w-full rounded-xl bg-white text-[#3D4FE8] hover:bg-white/90 font-bold"
            >
              {timerActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {timerActive ? "Parar" : "Iniciar"} Cronômetro
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#F7F8FC]">
            <h4 className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-3 w-3" /> Comentários
            </h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#3D4FE8] text-white text-[10px]">AF</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea placeholder="Escreva um comentário... Use @ para mencionar" className="rounded-xl border-[#E4E6F0] min-h-[80px]" />
                  <div className="flex justify-end">
                    <Button size="sm" className="rounded-full bg-[#3D4FE8]">Enviar</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#F7F8FC]">
            <h4 className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
              <History className="h-3 w-3" /> Histórico
            </h4>
            <div className="space-y-3">
              {task.history?.map((entry: any) => (
                <div key={entry.id} className="text-[10px] flex flex-col gap-0.5 border-l-2 border-[#E4E6F0] pl-3 py-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#0E0E16]">{entry.user_name}</span>
                    <span className="text-[#8A8FA3]">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <span className="text-[#8A8FA3]">
                    {entry.action === 'campo_alterado_stage' ? `Moveu para ${entry.changes.to}` :
                     entry.action === 'campo_alterado_priority' ? `Alterou prioridade para ${entry.changes.to}` :
                     entry.action === 'campo_alterado_deadline' ? `Alterou prazo para ${entry.changes.to}` :
                     entry.action === 'anexo_adicionado' ? `Adicionou anexo: ${entry.changes.fileName}` :
                     entry.action === 'anexo_removido' ? `Removeu anexo: ${entry.changes.fileName}` :
                     entry.action === 'tags_alteradas' ? 'Atualizou as tags' :
                     entry.action.replace('campo_alterado_', 'Alterou ')}
                  </span>
                </div>
              ))}
              {(!task.history || task.history.length === 0) && (
                <p className="text-[10px] text-[#8A8FA3] italic">Nenhum histórico registrado.</p>
              )}
            </div>

        <div className="p-6 border-t border-[#E4E6F0] bg-[#F7F8FC] flex gap-3">
          <Button 
            onClick={() => handleUpdate({ stage: 'done' })}
            className="flex-1 rounded-full bg-[#22C55E] hover:bg-[#22C55E]/90 font-bold"
            disabled={task.stage === 'done'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> {task.stage === 'done' ? 'Tarefa Concluída' : 'Concluir Tarefa'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
