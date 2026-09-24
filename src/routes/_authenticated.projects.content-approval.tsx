import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Calendar, Plus, Filter, LayoutGrid, List, CheckCircle2, Clock, AlertCircle, Eye, Share2, MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CreatePostModal } from '@/components/CreatePostModal';
import { cn } from '@/lib/utils';
import { SocialPostCard } from '@/components/SocialPostCard';



export const Route = createFileRoute('/_authenticated/projects/content-approval')({
  component: ContentApprovalPage,
});

function ContentApprovalPage() {
  const [view, setView] = useState<'calendar' | 'grid'>('calendar');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


  const statusColors = {
    pending_internal_approval: 'bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30',
    internally_approved: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    client_approved: 'bg-[var(--success-tint)] text-[var(--success)] border-[var(--success)]/30',
    internal_changes_requested: 'bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger)]/30',
    client_changes_requested: 'bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30',
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
              <h1 className="text-3xl font-title font-bold text-[var(--ink-1)]">Aprovação de Conteúdo</h1>
              <p className="text-[var(--ink-3)] mt-1">Gerencie, pré-visualize e aprove publicações para redes sociais.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)] hover:text-[var(--ink-1)]">
                <Share2 className="h-4 w-4 mr-2" />
                Link Público
              </Button>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Post
              </Button>
            </div>
          </div>

          <CreatePostModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
          />

          {/* Filters & View Toggle */}
          <div className="flex items-center justify-between bg-[var(--surface-1)] p-4 rounded-2xl border border-[var(--line-1)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--ink-3)]" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px] border-none bg-[var(--surface-2)] rounded-full focus:ring-0">
                    <SelectValue placeholder="Todos os Clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[160px] border-none bg-[var(--surface-2)] rounded-full focus:ring-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center bg-[var(--surface-2)] p-1 rounded-full">
              <button 
                onClick={() => setView('calendar')}
                className={cn(
                  "p-2 rounded-full transition-all",
                  view === 'calendar' ? "bg-[var(--surface-1)] shadow-sm text-[var(--violet-500)]" : "text-[var(--ink-3)]"
                )}
              >
                <Calendar className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setView('grid')}
                className={cn(
                  "p-2 rounded-full transition-all",
                  view === 'grid' ? "bg-[var(--surface-1)] shadow-sm text-[var(--violet-500)]" : "text-[var(--ink-3)]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {view === 'calendar' ? (
            <div className="bg-[var(--surface-1)] rounded-3xl border border-[var(--line-1)] p-6 shadow-sm min-h-[600px]">
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
              <div className="grid grid-cols-7 gap-px bg-[var(--line-1)] rounded-xl overflow-hidden border border-[var(--line-1)]">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="bg-[var(--surface-2)] p-3 text-center text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <div key={i} className="bg-[var(--surface-1)] min-h-[120px] p-2 hover:bg-[var(--surface-2)] transition-colors cursor-pointer group">
                    <span className="text-sm font-medium text-[var(--ink-3)]">{i + 1}</span>
                    {i === 18 && (
                      <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3 text-indigo-500" />
                          <span className="text-[10px] font-bold text-indigo-600">14:00</span>
                        </div>
                        <p className="text-[10px] font-semibold text-[var(--ink-1)] truncate">Lançamento Verão</p>
                        <Badge className="mt-1 h-4 text-[8px] bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30 rounded-full">Pendente</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center gap-6 p-4 bg-[var(--surface-2)] rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--ink-3)]">Status:</span>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", statusColors[key as keyof typeof statusColors].split(' ')[0])}></div>
                      <span className="text-[10px] text-[var(--ink-3)]">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-4 w-px bg-[var(--line-1)]"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--ink-3)]">Etapa:</span>
                  {['Atração', 'Educação', 'Conversão'].map((stage) => (
                    <div key={stage} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--ink-4)]"></div>
                      <span className="text-[10px] text-[var(--ink-3)]">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[
                {
                  id: '1',
                  client: { name: 'Ongo Branding', handle: 'ongomarketing' },
                  media_urls: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'],
                  caption: 'Transforme sua agência com o novo Brain. A gestão inteligente que você precisava está aqui. 🚀 #OngoBrain #MarketingAgency',
                  scheduled_at: new Date().toISOString(),
                  status: 'pending_internal_approval',
                  funnel_stage: 'attraction'
                }
              ].map(post => (
                <SocialPostCard 
                  key={post.id} 
                  post={post} 
                  onApprove={() => toast.success("Post aprovado!")}
                  onChanges={() => toast.info("Solicitação de ajustes enviada")}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';


