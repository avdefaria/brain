import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Calendar, Plus, Filter, LayoutGrid, List, CheckCircle2, Clock, AlertCircle, Eye, Share2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/projects/content-approval')({
  component: ContentApprovalPage,
});

function ContentApprovalPage() {
  const [view, setView] = useState<'calendar' | 'grid'>('calendar');

  const statusColors = {
    pending_internal_approval: 'bg-amber-100 text-amber-700 border-amber-200',
    internally_approved: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    client_approved: 'bg-green-100 text-green-700 border-green-200',
    internal_changes_requested: 'bg-red-100 text-red-700 border-red-200',
    client_changes_requested: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const statusLabels = {
    pending_internal_approval: 'Para aprovar internamente',
    internally_approved: 'Aprovado internamente',
    client_approved: 'Aprovado para cliente',
    internal_changes_requested: 'Alterações (interno)',
    client_changes_requested: 'Alterações (cliente)',
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-title font-bold text-[#0E0E16]">Aprovação de Conteúdo</h1>
              <p className="text-[#8A8FA3] mt-1">Gerencie, pré-visualize e aprove publicações para redes sociais.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3] hover:text-[#0E0E16]">
                <Share2 className="h-4 w-4 mr-2" />
                Link Público
              </Button>
              <Button className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" />
                Novo Post
              </Button>
            </div>
          </div>

          {/* Filters & View Toggle */}
          <div className="flex items-center justify-between bg-white dark:bg-[#1A1A24] p-4 rounded-2xl border border-[#E4E6F0] dark:border-[#2A2A36]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#8A8FA3]" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px] border-none bg-[#F7F8FC] dark:bg-[#2A2A36] rounded-full focus:ring-0">
                    <SelectValue placeholder="Todos os Clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[160px] border-none bg-[#F7F8FC] dark:bg-[#2A2A36] rounded-full focus:ring-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center bg-[#F7F8FC] dark:bg-[#2A2A36] p-1 rounded-full">
              <button 
                onClick={() => setView('calendar')}
                className={cn(
                  "p-2 rounded-full transition-all",
                  view === 'calendar' ? "bg-white dark:bg-[#3D4FE8] shadow-sm text-[#3D4FE8] dark:text-white" : "text-[#8A8FA3]"
                )}
              >
                <Calendar className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setView('grid')}
                className={cn(
                  "p-2 rounded-full transition-all",
                  view === 'grid' ? "bg-white dark:bg-[#3D4FE8] shadow-sm text-[#3D4FE8] dark:text-white" : "text-[#8A8FA3]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {view === 'calendar' ? (
            <div className="bg-white dark:bg-[#1A1A24] rounded-3xl border border-[#E4E6F0] dark:border-[#2A2A36] p-6 shadow-sm min-h-[600px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Agosto 2026</h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="rounded-full">Hoje</Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              
              {/* Simplified Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-[#E4E6F0] dark:bg-[#2A2A36] rounded-xl overflow-hidden border border-[#E4E6F0] dark:border-[#2A2A36]">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="bg-[#F7F8FC] dark:bg-[#1A1A24] p-3 text-center text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-[#1A1A24] min-h-[120px] p-2 hover:bg-[#F7F8FC] dark:hover:bg-[#252530] transition-colors cursor-pointer group">
                    <span className="text-sm font-medium text-[#8A8FA3]">{i + 1}</span>
                    {i === 18 && (
                      <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg shadow-sm">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3 text-indigo-500" />
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">14:00</span>
                        </div>
                        <p className="text-[10px] font-semibold text-[#0E0E16] dark:text-white truncate">Lançamento Verão</p>
                        <Badge className="mt-1 h-4 text-[8px] bg-amber-100 text-amber-700 border-amber-200 rounded-full">Pendente</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center gap-6 p-4 bg-[#F7F8FC] dark:bg-[#2A2A36] rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#8A8FA3]">Status:</span>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", statusColors[key as keyof typeof statusColors].split(' ')[0])}></div>
                      <span className="text-[10px] text-[#8A8FA3]">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-4 w-px bg-[#E4E6F0] dark:bg-[#3A3A46]"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#8A8FA3]">Etapa:</span>
                  {['Atração', 'Educação', 'Conversão'].map((stage) => (
                    <div key={stage} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      <span className="text-[10px] text-[#8A8FA3]">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Grid view content would go here */}
              <div className="text-center py-20 bg-white dark:bg-[#1A1A24] rounded-3xl border border-dashed border-[#E4E6F0] dark:border-[#2A2A36] col-span-full">
                <p className="text-[#8A8FA3]">Visualização em grade em desenvolvimento...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
