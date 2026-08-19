import React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Star 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper to calculate Brazilian holidays (including mobile ones)
function getBrazilianHolidays(year: number) {
  const holidays: { name: string; date: Date; type: string }[] = [
    { name: "Confraternização Universal", date: new Date(year, 0, 1), type: "Feriado Nacional" },
    { name: "Tiradentes", date: new Date(year, 3, 21), type: "Feriado Nacional" },
    { name: "Dia do Trabalho", date: new Date(year, 4, 1), type: "Feriado Nacional" },
    { name: "Independência do Brasil", date: new Date(year, 8, 7), type: "Feriado Nacional" },
    { name: "Nossa Senhora Aparecida", date: new Date(year, 9, 12), type: "Feriado Nacional" },
    { name: "Finados", date: new Date(year, 10, 2), type: "Feriado Nacional" },
    { name: "Proclamação da República", date: new Date(year, 10, 15), type: "Feriado Nacional" },
    { name: "Dia Nacional de Zumbi e da Consciência Negra", date: new Date(year, 10, 20), type: "Feriado Nacional" },
    { name: "Natal", date: new Date(year, 11, 25), type: "Feriado Nacional" },
  ];

  // Calculate Easter (Pascoa) - Meeus/Jones/Butcher algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month - 1, day);
  
  // Carnaval is 47 days before Easter
  const carnaval = new Date(easter);
  carnaval.setDate(easter.getDate() - 47);
  holidays.push({ name: "Carnaval", date: carnaval, type: "Ponto Facultativo" });

  // Good Friday (Sexta-feira Santa) is 2 days before Easter
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({ name: "Sexta-feira Santa", date: goodFriday, type: "Feriado Nacional" });

  // Corpus Christi is 60 days after Easter
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({ name: "Corpus Christi", date: corpusChristi, type: "Ponto Facultativo" });

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function ProjectCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [view, setView] = React.useState<"all" | "holidays">("all");
  const holidays = React.useMemo(() => getBrazilianHolidays(currentMonth.getFullYear()), [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const events = [
    ...holidays.map(h => ({ ...h, isHoliday: true })),
    // Mock other dates for UI demonstration as requested "Dias com evento recebem destaque"
    { name: "Entrega Landing Page", date: new Date(2026, 7, 25), type: "Projeto", isHoliday: false },
  ];

  const filteredEvents = view === "holidays" 
    ? events.filter(e => e.isHoliday)
    : events;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {/* Left Column - Calendar */}
      <Card className="p-6 border-[#E4E6F0] shadow-sm bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-title font-bold text-[#0E0E16]">Calendário</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-full">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="p-0 pointer-events-none"
            classNames={{
              day_today: "bg-[#3D4FE8] text-white rounded-lg",
              day: "h-9 w-9 text-center p-0 font-normal aria-selected:opacity-100",
              outside: "text-[#8A8FA3] opacity-50",
            }}
            modifiers={{
              hasEvent: (date) => events.some(e => isSameDay(e.date, date))
            }}
            modifiersClassNames={{
              hasEvent: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-[#3D4FE8] after:rounded-full relative"
            }}
          />
        </div>
      </Card>

      {/* Right Column - Upcoming Dates */}
      <Card className="p-6 border-[#E4E6F0] shadow-sm bg-white flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-title font-bold text-[#0E0E16]">Próximas datas</h3>
          <div className="flex bg-[#F7F8FC] p-1 rounded-full">
            <button
              onClick={() => setView("all")}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-full transition-all",
                view === "all" ? "bg-white text-[#0E0E16] shadow-sm" : "text-[#8A8FA3]"
              )}
            >
              Todas as datas
            </button>
            <button
              onClick={() => setView("holidays")}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-full transition-all",
                view === "holidays" ? "bg-white text-[#0E0E16] shadow-sm" : "text-[#8A8FA3]"
              )}
            >
              Datas comemorativas
            </button>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-[#E4E6F0]">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-[#F7F8FC] hover:border-[#E4E6F0] transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#F7F8FC] flex items-center justify-center text-[#3D4FE8] group-hover:bg-[#3D4FE8] group-hover:text-white transition-colors">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0E0E16]">{event.name}</h4>
                    <p className="text-[10px] text-[#8A8FA3]">
                      {format(event.date, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-[#F7F8FC] text-[9px] font-bold text-[#8A8FA3]">
                  {event.type}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-[#8A8FA3] text-sm">
              Nenhuma data encontrada
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
