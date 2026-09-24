import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

interface SocialPostCardProps {
  post: {
    id: string;
    client: {
      name: string;
      handle: string;
      avatar?: string;
    };
    media_urls: string[];
    caption: string;
    scheduled_at: string;
    status: string;
    funnel_stage: string;
  };
  onApprove?: () => void;
  onChanges?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SocialPostCard({ post, onApprove, onChanges, onEdit, onDelete }: SocialPostCardProps) {
  const statusColors: Record<string, string> = {
    pending_internal_approval: 'bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30',
    internally_approved: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    client_approved: 'bg-[var(--success-tint)] text-[var(--success)] border-[var(--success)]/30',
    internal_changes_requested: 'bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger)]/30',
    client_changes_requested: 'bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30',
  };

  const statusLabels: Record<string, string> = {
    pending_internal_approval: 'Para aprovar internamente',
    internally_approved: 'Aprovado internamente',
    client_approved: 'Aprovado para cliente',
    internal_changes_requested: 'Alterações (interno)',
    client_changes_requested: 'Alterações (cliente)',
  };

  const stageLabels: Record<string, string> = {
    attraction: 'Atração',
    education: 'Educação',
    conversion: 'Conversão',
  };

  return (
    <Card className="overflow-hidden border-[var(--line-1)] rounded-3xl bg-[var(--surface-1)] flex flex-col h-full">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--violet-500)] flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-offset-1 ring-[var(--violet-500)]">
            {post.client.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--ink-1)] leading-tight">{post.client.name}</p>
            <p className="text-[10px] text-[var(--ink-3)]">@{post.client.handle}</p>
          </div>
        </div>
        <button className="text-[var(--ink-3)] hover:text-[var(--ink-1)]">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Media Content (Mock Social Post Style) */}
      <div className="aspect-square bg-[var(--surface-2)] relative overflow-hidden flex items-center justify-center">
        {post.media_urls.length > 0 ? (
          <img 
            src={post.media_urls[0]} 
            alt="Content" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--ink-3)]">
            <ImageIcon className="h-8 w-8" />
            <span className="text-[10px]">Sem mídia</span>
          </div>
        )}
        
        {post.media_urls.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-[8px] px-2 py-0.5 rounded-full backdrop-blur-sm">
            1/{post.media_urls.length}
          </div>
        )}
      </div>

      {/* Social Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-[var(--ink-3)]" />
          <MessageCircle className="h-5 w-5 text-[var(--ink-3)]" />
          <Share2 className="h-5 w-5 text-[var(--ink-3)]" />
        </div>
        <Bookmark className="h-5 w-5 text-[var(--ink-3)]" />
      </div>

      {/* Caption Section */}
      <div className="px-4 pb-2 space-y-1">
        <p className="text-[11px] text-[var(--ink-1)] line-clamp-3">
          <span className="font-bold mr-1">@{post.client.handle}</span>
          {post.caption}
        </p>
        <p className="text-[9px] text-[var(--ink-3)] uppercase">
          {new Date(post.scheduled_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} • {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Admin Badges & Actions */}
      <div className="mt-auto p-4 bg-[var(--surface-2)] border-t border-[var(--line-1)] space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn("text-[9px] px-2 h-5 rounded-full border shadow-none", statusColors[post.status])}>
            {statusLabels[post.status]}
          </Badge>
          <Badge className="text-[9px] px-2 h-5 rounded-full bg-[var(--surface-2)] text-[var(--ink-3)] border-[var(--line-1)] shadow-none">
            {stageLabels[post.funnel_stage]}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={onApprove}
            className="flex-1 h-8 text-[10px] bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full"
          >
            Aprovar
          </Button>
          <Button 
            onClick={onChanges}
            variant="outline" 
            className="flex-1 h-8 text-[10px] border-[var(--line-1)] text-[var(--ink-3)] hover:text-[var(--ink-1)] rounded-full"
          >
            Alterações
          </Button>
          <div className="flex gap-1">
            <Button onClick={onEdit} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[var(--ink-3)]"><Edit className="h-3.5 w-3.5" /></Button>
            <Button onClick={onDelete} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[var(--danger)]"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { ImageIcon } from 'lucide-react';
