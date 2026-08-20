import { useState, useEffect } from "react";
import { 
  Rocket, 
  Users, 
  UserPlus, 
  ChevronRight, 
  CheckCircle2, 
  Circle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("ongo_onboarding_seen");
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleComplete = () => {
    console.log("Onboarding completed, saving to localStorage");
    localStorage.setItem("ongo_onboarding_seen", "true");
    setOpen(false);
  };

  const handleSkip = () => {
    console.log("Onboarding skipped, saving to localStorage");
    localStorage.setItem("ongo_onboarding_seen", "true");
    setOpen(false);
  };

  const steps = [
    {
      id: 1,
      title: "Crie seu primeiro squad",
      description: "Organize sua equipe em squads focados para melhor performance.",
      icon: Rocket,
    },
    {
      id: 2,
      title: "Cadastre colaboradores",
      description: "Adicione os talentos da sua agência e atribua suas funções.",
      icon: UserPlus,
    },
    {
      id: 3,
      title: "Cadastre seu primeiro cliente",
      description: "Vincule clientes aos squads e comece a gerir os projetos.",
      icon: Users,
    },
  ];

  const progressValue = (step / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] border-[#E4E6F0] p-0 overflow-hidden rounded-2xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-6 bg-[#3D4FE8] rounded-full flex items-center justify-center relative">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <button 
              onClick={() => setOpen(false)}
              className="text-[#8A8FA3] hover:text-[#0E0E16] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl font-title font-bold text-[#0E0E16]">
              Bem-vindo ao Brain!
            </DialogTitle>
            <p className="text-[#8A8FA3]">
              Vamos configurar sua agência em apenas 3 passos rápidos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-[#0E0E16]">Passo {step} de {steps.length}</span>
              <span className="text-[#3D4FE8] font-bold">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2 bg-[#E4E6F0]" />
          </div>

          <div className="py-6 space-y-6">
            {steps.map((s) => {
              const Icon = s.icon;
              const isCurrent = s.id === step;
              const isCompleted = s.id < step;

              return (
                <div 
                  key={s.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-all duration-300",
                    isCurrent ? "border-[#3D4FE8] bg-[#3D4FE8]/5 shadow-sm" : "border-transparent opacity-60"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    isCompleted ? "bg-[#22C55E] text-white" : isCurrent ? "bg-[#3D4FE8] text-white" : "bg-[#F7F8FC] text-[#8A8FA3]"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className={cn(
                      "text-sm font-bold",
                      isCurrent ? "text-[#0E0E16]" : "text-[#8A8FA3]"
                    )}>
                      {s.title}
                    </h4>
                    {isCurrent && (
                      <p className="text-xs text-[#8A8FA3] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-500">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button 
              variant="ghost" 
              className="text-[#8A8FA3] hover:text-[#0E0E16]"
              onClick={() => setOpen(false)}
            >
              Pular tudo
            </Button>
            <Button 
              className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-8"
              onClick={() => step < steps.length ? setStep(step + 1) : handleComplete()}
            >
              {step === steps.length ? "Finalizar" : "Próximo passo"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}