import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, Bookmark, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/public/approval/$token')({
  component: PublicApprovalPage,
});

function PublicApprovalPage() {
  const [posts, setPosts] = useState([
    {
      id: '1',
      client: { name: 'Ongo Branding', handle: 'ongomarketing' },
      media_urls: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'],
      caption: 'Transforme sua agência com o novo Brain. A gestão inteligente que você precisava está aqui. 🚀 #OngoBrain #MarketingAgency',
      scheduled_at: new Date().toISOString(),
      status: 'pending_internal_approval',
      funnel_stage: 'attraction'
    }
  ]);

  const [comment, setComment] = useState('');

  const handleApprove = (id: string) => {
    toast.success("Post aprovado com sucesso!");
  };

  const handleRequestChanges = (id: string) => {
    if (!comment) {
      toast.error("Por favor, descreva as alterações necessárias.");
      return;
    }
    toast.info("Solicitação de alteração enviada.");
    setComment('');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0E0E16] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1A1A24] p-6 rounded-3xl border border-[#E4E6F0] dark:border-[#2A2A36]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#3D4FE8] rounded-2xl flex items-center justify-center relative shadow-lg shadow-[#3D4FE8]/20">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-title font-bold text-[#0E0E16] dark:text-white">Aprovação de Conteúdo</h1>
              <p className="text-sm text-[#8A8FA3]">Ongo Marketing • Link Privado</p>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full h-7 px-3 self-start md:self-center">
            {posts.length} Post(s) pendente(s)
          </Badge>
        </div>

        {/* Content Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden border-[#E4E6F0] dark:border-[#2A2A36] rounded-3xl bg-white dark:bg-[#1A1A24] flex flex-col">
              {/* Post Header */}
              <div className="p-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#3D4FE8] flex items-center justify-center text-white text-[10px] font-bold">
                  OB
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0E0E16] dark:text-white leading-tight">{post.client.name}</p>
                  <p className="text-[10px] text-[#8A8FA3]">@{post.client.handle}</p>
                </div>
              </div>

              {/* Media Content */}
              <div className="aspect-square bg-[#F7F8FC] dark:bg-[#0E0E16] relative">
                <img src={post.media_urls[0]} alt="Content" className="w-full h-full object-cover" />
              </div>

              {/* Social Actions */}
              <div className="p-3 flex items-center justify-between border-b border-[#E4E6F0] dark:border-[#2A2A36]">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-[#8A8FA3]" />
                  <MessageCircle className="h-5 w-5 text-[#8A8FA3]" />
                  <Share2 className="h-5 w-5 text-[#8A8FA3]" />
                </div>
                <Bookmark className="h-5 w-5 text-[#8A8FA3]" />
              </div>

              {/* Caption */}
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-[#0E0E16] dark:text-white">
                  <span className="font-bold mr-1">@{post.client.handle}</span>
                  {post.caption}
                </p>
                
                <div className="space-y-4 pt-4 border-t border-[#E4E6F0] dark:border-[#2A2A36]">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-[#8A8FA3] uppercase">Comentário ou Ajuste</Label>
                    <Textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Descreva aqui se precisar de alguma alteração..."
                      className="text-xs min-h-[80px] bg-[#F7F8FC] dark:bg-[#0E0E16] border-none rounded-xl focus:ring-[#3D4FE8] resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(post.id)}
                      className="flex-1 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white rounded-full h-10 text-xs font-bold"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button 
                      onClick={() => handleRequestChanges(post.id)}
                      variant="outline"
                      className="flex-1 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/5 rounded-full h-10 text-xs font-bold"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Solicitar Ajustes
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Sidebar / Info */}
          <div className="space-y-6">
            <Card className="p-6 border-[#E4E6F0] dark:border-[#2A2A36] rounded-3xl bg-white dark:bg-[#1A1A24]">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#3D4FE8]" />
                Instruções de Aprovação
              </h2>
              <ul className="text-xs text-[#8A8FA3] space-y-3">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3D4FE8] mt-1 shrink-0" />
                  Visualize como o post ficará no feed oficial.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3D4FE8] mt-1 shrink-0" />
                  Se tudo estiver ok, clique em "Aprovar".
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3D4FE8] mt-1 shrink-0" />
                  Se precisar de ajustes na legenda ou imagem, escreva no campo de texto e clique em "Solicitar Ajustes".
                </li>
              </ul>
            </Card>

            <div className="text-center p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
              <p className="text-[10px] text-[#3D4FE8] font-bold uppercase tracking-wider mb-2">Powered by</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-4 bg-[#3D4FE8] rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <span className="text-lg font-bold text-[#0E0E16] dark:text-white">Brain</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Label } from '@/components/ui/label';
