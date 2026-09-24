import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  ExternalLink,
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  DollarSign,
  FileText,
  Info,
  Package,
  Layers,
  Palette,
  Layout
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface DeliveryDetailPanelProps {
  client: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryDetailPanel({ client, isOpen, onOpenChange }: DeliveryDetailPanelProps) {
  if (!client) return null;

  const mockClientData = {
    contact: {
      name: "Ana Silva",
      email: "ana@techflow.com",
      whatsapp: "+55 11 99999-9999"
    },
    segment: "Tecnologia / SaaS",
    contractType: "Recorrente (Mensal)",
    startDate: "12/01/2024",
    duration: "12 meses",
    ltv: "R$ 48.000,00",
    healthScore: 88,
    progress: 65,
    deliverables: [
      { name: "Posts Instagram", completed: 8, total: 12 },
      { name: "Artigos Blog", completed: 2, total: 4 },
      { name: "Newsletter", completed: 1, total: 2 }
    ]
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] border-[var(--line-1)] p-0 flex flex-col">
        <SheetHeader className="p-8 bg-[var(--surface-2)] border-b border-[var(--line-1)]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Badge className="bg-[var(--violet-500)] text-white rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-none">
                {client.squad}
              </Badge>
              <SheetTitle className="text-3xl font-title font-bold text-[var(--ink-1)]">{client.name}</SheetTitle>
              <div className="flex items-center gap-4 text-[var(--ink-3)] text-sm mt-2">
                <span className="flex items-center gap-1.5"><Layout className="h-4 w-4" /> {mockClientData.segment}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Desde {mockClientData.startDate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full border-[var(--line-1)] hover:bg-[var(--surface-3)] text-[var(--violet-500)] font-bold">
                <Phone className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 font-bold">
                <Mail className="h-4 w-4 mr-2" /> E-mail
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          <Tabs defaultValue="overview" className="flex-1 flex">
            <div className="w-64 bg-[var(--surface-2)] border-r border-[var(--line-1)] p-4 flex flex-col gap-1">
              <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                {[
                  { id: "overview", label: "Visão Geral", icon: Info },
                  { id: "contract", label: "Informações do Contrato", icon: FileText },
                  { id: "briefing", label: "Briefing", icon: Package },
                  { id: "deliverables", label: "Entregáveis", icon: Layers },
                  { id: "brand", label: "Brand Kit", icon: Palette },
                  { id: "health", label: "Health Score", icon: Heart },
                  { id: "revenue", label: "Receita e LTV", icon: DollarSign }
                ].map((tab) => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id} 
                    className="w-full justify-start gap-3 px-4 py-3 rounded-xl border-none data-[state=active]:bg-[var(--surface-1)] data-[state=active]:text-[var(--violet-500)] data-[state=active]:shadow-sm text-[var(--ink-3)] font-bold text-xs"
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <TabsContent value="overview" className="mt-0 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-[var(--surface-2)] rounded-2xl border border-[var(--line-1)] space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest">Health Score</h4>
                      <Heart className="h-4 w-4 text-[var(--success)]" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold font-jakarta">{mockClientData.healthScore}</span>
                        <span className="text-sm text-[var(--ink-3)] mb-1">/ 100</span>
                      </div>
                      <Progress value={mockClientData.healthScore} className="h-2 bg-[var(--line-1)] [&>div]:bg-[var(--success)]" />
                    </div>
                  </div>
                  <div className="p-6 bg-[var(--surface-2)] rounded-2xl border border-[var(--line-1)] space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest">LTV</h4>
                      <TrendingUp className="h-4 w-4 text-[var(--violet-500)]" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-3xl font-bold font-jakarta">{mockClientData.ltv}</span>
                      <p className="text-xs text-[var(--success)] font-bold">+12% vs mês ant.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-widest">Progresso de Entregas (Mês Atual)</h4>
                  <div className="space-y-6">
                    {mockClientData.deliverables.map((d, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-[var(--ink-1)]">{d.name}</span>
                          <span className="text-[var(--violet-500)]">{d.completed} / {d.total}</span>
                        </div>
                        <Progress value={(d.completed / d.total) * 100} className="h-2 bg-[var(--line-1)] [&>div]:bg-[var(--violet-500)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="deliverables" className="mt-0">
                <h3 className="text-xl font-bold text-[var(--ink-1)] mb-6">Entregáveis</h3>
                {/* Content for deliverables */}
              </TabsContent>
              {/* Other tab contents */}
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}