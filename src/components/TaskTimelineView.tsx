import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TaskTimelineViewProps {
  tasks: any[];
  stages: any[];
  onSelectTask: (task: any) => void;
}

// Estilo "Cronograma dos projetos" do design system: réguas semanais,
// barras em pílula com título + meta + avatares, sem colunas por dia.
const ROW_HEIGHT = 62;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseCalendarDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatTick(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

function initialsOf(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function TaskTimelineView({ tasks, stages, onSelectTask }: TaskTimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

  const { rangeStart, rangeEnd, totalDays, ticks } = useMemo(() => {
    const today = startOfToday();
    let minDate = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000);
    let maxDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);

    for (const t of tasks) {
      const start = parseCalendarDate(t.raw_start_date) || parseCalendarDate(t.raw_deadline);
      const end = parseCalendarDate(t.raw_deadline) || start;
      if (start && start < minDate) minDate = start;
      if (end && end > maxDate) maxDate = end;
    }

    minDate = new Date(minDate.getTime() - WEEK_MS);
    maxDate = new Date(maxDate.getTime() + WEEK_MS);
    const days = Math.max(7, daysBetween(minDate, maxDate));

    const weekTicks: Date[] = [];
    for (let t = minDate.getTime(); t <= maxDate.getTime(); t += WEEK_MS) {
      weekTicks.push(new Date(t));
    }
    if (weekTicks[weekTicks.length - 1]?.getTime() !== maxDate.getTime()) {
      weekTicks.push(maxDate);
    }

    return { rangeStart: minDate, rangeEnd: maxDate, totalDays: days, ticks: weekTicks };
  }, [tasks]);

  const todayOffsetPct = (daysBetween(rangeStart, startOfToday()) / totalDays) * 100;

  const stageById = useMemo(() => new Map(stages.map((s: any) => [s.id, s])), [stages]);

  const rows = useMemo(() => {
    return tasks
      .map((task: any) => {
        const start = parseCalendarDate(task.raw_start_date) || parseCalendarDate(task.raw_deadline) || rangeStart;
        const end = parseCalendarDate(task.raw_deadline) || start;
        const startPct = Math.max(0, (daysBetween(rangeStart, start) / totalDays) * 100);
        const endDays = daysBetween(rangeStart, end) + 1;
        const spanPct = Math.max(2, ((endDays / totalDays) * 100) - startPct);

        const meta = task.parent_task_title
          ? `Subtarefa de: ${task.parent_task_title}`
          : task.raw_deadline
            ? `Prazo ${task.deadline}`
            : "Sem prazo";

        // Tom padrão é neutro; ganha tinta violeta quando a tarefa faz parte
        // de uma cadeia de dependência (é subtarefa ou tem subtarefas).
        const isLinked = !!task.parent_task_title || (task.subtask_count || 0) > 0;

        return {
          task,
          startPct,
          spanPct,
          meta,
          isLinked,
          stageColor: stageById.get(task.stage)?.color || "var(--ink-4)",
          sortKey: start.getTime(),
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [tasks, rangeStart, totalDays, stageById]);

  const goToToday = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const target = (todayOffsetPct / 100) * el.scrollWidth - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };

  useEffect(() => {
    if (hasAutoScrolled.current) return;
    if (!scrollRef.current || tasks.length === 0) return;
    const el = scrollRef.current;
    const target = (todayOffsetPct / 100) * el.scrollWidth - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
    hasAutoScrolled.current = true;
  }, [tasks.length, todayOffsetPct]);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-[var(--ink-3)] bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-2xl)]">
        Nenhuma tarefa encontrada.
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--line-1)] rounded-[var(--r-2xl)] shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[var(--fs-h3)] font-medium text-[var(--ink-1)]">Cronograma dos projetos</h3>
        <Button variant="outline" size="sm" className="h-8 rounded-full text-xs font-bold border-[var(--line-1)] bg-transparent text-[var(--ink-2)] hover:bg-[var(--surface-3)]" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        <div className="relative min-w-[900px]" style={{ paddingBottom: 26 }}>
          {/* Réguas verticais tracejadas, uma por marca de semana */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${ticks.length}, 1fr)`, bottom: 26 }}>
            {ticks.map((_, i) => (
              <div key={i} className={cn(i > 0 && "border-l border-dashed border-white/[0.06]")} />
            ))}
          </div>

          {/* Linha do dia de hoje */}
          {todayOffsetPct >= 0 && todayOffsetPct <= 100 && (
            <div
              className="absolute top-0 w-px bg-[var(--danger)]/50 pointer-events-none"
              style={{ left: `${todayOffsetPct}%`, bottom: 26 }}
            />
          )}

          {/* Barras */}
          <div className="relative">
            {rows.map(({ task, startPct, spanPct, meta, isLinked, stageColor }) => (
              <div key={task.id} style={{ position: "relative", height: ROW_HEIGHT }}>
                <button
                  onClick={() => onSelectTask(task)}
                  className="absolute top-1 flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--line-1)] shadow-[var(--shadow-card)] text-left hover:brightness-110 transition-[filter]"
                  style={{
                    left: `${startPct}%`,
                    width: `${spanPct}%`,
                    minWidth: 180,
                    padding: "8px 10px 8px 14px",
                    background: isLinked ? "rgba(139,92,246,.18)" : "var(--surface-3)",
                    borderLeft: `3px solid ${stageColor}`,
                  }}
                >
                  <span className="min-w-0">
                    <span className="block leading-tight text-[var(--fs-body-sm)] font-medium text-[var(--ink-1)] whitespace-nowrap overflow-hidden text-ellipsis">
                      {task.title}
                    </span>
                    <span className="block leading-tight mt-0.5 text-[var(--fs-eyebrow)] text-[var(--ink-4)] whitespace-nowrap overflow-hidden text-ellipsis">
                      {meta}
                    </span>
                  </span>
                  {task.assignees?.length > 0 && (
                    <span className="inline-flex items-center shrink-0">
                      {task.assignees.slice(0, 3).map((a: any, i: number) => (
                        <span
                          key={a.id || i}
                          title={a.name}
                          className="inline-flex items-center justify-center rounded-full overflow-hidden text-white"
                          style={{
                            width: 24, height: 24,
                            marginLeft: i ? -8 : 0,
                            background: "var(--surface-4)",
                            color: "var(--ink-2)",
                            fontSize: 10,
                            fontWeight: 500,
                            boxShadow: "0 0 0 2px var(--surface-1)",
                          }}
                        >
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            a.initials || initialsOf(a.name || "")
                          )}
                        </span>
                      ))}
                      {task.assignees.length > 3 && (
                        <span
                          className="inline-flex items-center justify-center rounded-full"
                          style={{
                            width: 24, height: 24, marginLeft: -8,
                            background: "var(--surface-3)", color: "var(--ink-3)",
                            fontSize: 10, fontWeight: 500,
                            boxShadow: "0 0 0 2px var(--surface-1)",
                          }}
                        >
                          +{task.assignees.length - 3}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Marcas de semana */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[var(--fs-eyebrow)] text-[var(--ink-4)]">
            {ticks.map((d, i) => (
              <span key={i}>{formatTick(d)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
