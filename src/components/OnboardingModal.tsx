import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { getOnboardingStatus } from "@/lib/squads.functions";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const fetchOnboardingStatus = useServerFn(getOnboardingStatus);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("ongo_onboarding_seen");
    if (hasSeenOnboarding) return;

    fetchOnboardingStatus().then((status) => {
      if (status.hasSquad && status.hasCollaborator && status.hasClient) {
        // Agência já configurada (dados criados fora do fluxo de onboarding) —
        // marca como visto e nunca mais mostra, em qualquer navegador/dispositivo.
        localStorage.setItem("ongo_onboarding_seen", "true");
        return;
      }
      setOpen(true);
    }).catch(() => {
      // Se a checagem falhar, não bloqueia o usuário com o modal.
    });
  }, [fetchOnboardingStatus]);

  const handleComplete = () => {
    try {
      localStorage.setItem("ongo_onboarding_seen", "true");
    } catch (e) {
      console.error("Failed to save onboarding state", e);
    }
    setOpen(false);
  };

  const handleSkip = () => {
    try {
      localStorage.setItem("ongo_onboarding_seen", "true");
    } catch (e) {
      console.error("Failed to save onboarding state", e);
    }
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
      <DialogContent className="sm:max-w-[500px] border-[var(--line-1)] p-0 overflow-hidden rounded-2xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-6 bg-[var(--violet-500)] rounded-full flex items-center justify-center relative">
              <div className="w-2 h-2 bg-[var(--surface-1)] rounded-full"></div>
            </div>
            <button 
              onClick={handleSkip}
              className="text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl font-title font-bold text-[var(--ink-1)]">
              Bem-vindo ao Brain!
            </DialogTitle>
            <p className="text-[var(--ink-3)]">
              Vamos configurar sua agência em apenas 3 passos rápidos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-[var(--ink-1)]">Passo {step} de {steps.length}</span>
              <span className="text-[var(--violet-500)] font-bold">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2 bg-[var(--line-1)]" />
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
                    isCurrent ? "border-[var(--violet-500)] bg-[var(--violet-500)]/5 shadow-sm" : "border-transparent opacity-60"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    isCompleted ? "bg-[var(--success)] text-white" : isCurrent ? "bg-[var(--violet-500)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-3)]"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className={cn(
                      "text-sm font-bold",
                      isCurrent ? "text-[var(--ink-1)]" : "text-[var(--ink-3)]"
                    )}>
                      {s.title}
                    </h4>
                    {isCurrent && (
                      <p className="text-xs text-[var(--ink-3)] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-500">
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
              className="text-[var(--ink-3)] hover:text-[var(--ink-1)]"
              onClick={handleSkip}
            >
              Pular tudo
            </Button>
            <Button 
              className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full px-8"
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