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
  Plus,
  X,
  FileText,
  Layout
} from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, stripHtml } from "@/lib/utils";
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
  deleteTask,
  getParentTaskOptions,
  getTaskStages,
  addTaskComment,
  getAccountsForClient,
  getInternalTargets
} from "@/lib/tasks.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectProfiles } from "./MultiSelectProfiles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { DatePicker } from "./DatePicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskDetailPanelProps {
  task: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailPanel({ task, isOpen, onOpenChange }: TaskDetailPanelProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [localDescription, setLocalDescription] = useState(stripHtml(task?.description));
  const [displayTime, setDisplayTime] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar_url: string | null } | null>(null);


  
  // Queries
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => getTags() });
  const { data: allProfiles = [] } = useQuery({ queryKey: ['profiles'], queryFn: () => getProfiles() });
  const fetchParentTaskOptions = useServerFn(getParentTaskOptions);
  const { data: parentTaskOptions = [] } = useQuery({
    queryKey: ['parent-task-options', task?.id],
    queryFn: () => fetchParentTaskOptions({ data: { excludeTaskId: task?.id } }),
    enabled: !!task?.id,
  });
  const fetchTaskStages = useServerFn(getTaskStages);
  const { data: taskStages = [] } = useQuery({ queryKey: ['task-stages'], queryFn: () => fetchTaskStages() });
  const fetchAccountsForClient = useServerFn(getAccountsForClient);
  const { data: accountOptions = [] } = useQuery({
    queryKey: ['accounts-for-client', task?.client_id],
    queryFn: () => fetchAccountsForClient({ data: { clientId: task.client_id } }),
    enabled: !!task?.client_id,
  });
  const fetchInternalTargets = useServerFn(getInternalTargets);
  const { data: internalTargets = [] } = useQuery({
    queryKey: ['internal-targets'],
    queryFn: () => fetchInternalTargets(),
    enabled: !!task?.is_internal,
  });

  // Mutations
  const updateTaskFn = useServerFn(updateTask);
  const updateAssigneesFn = useServerFn(updateTaskAssignees);
  const updateTagsFn = useServerFn(updateTaskTags);
  const createTagFn = useServerFn(createTag);
  const addAttachmentFn = useServerFn(addTaskAttachment);
  const deleteAttachmentFn = useServerFn(deleteTaskAttachment);
  const deleteTaskFn = useServerFn(deleteTask);
  const addCommentFn = useServerFn(addTaskComment);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const authUser = data.user;
      if (!authUser) return;
      const profile = allProfiles.find((p: any) => p.id === authUser.id);
      setCurrentUser({
        id: authUser.id,
        name: profile?.full_name || authUser.email || "Você",
        avatar_url: profile?.avatar_url || null,
      });
    });
  }, [allProfiles]);

  useEffect(() => {
    setLocalDescription(stripHtml(task?.description));
    
    const calculateCurrentTime = () => {
      const baseSeconds = task?.time_tracked_seconds || 0;
      if (task?.timer_started_at) {
        const start = new Date(task.timer_started_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        return baseSeconds + diff;
      }
      return baseSeconds;
    };

    setDisplayTime(calculateCurrentTime());
  }, [task?.id, task?.description, task?.time_tracked_seconds, task?.timer_started_at]);

  useEffect(() => {
    let interval: any;
    if (task?.timer_started_at) {
      interval = setInterval(() => {
        const start = new Date(task.timer_started_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        setDisplayTime((task?.time_tracked_seconds || 0) + diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [task?.timer_started_at, task?.time_tracked_seconds]);

  const handleTimerToggle = async () => {
    try {
      if (task.timer_started_at) {
        // Stop timer
        const start = new Date(task.timer_started_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        
        // CRITICAL: Accumulate with EXISTING value
        const currentTotal = task.time_tracked_seconds || 0;
        const newTotal = currentTotal + diff;
        
        await updateTaskFn({ 
          data: { 
            id: task.id, 
            time_tracked_seconds: newTotal,
            timer_started_at: null 
          } 
        });
        
        // Log clean history entry for time tracking
        const { userId } = await supabase.auth.getUser().then(res => ({ userId: res.data.user?.id }));
        if (userId) {
          await supabase.from('task_history').insert({
            task_id: task.id,
            user_id: userId,
            action: `registrou ${formatTime(diff)} de trabalho`,
            changes: { session_seconds: diff, new_total: newTotal }
          });
        }

        toast.success(`Cronômetro parado: +${formatTime(diff)}`);
      } else {
        // Start timer
        await updateTaskFn({ 
          data: { 
            id: task.id, 
            timer_started_at: new Date().toISOString() 
          } 
        });
        toast.success("Cronômetro iniciado");
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      toast.error("Erro ao atualizar cronômetro");
    }
  };


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

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    try {
      await deleteAttachmentFn({ data: { id: attachmentToDelete.id, taskId: task.id, fileName: attachmentToDelete.file_name } });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Anexo removido");
    } catch (error) {
      toast.error("Erro ao remover anexo");
    } finally {
      setAttachmentToDelete(null);
    }
  };

  const confirmDeleteTask = async () => {
    try {
      await deleteTaskFn({ data: { id: task.id } });
      toast.success("Tarefa excluída");
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      toast.error("Erro ao excluir tarefa");
    }
  };

  // Sugestão de menção: dispara em "@parte-do-nome" no fim do texto digitado.
  const mentionMatch = commentText.match(/@([\p{L}\p{N}]*)$/u);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionSuggestions = mentionQuery !== null
    ? allProfiles.filter((p: any) => p.full_name?.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  const handleSelectMention = (profile: any) => {
    setCommentText((prev) => prev.replace(/@([\p{L}\p{N}]*)$/u, `@${profile.full_name} `));
  };

  const handleSubmitComment = async () => {
    const content = commentText.trim();
    if (!content) return;
    setIsSubmittingComment(true);
    try {
      await addCommentFn({ data: { taskId: task.id, content } });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      toast.error("Erro ao enviar comentário");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Realça @Nome Completo dentro do texto do comentário, casando contra os
  // perfis reais (evita marcar qualquer "@algo" como menção válida).
  const renderCommentContent = (content: string) => {
    const mentionNames = allProfiles
      .map((p: any) => p.full_name)
      .filter(Boolean)
      .sort((a: string, b: string) => b.length - a.length);
    if (mentionNames.length === 0) return content;

    const escaped = mentionNames.map((n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');
    const segments = content.split(regex);

    return segments.map((seg, i) =>
      mentionNames.includes(seg.slice(1))
        ? <span key={i} className="text-[var(--violet-500)] font-bold">{seg}</span>
        : <span key={i}>{seg}</span>
    );
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
      <SheetContent className="sm:max-w-[500px] border-[var(--line-1)] p-0 flex flex-col">
        <SheetHeader className="p-6 bg-[var(--surface-2)] border-b border-[var(--line-1)] space-y-4">
          <div className="flex items-center justify-between">
            <Select 
              value={task.priority} 
              onValueChange={(val) => handleUpdate({ priority: val })}
            >
              <SelectTrigger className={cn(
                "w-fit h-7 text-[9px] uppercase font-bold border-none rounded-full px-3 py-0",
                task.priority === 'high' ? 'bg-[var(--danger-tint)] text-[var(--danger)]' : 
                task.priority === 'medium' ? 'bg-[var(--warning-tint)] text-[var(--warning)]' : 
                'bg-[var(--success-tint)] text-[var(--success)]'
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ink-3)] hover:bg-[var(--surface-3)] rounded-full border border-transparent hover:border-[var(--line-1)]">
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
                className="h-8 w-8 text-[var(--ink-3)] hover:bg-[var(--surface-3)] hover:text-[var(--danger)] rounded-full border border-transparent hover:border-[var(--line-1)]"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SheetTitle className="text-xl font-title font-bold text-[var(--ink-1)]">{task.title}</SheetTitle>
          <div className="flex items-center gap-2">
            {task.is_internal ? (
              <span className="text-[10px] text-[var(--violet-300)] font-bold uppercase tracking-widest">
                Interno{task.internal_target ? ` · ${task.internal_target}` : ""}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--ink-3)] font-bold uppercase tracking-widest">
                Entrega: {task.client}{task.account ? ` · ${task.account}` : ""}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-[var(--surface-2)]">
            <div className="space-y-1.5 col-span-2">
              <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> Etapa
              </p>
              <Select value={task.stage} onValueChange={(val) => handleUpdate({ stage: val })}>
                <SelectTrigger className="h-9 text-sm font-bold border border-[var(--line-1)] rounded-lg bg-[var(--surface-1)] px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {task.is_internal ? (
              <div className="space-y-1.5 col-span-2">
                <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                  <Layout className="h-3 w-3" /> Frente interna
                </p>
                <Select value={task.internal_target_id || undefined} onValueChange={(val) => handleUpdate({ internal_target_id: val })}>
                  <SelectTrigger className="h-9 text-sm font-bold border border-[var(--line-1)] rounded-lg bg-[var(--surface-1)] px-3">
                    <SelectValue placeholder="Selecione a frente" />
                  </SelectTrigger>
                  <SelectContent>
                    {internalTargets.map((it: any) => (
                      <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : accountOptions.length > 1 && (
              <div className="space-y-1.5 col-span-2">
                <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                  <Layout className="h-3 w-3" /> Conta
                </p>
                <Select value={task.account_id || undefined} onValueChange={(val) => handleUpdate({ account_id: val })}>
                  <SelectTrigger className="h-9 text-sm font-bold border border-[var(--line-1)] rounded-lg bg-[var(--surface-1)] px-3">
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

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Início
              </p>
              <DatePicker
                value={task.raw_start_date}
                onChange={(date) => handleUpdate({ start_date: date })}
                className="h-9 text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Prazo
              </p>
              <DatePicker
                value={task.raw_deadline}
                onChange={(date) => handleUpdate({ deadline: date })}
                className="h-9 text-sm rounded-lg"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2 mb-2">
                <User className="h-3 w-3" /> Responsáveis
              </p>
              <MultiSelectProfiles
                selectedIds={task.assignees?.map((a: any) => a.id) || []}
                options={allProfiles}
                onChange={handleAssigneesChange}
              />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                <TagIcon className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1 items-center">
                {task.tags?.map((tag: any) => (
                  <Badge key={tag.id} variant="secondary" className="text-[9px] bg-[var(--surface-2)] border-[var(--line-1)] text-[var(--ink-3)]">
                    {tag.name}
                    <button onClick={() => handleTagsChange(currentTagIds.filter((id: string) => id !== tag.id))}>
                      <X className="h-2 w-2 ml-1" />
                    </button>
                  </Badge>
                ))}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-5 w-5 rounded-full border-[var(--line-1)]">
                      <Plus className="h-3 w-3 text-[var(--ink-3)]" />
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

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                Subtarefa de
              </p>
              <Select
                value={task.parent_task_id || "none"}
                onValueChange={(val) => handleUpdate({ parent_task_id: val === "none" ? null : val })}
              >
                <SelectTrigger className="h-9 text-sm border border-[var(--line-1)] rounded-lg bg-[var(--surface-1)] px-3">
                  <SelectValue placeholder="Nenhuma (tarefa principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (tarefa principal)</SelectItem>
                  {parentTaskOptions.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {task.subtask_count > 0 && (
                <p className="text-[10px] text-[var(--ink-3)]">
                  {task.subtask_count} {task.subtask_count === 1 ? "subtarefa" : "subtarefas"} · tempo total inclui elas
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest">Descrição</h4>
            <Textarea 
              className="p-4 bg-[var(--surface-2)] rounded-2xl border border-[var(--line-1)] text-sm text-[var(--ink-1)] min-h-[100px]"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onBlur={() => {
                if (localDescription !== stripHtml(task.description)) {
                  handleUpdate({ description: localDescription });
                }
              }}
              placeholder="Adicione uma descrição..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="h-3 w-3" /> Anexos
              </h4>
              <label className="cursor-pointer">
                <Input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                <div className="text-[10px] font-bold text-[var(--violet-500)] uppercase hover:underline">
                  {isUploading ? "Enviando..." : "+ Adicionar"}
                </div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {task.attachments?.map((file: any) => (
                <div key={file.id} className="p-2 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-xl flex items-center gap-2 group relative">
                  <FileText className="h-4 w-4 text-[var(--ink-3)]" />
                  <a href={file.file_path} target="_blank" rel="noreferrer" className="text-[10px] font-medium truncate flex-1 hover:text-[var(--violet-500)]">
                    {file.file_name}
                  </a>
                  <button
                    onClick={() => setAttachmentToDelete(file)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--danger)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[var(--violet-500)] rounded-2xl text-white space-y-3 shadow-lg shadow-[var(--violet-500)]/20">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Tempo registrado</p>
              <p className="text-xl font-bold font-jakarta tabular-nums">{formatTime(displayTime)}</p>
            </div>
            {task.subtask_count > 0 && (
              <div className="flex justify-between items-center border-t border-[var(--surface-1)]/20 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Total com subtarefas
                </p>
                <p className="text-sm font-bold font-jakarta tabular-nums">
                  {formatTime((task.total_time_with_subtasks || 0) + (displayTime - (task.time_tracked_seconds || 0)))}
                </p>
              </div>
            )}
            <Button
              onClick={handleTimerToggle}
              className="w-full rounded-xl bg-[var(--surface-1)] text-[var(--violet-500)] hover:bg-[var(--surface-3)]/90 font-bold"
            >
              {task.timer_started_at ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {task.timer_started_at ? "Parar" : "Iniciar"} Cronômetro
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--surface-2)]">
            <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-3 w-3" /> Comentários {task.comments?.length > 0 && `(${task.comments.length})`}
            </h4>

            {task.comments?.length > 0 && (
              <div className="space-y-3">
                {task.comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {c.user_avatar ? <AvatarImage src={c.user_avatar} alt={c.user_name} /> : null}
                      <AvatarFallback className="bg-[var(--violet-500)] text-white text-[10px]">
                        {c.user_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-[var(--surface-2)] rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--ink-1)]">{c.user_name}</span>
                        <span className="text-[9px] text-[var(--ink-3)]">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-sm text-[var(--ink-1)] whitespace-pre-wrap break-words">{renderCommentContent(c.content)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {currentUser?.avatar_url ? <AvatarImage src={currentUser.avatar_url} alt={currentUser.name} /> : null}
                <AvatarFallback className="bg-[var(--violet-500)] text-white text-[10px]">
                  {currentUser?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2 relative">
                <Textarea
                  placeholder="Escreva um comentário... Use @ para mencionar"
                  className="rounded-xl border-[var(--line-1)] min-h-[80px]"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && mentionSuggestions.length === 0) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                />
                {mentionSuggestions.length > 0 && (
                  <div className="absolute z-10 bottom-full mb-1 w-full bg-[var(--surface-1)] border border-[var(--line-1)] rounded-xl shadow-md overflow-hidden">
                    {mentionSuggestions.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectMention(p)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                      >
                        <Avatar className="h-6 w-6">
                          {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.full_name} /> : null}
                          <AvatarFallback className="bg-[var(--violet-500)] text-white text-[9px]">
                            {p.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || "??"}
                          </AvatarFallback>
                        </Avatar>
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="rounded-full bg-[var(--violet-500)]"
                    onClick={handleSubmitComment}
                    disabled={isSubmittingComment || !commentText.trim()}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--surface-2)]">
            <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
              <History className="h-3 w-3" /> Histórico
            </h4>
            <div className="space-y-3">
              {task.history?.map((entry: any) => (
                <div key={entry.id} className="text-[10px] flex flex-col gap-0.5 border-l-2 border-[var(--line-1)] pl-3 py-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[var(--ink-1)]">{entry.user_name}</span>
                    <span className="text-[var(--ink-3)]">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <span className="text-[var(--ink-3)]">
                    {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                    {entry.action === 'editou a etapa' && entry.changes?.to
                      ? `: ${taskStages.find((s: any) => s.id === entry.changes.to)?.name || entry.changes.to}`
                      : ''}
                  </span>
                </div>
              ))}
              {(!task.history || task.history.length === 0) && (
                <p className="text-[10px] text-[var(--ink-3)] italic">Nenhum histórico registrado.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--line-1)] bg-[var(--surface-2)] flex gap-3">
          <Button 
            onClick={() => handleUpdate({ stage: 'done' })}
            className="flex-1 rounded-full bg-[var(--success)] hover:bg-[var(--success)]/90 font-bold"
            disabled={task.stage === 'done'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> {task.stage === 'done' ? 'Tarefa Concluída' : 'Concluir Tarefa'}
          </Button>
        </div>
      </SheetContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{task.title}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o anexo <strong>{attachmentToDelete?.file_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAttachment} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
