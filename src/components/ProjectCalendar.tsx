import React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Star 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function ProjectCalendar({ events: externalEvents = [], birthdays = [] }: { events?: any[], birthdays?: any[] }) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [view, setView] = React.useState<"all" | "commercial">("all");
  const [selectedDateEvents, setSelectedDateEvents] = React.useState<any[] | null>(null);
  
  const holidays = React.useMemo(() => getBrazilianHolidays(currentMonth.getFullYear()), [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const allEvents = React.useMemo(() => {
    return [
      ...holidays.map(h => ({ ...h, category: "Feriado Nacional" })),
      ...externalEvents.map(e => ({ ...e, date: new Date(e.date), category: "Evento" })),
      ...birthdays.map(b => ({ ...b, date: new Date(b.date), category: "Aniversário" }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [holidays, externalEvents, birthdays]);

  const filteredEvents = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let base = allEvents.filter(e => {
      const eDate = new Date(e.date);
      // For repeat annually, adjust year to check correctly
      if (e.repeat_annually) {
        eDate.setFullYear(today.getFullYear());
        if (eDate < today) eDate.setFullYear(today.getFullYear() + 1);
      }
      return eDate >= today;
    });

    if (view === "commercial") {
      return base.filter(e => e.type === "commercial");
    }
    return base;
  }, [allEvents, view]);

  const handleDayClick = (date: Date) => {
    const dayEvents = allEvents.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getDate() === date.getDate() && 
             eDate.getMonth() === date.getMonth() &&
             (e.repeat_annually || eDate.getFullYear() === date.getFullYear());
    });
    if (dayEvents.length > 0) {
      setSelectedDateEvents(dayEvents);
    } else {
      setSelectedDateEvents(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      {/* Left Column - Calendar (occupies 2 cols) */}
      <Card className="lg:col-span-2 p-8 border-[#E4E6F0] shadow-sm bg-white overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-title text-xl font-bold text-[#0E0E16] capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-full border-[#E4E6F0]">
              <ChevronLeft className="h-5 w-5 text-[#8A8FA3]" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10 rounded-full border-[#E4E6F0]">
              <ChevronRight className="h-5 w-5 text-[#8A8FA3]" />
            </Button>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto">
          <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayClick={handleDayClick}
            locale={ptBR}
            className="p-0 w-full"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              caption: "hidden",
              nav: "hidden",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-[#8A8FA3] flex-1 font-bold text-xs uppercase text-center pb-4",
              row: "flex w-full mt-2",
              cell: "flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                "h-16 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-[#F7F8FC] rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
              ),
              day_today: "bg-[#3D4FE8] text-white font-bold rounded-xl hover:bg-[#3D4FE8]/90",
              day_outside: "text-[#8A8FA3] opacity-30",
              day_disabled: "text-[#8A8FA3] opacity-30",
            }}
            modifiers={{
              hasEvent: (date) => allEvents.some(e => {
                const eDate = new Date(e.date);
                return eDate.getDate() === date.getDate() && 
                       eDate.getMonth() === date.getMonth() &&
                       (e.repeat_annually || eDate.getFullYear() === date.getFullYear());
              })
            }}
            modifiersClassNames={{
              hasEvent: "after:content-[''] after:w-1.5 after:h-1.5 after:bg-[#3D4FE8] after:rounded-full after:mt-1 day-today:after:bg-white"
            }}
          />
        </div>

        {selectedDateEvents && (
          <div className="mt-6 p-4 bg-[#F7F8FC] rounded-xl animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-[#8A8FA3] uppercase">Eventos do dia</h4>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDateEvents(null)} className="h-6 w-6 p-0 rounded-full">
                <Star className="h-3 w-3 rotate-45" />
              </Button>
            </div>
            <div className="space-y-2">
              {selectedDateEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#3D4FE8]" />
                  <span className="text-sm font-bold text-[#0E0E16]">{e.name}</span>
                  <Badge variant="outline" className="text-[9px] py-0 h-4 border-[#E4E6F0] text-[#8A8FA3]">{e.category || e.type}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Right Column - Upcoming Dates */}
      <Card className="p-8 border-[#E4E6F0] shadow-sm bg-white flex flex-col h-[500px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-title font-bold text-[#0E0E16]">Próximas datas</h3>
          <div className="flex bg-[#F7F8FC] p-1 rounded-full">
            <button
              onClick={() => setView("all")}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-full transition-all",
                view === "all" ? "bg-white text-[#0E0E16] shadow-sm" : "text-[#8A8FA3]"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setView("commercial")}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-full transition-all",
                view === "commercial" ? "bg-white text-[#0E0E16] shadow-sm" : "text-[#8A8FA3]"
              )}
            >
              Comerciais
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#E4E6F0] flex-1">
          {filteredEvents.length > 0 ? (
            filteredEvents.slice(0, 10).map((event, idx) => {
              const eventDate = new Date(event.date);
              const isNextYear = eventDate.getFullYear() > new Date().getFullYear();
              
              return (
                <div key={idx} className="flex items-center justify-between group p-1">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                      event.type === 'commercial' ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" :
                      event.category === 'Aniversário' ? "bg-pink-50 text-pink-500 group-hover:bg-pink-500 group-hover:text-white" :
                      "bg-[#F7F8FC] text-[#3D4FE8] group-hover:bg-[#3D4FE8] group-hover:text-white"
                    )}>
                      <Star className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0E0E16] line-clamp-1">{event.name}</h4>
                      <p className="text-[10px] text-[#8A8FA3] font-medium">
                        {format(eventDate, "dd 'de' MMMM", { locale: ptBR })}
                        {isNextYear && ` de ${eventDate.getFullYear()}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn(
                    "text-[8px] font-bold px-2 py-0.5 rounded-lg border-none",
                    event.type === 'commercial' ? "bg-amber-100 text-amber-600" :
                    event.category === 'Aniversário' ? "bg-pink-100 text-pink-600" :
                    "bg-[#F7F8FC] text-[#8A8FA3]"
                  )}>
                    {event.category || event.type}
                  </Badge>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="h-12 w-12 rounded-full bg-[#F7F8FC] flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-[#E4E6F0]" />
              </div>
              <p className="text-[#8A8FA3] text-xs font-medium italic">Nenhuma data futura</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
