import React from 'react';
import { cn } from "@/lib/utils";
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel
} from "@tanstack/react-table";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowRightLeft
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STAGES } from "@/lib/leads.functions";
import { Badge } from "@/components/ui/badge";

interface CRMLeadsTableProps {
  leads: any[];
  onEdit: (lead: any) => void;
  onDelete: (lead: any) => void;
  onConvert: (lead: any) => void;
}

export function CRMLeadsTable({ leads, onEdit, onDelete, onConvert }: CRMLeadsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }: any) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="hover:bg-transparent px-0 font-bold text-xs uppercase text-[var(--ink-3)]">
          Nome do lead
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: any) => <div className="font-bold text-[var(--ink-1)]">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "company",
      header: "EMPRESA",
      cell: ({ row }: any) => <div className="text-[var(--ink-3)]">{row.getValue("company") || "-"}</div>,
    },
    {
      accessorKey: "created_at",
      header: "DATA DE CRIAÇÃO",
      cell: ({ row }: any) => (
        <div className="text-[var(--ink-3)]">
          {format(new Date(row.getValue("created_at")), "dd/MM/yyyy", { locale: ptBR })}
        </div>
      ),
    },
    {
      accessorKey: "funnel_stage",
      header: "ETAPA ATUAL",
      cell: ({ row }: any) => {
        const stage = STAGES.find(s => s.id === row.getValue("funnel_stage"));
        const isConverted = !!row.original.converted_at;
        return (
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "text-[10px] font-bold rounded-full px-3",
              isConverted 
                ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" 
                : "bg-[var(--surface-2)] text-[var(--violet-500)] border-[var(--line-1)]"
            )}>
              {isConverted ? "Convertido" : (stage?.label || "N/A")}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "funnel_type",
      header: "TIPO DE FUNIL",
      cell: ({ row }: any) => <div className="text-[var(--ink-3)]">{row.original.funnel_type?.name || "-"}</div>,
    },
    {
      accessorKey: "recurring_revenue",
      header: "VALOR MRR",
      cell: ({ row }: any) => (
        <div className="font-bold text-[var(--success)]">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.getValue("recurring_revenue") || 0)}
        </div>
      ),
    },
    {
      accessorKey: "one_time_revenue",
      header: "VALOR ÚNICO",
      cell: ({ row }: any) => (
        <div className="text-[var(--ink-3)]">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.getValue("one_time_revenue") || 0)}
        </div>
      ),
    },
    {
      accessorKey: "responsible",
      header: "RESPONSÁVEL",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[var(--violet-500)] flex items-center justify-center text-[10px] text-white font-bold">
            {row.original.responsible?.full_name?.charAt(0) || "?"}
          </div>
          <span className="text-xs text-[var(--ink-3)]">{row.original.responsible?.full_name || "Sem resp."}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "AÇÕES",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          {!row.original.converted_at && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--violet-500)] hover:bg-[var(--violet-500)]/10 rounded-full"
              onClick={() => onConvert(row.original)}
              title="Converter em Cliente"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--violet-500)] hover:bg-[var(--violet-500)]/10 rounded-full"
            onClick={() => onEdit(row.original)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-full"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], [onEdit, onDelete, onConvert]);

  const table = useReactTable({
    data: leads,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row: any, columnId: any, filterValue: any) => {
      const name = String(row.original.name || "").toLowerCase();
      const company = String(row.original.company || "").toLowerCase();
      const search = String(filterValue).toLowerCase();
      return name.includes(search) || company.includes(search);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-title font-bold text-[var(--ink-1)]">Todas as Negociações</h3>
          <Badge className="bg-[var(--surface-2)] text-[var(--ink-3)] text-xs font-bold border-[var(--line-1)] rounded-full">
            {table.getFilteredRowModel().rows.length} negociações
          </Badge>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-3)]" />
          <Input 
            placeholder="Buscar por nome ou empresa..." 
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-sm focus:ring-[var(--violet-500)]"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line-1)] bg-[var(--surface-1)] overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-[var(--surface-2)]">
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-[var(--line-1)]">
                {headerGroup.headers.map((header: any) => (
                  <TableHead key={header.id} className="h-12 text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider px-6">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-[var(--surface-2)]/50 border-[var(--line-1)] transition-colors"
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell key={cell.id} className="px-6 py-4 text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[var(--ink-3)]">
                  Nenhuma negociação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-[var(--ink-3)]">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full border-[var(--line-1)] text-[var(--ink-3)] hover:text-[var(--violet-500)] hover:bg-[var(--violet-500)]/10"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full border-[var(--line-1)] text-[var(--ink-3)] hover:text-[var(--violet-500)] hover:bg-[var(--violet-500)]/10"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
