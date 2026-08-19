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
  Tag as TagIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  task: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailPanel({ task, isOpen, onOpenChange }: TaskDetailPanelProps) {
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

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

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] border-[#E4E6F0] p-0 flex flex-col">
        <SheetHeader className="p-6 bg-[#F7F8FC] border-b border-[#E4E6F0] space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={cn(
              "text-[9px] uppercase font-bold border-none rounded-full px-3 py-1",
              task.priority === 'high' ? 'bg-red-100 text-red-600' : 
              task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 
              'bg-green-100 text-green-600'
            )}>
              {task.priority}
            </Badge>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:bg-white rounded-full border border-transparent hover:border-[#E4E6F0]">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:bg-white rounded-full border border-transparent hover:border-[#E4E6F0]">
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
              <p className="text-sm font-bold text-[#0E0E16]">{task.stage}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Prazo
              </p>
              <p className="text-sm font-bold text-[#0E0E16]">{task.deadline}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <User className="h-3 w-3" /> Responsáveis
              </p>
              <div className="flex -space-x-2">
                {task.assignees?.map((a: string, i: number) => (
                  <Avatar key={i} className="h-6 w-6 border-2 border-white ring-1 ring-[#E4E6F0]">
                    <AvatarFallback className="bg-[#3D4FE8] text-[8px] text-white font-bold">{a}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <TagIcon className="h-3 w-3" /> Tags
              </p>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-[9px] border-[#E4E6F0] rounded-full">Social</Badge>
                <Badge variant="outline" className="text-[9px] border-[#E4E6F0] rounded-full">Ads</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-widest">Descrição</h4>
            <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#E4E6F0] text-sm text-[#0E0E16]">
              {task.description || "Sem descrição adicional."}
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

        <div className="p-6 border-t border-[#E4E6F0] bg-[#F7F8FC] flex gap-3">
          <Button className="flex-1 rounded-full bg-[#22C55E] hover:bg-[#22C55E]/90 font-bold">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir Tarefa
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}