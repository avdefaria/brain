import { useState } from 'react';
import { X, Upload, ChevronRight, ChevronLeft, Image as ImageIcon, Film, Hash, Calendar as CalendarIcon, Clock, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  
  const onDrop = (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > 20) {
      toast.error("Limite máximo de 20 arquivos atingido.");
      return;
    }
    setFiles([...files, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': []
    }
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-3xl">
        <DialogHeader className="p-6 bg-[var(--surface-1)] border-b border-[var(--line-1)]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-title font-bold">Criar Novo Post</DialogTitle>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={cn(
                    "w-8 h-1.5 rounded-full transition-all",
                    step >= i ? "bg-[var(--violet-500)]" : "bg-[var(--line-1)]"
                  )}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 bg-[var(--surface-2)]">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[var(--ink-3)]">Cliente</Label>
                <Select>
                  <SelectTrigger className="w-full bg-[var(--surface-1)] border-[var(--line-1)] rounded-xl h-12 focus:ring-[var(--violet-500)]">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client1">Cliente Exemplo 1</SelectItem>
                    <SelectItem value="client2">Cliente Exemplo 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--ink-3)]">Mídia (Imagens e Vídeos - Máx 20)</Label>
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer",
                    isDragActive ? "border-[var(--violet-500)] bg-[var(--violet-500)]/5" : "border-[var(--line-1)] bg-[var(--surface-1)] hover:border-[var(--violet-500)]/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 bg-[var(--surface-2)] rounded-full flex items-center justify-center text-[var(--violet-500)]">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[var(--ink-1)]">Clique ou arraste arquivos aqui</p>
                    <p className="text-xs text-[var(--ink-3)] mt-1">PNG, JPG, MP4 até 50MB cada</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--line-1)] group">
                        <img 
                          src={URL.createObjectURL(file)} 
                          className="w-full h-full object-cover" 
                          alt="preview" 
                        />
                        <button 
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-[var(--danger)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[var(--ink-3)]">Legenda</Label>
                  <span className="text-xs text-[var(--ink-3)]">{caption.length}/2200</span>
                </div>
                <div className="relative">
                  <Textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Escreva sua legenda aqui..."
                    className="min-h-[200px] bg-[var(--surface-1)] border-[var(--line-1)] rounded-2xl p-4 focus:ring-[var(--violet-500)] resize-none"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button className="text-[var(--ink-3)] hover:text-[var(--ink-1)]"><Smile className="h-5 w-5" /></button>
                    <button className="text-[var(--ink-3)] hover:text-[var(--ink-1)]"><Hash className="h-5 w-5" /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--ink-3)]">Data de Publicação</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-3)]" />
                    <Input type="date" className="pl-10 bg-[var(--surface-1)] border-[var(--line-1)] rounded-xl h-12 focus:ring-[var(--violet-500)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--ink-3)]">Horário</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-3)]" />
                    <Input type="time" className="pl-10 bg-[var(--surface-1)] border-[var(--line-1)] rounded-xl h-12 focus:ring-[var(--violet-500)]" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--ink-3)]">Etapa do Funil</Label>
                <Select>
                  <SelectTrigger className="w-full bg-[var(--surface-1)] border-[var(--line-1)] rounded-xl h-12 focus:ring-[var(--violet-500)]">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attraction">Atração</SelectItem>
                    <SelectItem value="education">Educação</SelectItem>
                    <SelectItem value="conversion">Conversão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-[var(--surface-1)] border-t border-[var(--line-1)] flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack} className="rounded-full px-6 text-[var(--ink-3)]">
              Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose} className="rounded-full px-6 text-[var(--ink-3)]">
              Cancelar
            </Button>
          )}
          
          {step < 3 ? (
            <Button 
              onClick={handleNext} 
              disabled={step === 1 && files.length === 0}
              className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-8"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={() => {
                toast.success("Post agendado com sucesso!");
                onClose();
              }}
              className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-8"
            >
              Agendar Post
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { CheckCircle2 } from 'lucide-react';
