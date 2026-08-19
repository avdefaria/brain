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
    pending_internal_approval: 'bg-amber-100 text-amber-700 border-amber-200',
    internally_approved: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    client_approved: 'bg-green-100 text-green-700 border-green-200',
    internal_changes_requested: 'bg-red-100 text-red-700 border-red-200',
    client_changes_requested: 'bg-orange-100 text-orange-700 border-orange-200',
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
    <Card className="overflow-hidden border-[#E4E6F0] dark:border-[#2A2A36] rounded-3xl bg-white dark:bg-[#1A1A24] flex flex-col h-full">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#3D4FE8] flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-offset-1 ring-[#3D4FE8]">
            {post.client.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-[#0E0E16] dark:text-white leading-tight">{post.client.name}</p>
            <p className="text-[10px] text-[#8A8FA3]">@{post.client.handle}</p>
          </div>
        </div>
        <button className="text-[#8A8FA3] hover:text-[#0E0E16]">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Media Content (Mock Social Post Style) */}
      <div className="aspect-square bg-[#F7F8FC] dark:bg-[#0E0E16] relative overflow-hidden flex items-center justify-center">
        {post.media_urls.length > 0 ? (
          <img 
            src={post.media_urls[0]} 
            alt="Content" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#8A8FA3]">
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
          <Heart className="h-5 w-5 text-[#8A8FA3]" />
          <MessageCircle className="h-5 w-5 text-[#8A8FA3]" />
          <Share2 className="h-5 w-5 text-[#8A8FA3]" />
        </div>
        <Bookmark className="h-5 w-5 text-[#8A8FA3]" />
      </div>

      {/* Caption Section */}
      <div className="px-4 pb-2 space-y-1">
        <p className="text-[11px] text-[#0E0E16] dark:text-white line-clamp-3">
          <span className="font-bold mr-1">@{post.client.handle}</span>
          {post.caption}
        </p>
        <p className="text-[9px] text-[#8A8FA3] uppercase">
          {new Date(post.scheduled_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} • {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Admin Badges & Actions */}
      <div className="mt-auto p-4 bg-[#F7F8FC] dark:bg-[#252530] border-t border-[#E4E6F0] dark:border-[#2A2A36] space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn("text-[9px] px-2 h-5 rounded-full border shadow-none", statusColors[post.status])}>
            {statusLabels[post.status]}
          </Badge>
          <Badge className="text-[9px] px-2 h-5 rounded-full bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 shadow-none">
            {stageLabels[post.funnel_stage]}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={onApprove}
            className="flex-1 h-8 text-[10px] bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full"
          >
            Aprovar
          </Button>
          <Button 
            onClick={onChanges}
            variant="outline" 
            className="flex-1 h-8 text-[10px] border-[#E4E6F0] text-[#8A8FA3] hover:text-[#0E0E16] rounded-full"
          >
            Alterações
          </Button>
          <div className="flex gap-1">
            <Button onClick={onEdit} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#8A8FA3]"><Edit className="h-3.5 w-3.5" /></Button>
            <Button onClick={onDelete} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { ImageIcon } from 'lucide-react';
