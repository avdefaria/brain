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
        <DialogHeader className="p-6 bg-white dark:bg-[#1A1A24] border-b border-[#E4E6F0] dark:border-[#2A2A36]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-title font-bold">Criar Novo Post</DialogTitle>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={cn(
                    "w-8 h-1.5 rounded-full transition-all",
                    step >= i ? "bg-[#3D4FE8]" : "bg-[#E4E6F0] dark:bg-[#2A2A36]"
                  )}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 bg-[#F7F8FC] dark:bg-[#0E0E16]">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[#8A8FA3]">Cliente</Label>
                <Select>
                  <SelectTrigger className="w-full bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl h-12 focus:ring-[#3D4FE8]">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client1">Cliente Exemplo 1</SelectItem>
                    <SelectItem value="client2">Cliente Exemplo 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#8A8FA3]">Mídia (Imagens e Vídeos - Máx 20)</Label>
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer",
                    isDragActive ? "border-[#3D4FE8] bg-[#3D4FE8]/5" : "border-[#E4E6F0] dark:border-[#2A2A36] bg-white dark:bg-[#1A1A24] hover:border-[#3D4FE8]/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 bg-[#F7F8FC] dark:bg-[#2A2A36] rounded-full flex items-center justify-center text-[#3D4FE8]">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#0E0E16] dark:text-white">Clique ou arraste arquivos aqui</p>
                    <p className="text-xs text-[#8A8FA3] mt-1">PNG, JPG, MP4 até 50MB cada</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[#E4E6F0] group">
                        <img 
                          src={URL.createObjectURL(file)} 
                          className="w-full h-full object-cover" 
                          alt="preview" 
                        />
                        <button 
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <Label className="text-[#8A8FA3]">Legenda</Label>
                  <span className="text-xs text-[#8A8FA3]">{caption.length}/2200</span>
                </div>
                <div className="relative">
                  <Textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Escreva sua legenda aqui..."
                    className="min-h-[200px] bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] rounded-2xl p-4 focus:ring-[#3D4FE8] resize-none"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button className="text-[#8A8FA3] hover:text-[#0E0E16]"><Smile className="h-5 w-5" /></button>
                    <button className="text-[#8A8FA3] hover:text-[#0E0E16]"><Hash className="h-5 w-5" /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8FA3]">Data de Publicação</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                    <Input type="date" className="pl-10 bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl h-12 focus:ring-[#3D4FE8]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8A8FA3]">Horário</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                    <Input type="time" className="pl-10 bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl h-12 focus:ring-[#3D4FE8]" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8FA3]">Etapa do Funil</Label>
                <Select>
                  <SelectTrigger className="w-full bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl h-12 focus:ring-[#3D4FE8]">
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

        <div className="p-6 bg-white dark:bg-[#1A1A24] border-t border-[#E4E6F0] dark:border-[#2A2A36] flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack} className="rounded-full px-6 text-[#8A8FA3]">
              Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose} className="rounded-full px-6 text-[#8A8FA3]">
              Cancelar
            </Button>
          )}
          
          {step < 3 ? (
            <Button 
              onClick={handleNext} 
              disabled={step === 1 && files.length === 0}
              className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-8"
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
              className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-8"
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
