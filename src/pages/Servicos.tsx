import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Clock, DollarSign, MoreHorizontal, Loader2, Upload, Search, FileText, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useServices, Service, ServiceInput } from "@/hooks/useServices";
import { ServiceModal } from "@/components/modals/ServiceModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { ImportModal, ImportField } from "@/components/modals/ImportModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { brl } from "@design-system";

const GLASS = "rounded-2xl border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass)] text-foreground shadow-[var(--np-shadow-glass)] backdrop-blur-xl";

export default function Servicos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { services, isLoading, createService, updateService, deleteService, restoreService, isCreating, isUpdating, isDeleting } = useServices({ includeArchived: showArchived });
  const { isMaster, salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const serviceImportFields: ImportField[] = [
    { key: "name", label: "Nome", required: true },
    { key: "description", label: "Descrição" },
    { key: "duration_minutes", label: "Duração (minutos)", required: true },
    { key: "price", label: "Preço", required: true },
    { key: "category", label: "Categoria" },
    { key: "commission_percent", label: "Comissão (%)" },
  ];

  const handleImportServices = async (records: Record<string, any>[]) => {
    if (!salonId) throw new Error("Salão não encontrado");
    const rows = records.map(r => ({
      salon_id: salonId,
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      duration_minutes: parseInt(String(r.duration_minutes)) || 30,
      price: parseFloat(String(r.price).replace(",", ".")) || 0,
      category: r.category ? String(r.category) : null,
      commission_percent: r.commission_percent ? parseFloat(String(r.commission_percent).replace(",", ".")) : 0,
      is_active: true,
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from("services").insert(batch);
      if (error) throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["services"] });
    toast({ title: `${rows.length} serviços importados com sucesso!` });
  };

  const handleEdit = (service: Service) => { setSelectedService(service); setModalOpen(true); };
  const handleDelete = (service: Service) => { setSelectedService(service); setDeleteOpen(true); };

  const handleSubmit = (data: ServiceInput & { id?: string }) => {
    if (data.id) updateService(data as ServiceInput & { id: string });
    else createService(data);
  };

  const formatDuration = (min: number) => min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ""}` : `${min}min`;

  const filteredServices = services.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q);
  });

  const handleExportPDF = async () => {
    // jspdf/autotable só baixam quando o usuário exporta (ficam fora do bundle inicial)
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Lista de Serviços", 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Serviço", "Categoria", "Duração", "Preço (R$)", "Comissão (%)"]],
      body: filteredServices.map(s => [
        s.name,
        s.category || "-",
        formatDuration(s.duration_minutes),
        `R$ ${Number(s.price).toFixed(2)}`,
        `${Number(s.commission_percent) || 0}%`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] },
    });
    doc.save("Servicos.pdf");
  };

  const handleExportXLS = async () => {
    const XLSX = await import("xlsx");
    const data = filteredServices.map(s => ({
      "Serviço": s.name,
      "Categoria": s.category || "",
      "Duração (min)": s.duration_minutes,
      "Preço (R$)": Number(s.price),
      "Comissão (%)": Number(s.commission_percent) || 0,
      "Ativo": s.is_active ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Serviços");
    XLSX.writeFile(wb, "Servicos.xlsx");
  };

  if (isLoading) {
    return <AppLayoutNew><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AppLayoutNew>;
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-muted-foreground">Gerencie os serviços oferecidos pelo salão</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-11 gap-2 border-border bg-transparent hover:bg-[color:var(--np-surface-inset-hover)]" onClick={handleExportPDF}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="h-11 gap-2 border-border bg-transparent hover:bg-[color:var(--np-surface-inset-hover)]" onClick={handleExportXLS}>
              <FileSpreadsheet className="h-4 w-4" />
              XLS
            </Button>
            {isMaster && (
              <Button variant="outline" className="h-11 gap-2 border-border bg-transparent hover:bg-[color:var(--np-surface-inset-hover)]" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            )}
            <Button className="h-11 gap-2 font-semibold" onClick={() => { setSelectedService(null); setModalOpen(true); }}><Plus className="h-4 w-4" />Novo Serviço</Button>
          </div>
        </div>
        {services.length === 0 ? (
          <Card className={`${GLASS} flex items-center justify-center py-12`}>
            <div className="text-center text-muted-foreground">
              <p>Nenhum serviço cadastrado</p>
              <Button variant="link" onClick={() => { setSelectedService(null); setModalOpen(true); }}>Adicionar primeiro serviço</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço por nome ou categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
                <Label htmlFor="show-archived" className="cursor-pointer text-sm">Mostrar arquivados</Label>
              </div>
            </div>
            <Card className={`${GLASS} overflow-hidden`}>
              <CardContent className="p-0">
                <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[color:var(--np-divider)] bg-[color:var(--np-surface-inset)] np-caps">
                  <span className="flex-1">Serviço</span>
                  <span className="hidden w-16 text-center sm:block">Duração</span>
                  <span className="w-24 text-right">Preço</span>
                  <span className="hidden w-16 text-right sm:block">Comissão</span>
                  <span className="w-8"></span>
                </div>
                <div className="divide-y divide-[color:var(--np-divider)]">
                  {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        className={`flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-[color:var(--np-surface-glass-hover)] transition-colors sm:gap-4 cursor-pointer ${!service.is_active ? "opacity-50" : ""}`}
                        onClick={() => handleEdit(service)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate text-foreground">{service.name}</span>
                            {service.category && <Badge variant="outline" className="text-xs shrink-0 border-border text-muted-foreground">{service.category}</Badge>}
                            {!service.is_active && <Badge variant="secondary" className="text-xs shrink-0 border-transparent bg-[color:var(--np-accent-soft)] text-[color:var(--np-accent-text)]">Arquivado</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-sm sm:gap-4">
                          <span className="hidden items-center gap-1 text-muted-foreground w-16 justify-center sm:flex">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                          <span className="np-num w-24 text-right tabular-nums text-foreground">
                            {brl(Number(service.price))}
                          </span>
                          <span className="hidden text-muted-foreground w-16 text-right tabular-nums sm:block">
                            {Number(service.commission_percent) || 0}%
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Ações" className="h-11 w-11" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(service); }}>Editar</DropdownMenuItem>
                              {service.is_active ? (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(service); }} className="text-destructive">Excluir</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); restoreService(service.id); }} className="text-[color:var(--np-positive-text)]">Reativar</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  {filteredServices.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum serviço encontrado para "{searchQuery}"
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <ServiceModal open={modalOpen} onOpenChange={setModalOpen} service={selectedService} onSubmit={handleSubmit} isLoading={isCreating || isUpdating} />
      <DeleteConfirmModal open={deleteOpen} onOpenChange={setDeleteOpen} title="Excluir Serviço" description={`Tem certeza que deseja excluir "${selectedService?.name}"?`} onConfirm={() => { if (selectedService) { deleteService(selectedService.id); setDeleteOpen(false); } }} isLoading={isDeleting} />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importar Serviços"
        description="Importe serviços de uma planilha XLS, XLSX ou CSV exportada de outro sistema."
        fields={serviceImportFields}
        onImport={handleImportServices}
      />
    </AppLayoutNew>
  );
}