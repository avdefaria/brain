import { createFileRoute } from "@tanstack/react-router";
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldAlert, 
  TrendingUp,
  FileText,
  Clock,
  ArrowLeft,
  Settings,
  MoreVertical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/clients/manage" className="h-10 w-10 rounded-full border border-[#E4E6F0] flex items-center justify-center text-[#8A8FA3] hover:text-[#3D4FE8] bg-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-title font-bold text-[#0E0E16]">TechFlow Systems</h1>
              <Badge className="bg-green-100 text-green-600 border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Ativo</Badge>
            </div>
            <p className="text-sm text-[#8A8FA3]">ID: {clientId} • Segmento: Tecnologia</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#0E0E16] gap-2">
            <Settings className="h-4 w-4" /> Editar
          </Button>
          <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 gap-2">
            Nova Ação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#F7F8FC] pb-4">
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#3D4FE8]" /> Evolução de Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ name: 'Set', value: 72 }, { name: 'Out', value: 78 }, { name: 'Nov', value: 85 }, { name: 'Dez', value: 82 }, { name: 'Jan', value: 88 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3D4FE8" strokeWidth={3} dot={{ fill: '#3D4FE8', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[#E4E6F0] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-title text-[#8A8FA3] uppercase tracking-widest">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-[#8A8FA3]" />
                <span className="text-[#0E0E16] font-medium">TechFlow Systems LTDA</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ShieldAlert className="h-4 w-4 text-[#8A8FA3]" />
                <div className="flex items-center gap-2">
                  <span className="text-[#8A8FA3]">CNPJ:</span>
                  <span className="text-[#0E0E16]">12.345.678/0001-99</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-[#8A8FA3]" />
                <span className="text-[#0E0E16]">contato@techflow.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-[#8A8FA3]" />
                <span className="text-[#0E0E16]">+55 (11) 99887-7665</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E4E6F0] shadow-sm bg-[#3D4FE8] text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest">Health Score</p>
                  <h3 className="text-4xl font-bold mt-1">88</h3>
                </div>
                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white" style={{ width: '88%' }} />
                </div>
                <span className="text-[10px] font-bold">+5%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#3D4FE8]" /> Contrato Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8FA3]">Tipo:</span>
              <span className="font-bold text-[#0E0E16]">Recorrente</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8FA3]">Valor Mensal:</span>
              <span className="font-bold text-[#0E0E16]">R$ 12.000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8FA3]">Início:</span>
              <span className="text-[#0E0E16]">01/01/2024</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8FA3]">Renovação:</span>
              <span className="text-[#3D4FE8] font-bold">01/01/2025</span>
            </div>
            <Button variant="outline" className="w-full rounded-full border-[#E4E6F0]">Visualizar PDF</Button>
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#3D4FE8]" /> Próximas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { task: "Relatório de Performance", date: "Hoje", status: "Em andamento" },
                { task: "Campanha Meta Ads Q2", date: "15 Fev", status: "Pendente" },
                { task: "Nova Landing Page", date: "22 Fev", status: "Pendente" },
              ].map((t, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-[#F7F8FC] transition-colors border border-transparent hover:border-[#E4E6F0]">
                  <div>
                    <p className="text-xs font-bold text-[#0E0E16]">{t.task}</p>
                    <p className="text-[10px] text-[#8A8FA3]">{t.date}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase rounded-full text-[#8A8FA3] border-[#E4E6F0]">
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <Users className="h-5 w-5 text-[#3D4FE8]" /> Squad Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 bg-[#F7F8FC] rounded-2xl border border-[#E4E6F0] flex items-center justify-center text-[#3D4FE8] font-bold text-xl">
                G
              </div>
              <div>
                <p className="text-sm font-bold text-[#0E0E16]">Squad Growth</p>
                <p className="text-xs text-[#8A8FA3]">3 colaboradores ativos</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A8FA3]">Líder:</span>
                <span className="font-medium text-[#0E0E16]">Ana Paula</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A8FA3]">Principal contato:</span>
                <span className="font-medium text-[#0E0E16]">João Silva</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}