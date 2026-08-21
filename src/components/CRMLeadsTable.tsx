import React from 'react';
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
  ArrowUpDown
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

export function CRMLeadsTable({ leads, onEdit, onDelete }: CRMLeadsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }: any) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="hover:bg-transparent px-0 font-bold text-xs uppercase text-[#8A8FA3]">
          Nome do lead
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: any) => <div className="font-bold text-[#0E0E16]">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "company",
      header: "EMPRESA",
      cell: ({ row }: any) => <div className="text-[#8A8FA3]">{row.getValue("company") || "-"}</div>,
    },
    {
      accessorKey: "created_at",
      header: "DATA DE CRIAÇÃO",
      cell: ({ row }: any) => (
        <div className="text-[#8A8FA3]">
          {format(new Date(row.getValue("created_at")), "dd/MM/yyyy", { locale: ptBR })}
        </div>
      ),
    },
    {
      accessorKey: "funnel_stage",
      header: "ETAPA ATUAL",
      cell: ({ row }: any) => {
        const stage = STAGES.find(s => s.id === row.getValue("funnel_stage"));
        return (
          <Badge className="bg-[#F7F8FC] text-[#3D4FE8] text-[10px] font-bold border-[#E4E6F0] rounded-full px-3">
            {stage?.label || "N/A"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "funnel_type",
      header: "TIPO DE FUNIL",
      cell: ({ row }: any) => <div className="text-[#8A8FA3]">{row.original.funnel_type?.name || "-"}</div>,
    },
    {
      accessorKey: "recurring_revenue",
      header: "VALOR MRR",
      cell: ({ row }: any) => (
        <div className="font-bold text-[#22C55E]">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.getValue("recurring_revenue") || 0)}
        </div>
      ),
    },
    {
      accessorKey: "one_time_revenue",
      header: "VALOR ÚNICO",
      cell: ({ row }: any) => (
        <div className="text-[#8A8FA3]">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.getValue("one_time_revenue") || 0)}
        </div>
      ),
    },
    {
      accessorKey: "responsible",
      header: "RESPONSÁVEL",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#3D4FE8] flex items-center justify-center text-[10px] text-white font-bold">
            {row.original.responsible?.full_name?.charAt(0) || "?"}
          </div>
          <span className="text-xs text-[#8A8FA3]">{row.original.responsible?.full_name || "Sem resp."}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "AÇÕES",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[#8A8FA3] hover:text-[#3D4FE8] hover:bg-[#3D4FE8]/10 rounded-full"
            onClick={() => onConvert(row.original)}
            title="Converter em Cliente"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[#8A8FA3] hover:text-[#3D4FE8] hover:bg-[#3D4FE8]/10 rounded-full"
            onClick={() => onEdit(row.original)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[#8A8FA3] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-full"
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
          <h3 className="text-lg font-title font-bold text-[#0E0E16]">Todas as Negociações</h3>
          <Badge className="bg-[#F7F8FC] text-[#8A8FA3] text-xs font-bold border-[#E4E6F0] rounded-full">
            {table.getFilteredRowModel().rows.length} negociações
          </Badge>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
          <Input 
            placeholder="Buscar por nome ou empresa..." 
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10 rounded-full border-[#E4E6F0] bg-white text-sm focus:ring-[#3D4FE8]"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E4E6F0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-[#F7F8FC]">
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-[#E4E6F0]">
                {headerGroup.headers.map((header: any) => (
                  <TableHead key={header.id} className="h-12 text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider px-6">
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
                  className="hover:bg-[#F7F8FC]/50 border-[#E4E6F0] transition-colors"
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-[#8A8FA3]">
                  Nenhuma negociação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-[#8A8FA3]">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full border-[#E4E6F0] text-[#8A8FA3] hover:text-[#3D4FE8] hover:bg-[#3D4FE8]/10"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full border-[#E4E6F0] text-[#8A8FA3] hover:text-[#3D4FE8] hover:bg-[#3D4FE8]/10"
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
