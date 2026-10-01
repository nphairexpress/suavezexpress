import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, GlassCard, EmptyState, Button as DsButton } from "@design-system";
import { tableHead } from "@/components/clients/clientsUi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Loader2, Merge, FileText, Settings, MessageCircle, Upload } from "lucide-react";
import { useClients, Client, ClientInput } from "@/hooks/useClients";
import { ClientModal } from "@/components/modals/ClientModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { ImportModal, ImportField } from "@/components/modals/ImportModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSalonPermissions } from "@/hooks/useSalonPermissions";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Clientes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("nome");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);

  const { clients, isLoading, createClient, updateClient, deleteClient, isCreating, isUpdating, isDeleting } = useClients();
  const { isMaster, salonId } = useAuth();
  const { pode } = useSalonPermissions();
  const canViewCpf = pode("cliente.ver_cpf");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clientImportFields: ImportField[] = [
    { key: "name", label: "Nome", required: true },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefone" },
    { key: "phone_landline", label: "Telefone fixo" },
    { key: "cpf", label: "CPF" },
    { key: "rg", label: "RG" },
    { key: "birth_date", label: "Data de nascimento" },
    { key: "gender", label: "Gênero" },
    { key: "cep", label: "CEP" },
    { key: "state", label: "Estado" },
    { key: "city", label: "Cidade" },
    { key: "neighborhood", label: "Bairro" },
    { key: "address", label: "Endereço" },
    { key: "address_number", label: "Número" },
    { key: "address_complement", label: "Complemento" },
    { key: "profession", label: "Profissão" },
    { key: "how_met", label: "Como conheceu" },
    { key: "notes", label: "Observações" },
  ];

  const parseBirthDate = (value: any): string | null => {
    if (!value) return null;
    const str = String(value).trim();
    // DD/MM/YYYY or DD-MM-YYYY
    const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      const y = parseInt(year);
      if (y < 1900 || y > 2100) return null;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // YYYY-MM-DD (already correct)
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) return str;
    // Excel serial date number
    if (/^\d{4,5}$/.test(str)) {
      const serial = parseInt(str);
      const date = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return null;
  };

  const handleImportClients = async (records: Record<string, any>[]) => {
    if (!salonId) throw new Error("Salão não encontrado");
    const rows = records.map(r => ({
      salon_id: salonId,
      name: String(r.name),
      email: r.email ? String(r.email) : null,
      phone: r.phone ? String(r.phone) : null,
      phone_landline: r.phone_landline ? String(r.phone_landline) : null,
      cpf: r.cpf ? String(r.cpf) : null,
      rg: r.rg ? String(r.rg) : null,
      birth_date: parseBirthDate(r.birth_date),
      gender: r.gender ? String(r.gender).toLowerCase() : null,
      cep: r.cep ? String(r.cep) : null,
      state: r.state ? String(r.state) : null,
      city: r.city ? String(r.city) : null,
      neighborhood: r.neighborhood ? String(r.neighborhood) : null,
      address: r.address ? String(r.address) : null,
      address_number: r.address_number ? String(r.address_number) : null,
      address_complement: r.address_complement ? String(r.address_complement) : null,
      profession: r.profession ? String(r.profession) : null,
      how_met: r.how_met ? String(r.how_met) : null,
      notes: r.notes ? String(r.notes) : null,
    }));

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from("clients").insert(batch);
      if (error) throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast({ title: `${rows.length} clientes importados com sucesso!` });
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    switch (searchField) {
      case "nome":
        return client.name.toLowerCase().includes(query);
      case "email":
        return client.email?.toLowerCase().includes(query);
      case "telefone":
        return client.phone?.includes(query);
      default:
        return client.name.toLowerCase().includes(query);
    }
  });

  const totalPages = Math.ceil(filteredClients.length / parseInt(itemsPerPage));
  const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
  const paginatedClients = filteredClients.slice(startIndex, startIndex + parseInt(itemsPerPage));

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteOpen(true);
  };

  const handleSubmit = (data: ClientInput & { id?: string }) => {
    if (data.id) {
      updateClient(data as ClientInput & { id: string });
    } else {
      createClient(data);
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const formatBirthday = (date: string | null) => {
    if (!date) return "";
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getGenderLabel = (gender: string | null) => {
    const genderMap: Record<string, string> = {
      feminino: "Feminino",
      masculino: "Masculino",
      outro: "Outro",
      nao_informar: "Prefiro não dizer",
    };
    return gender ? genderMap[gender] || "" : "";
  };

  const openWhatsApp = (client: Client) => {
    if (!client.phone) return;
    
    // Remove non-numeric characters
    const phoneNumber = client.phone.replace(/\D/g, "");
    const fullNumber = phoneNumber.startsWith("55") ? phoneNumber : `55${phoneNumber}`;
    
    // Creative pre-programmed message
    const firstName = client.name.split(" ")[0];
    const message = encodeURIComponent(
      `Olá ${firstName}! 👋\n\nTudo bem? Passando aqui para saber como você está! ✨\n\nEstamos com novidades incríveis por aqui e adoraríamos te ver novamente! 💇‍♀️\n\nPodemos agendar um horário para você? Estamos te esperando! 💕`
    );
    
    window.open(`https://wa.me/${fullNumber}?text=${message}`, "_blank");
  };

  if (isLoading) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Clientes"
          title="Clientes"
          description="Cadastro, contato e histórico de quem passa pelo salão."
          actions={
            <>
              <DsButton
                variant="primary"
                icon={Plus}
                className="min-h-[48px] sm:min-h-0"
                onClick={() => { setSelectedClient(null); setModalOpen(true); }}
              >
                Adicionar Cliente
              </DsButton>
              {isMaster && (
                <DsButton variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>
                  Importar
                </DsButton>
              )}
              <DsButton variant="secondary" icon={Merge}>
                Unir cadastros duplicados
              </DsButton>
              <DsButton variant="secondary" icon={Settings}>
                Anamnese
              </DsButton>
              <DsButton variant="secondary" icon={FileText}>
                Prontuário
              </DsButton>
            </>
          }
        />

        <GlassCard padding={0} className="overflow-hidden">
          {/* Filters row */}
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar</span>
              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                <SelectTrigger className="h-11 w-[76px] tabular-nums">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">por página</span>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="h-11 w-[112px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar Cliente" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="h-11 w-full pl-9 sm:w-[240px]"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredClients.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Não encontramos nenhum resultado."
              className="py-12"
              action={
                <DsButton variant="ghost" onClick={() => { setSelectedClient(null); setModalOpen(true); }}>
                  Adicionar primeiro cliente
                </DsButton>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className={tableHead}>
                    Nome ▼
                  </TableHead>
                  <TableHead className={tableHead}>
                    Contato ▼
                  </TableHead>
                  {canViewCpf && (
                    <TableHead className={`${tableHead} hidden md:table-cell`}>
                      Aniversário ▼
                    </TableHead>
                  )}
                  <TableHead className={`${tableHead} hidden lg:table-cell`}>
                    Gênero ▼
                  </TableHead>
                  <TableHead className={`${tableHead} hidden xl:table-cell`}>
                    Observação ▼
                  </TableHead>
                  <TableHead className={`${tableHead} text-right`}>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer border-border hover:bg-[var(--np-surface-inset)]" onClick={() => handleEdit(client)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-[color:var(--np-avatar-ring)]">
                          {client.avatar_url && (
                            <AvatarImage src={client.avatar_url} alt={client.name} />
                          )}
                          <AvatarFallback className="bg-[var(--np-surface-inset-hover)] text-sm font-bold text-foreground [font-family:var(--np-font-display)]">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground hover:underline cursor-pointer">
                          {client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Cel:</span>
                            <span className="tabular-nums text-foreground">{client.phone}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 shrink-0 rounded-full bg-[var(--np-positive)] text-[color:var(--np-text-on-accent)] hover:bg-[var(--np-positive)] hover:text-[color:var(--np-text-on-accent)] hover:brightness-110"
                              onClick={() => openWhatsApp(client)}
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {client.email && (
                          <div className="text-sm text-muted-foreground break-all">
                            <span>E-mail: </span>
                            <span>{client.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {canViewCpf && (
                      <TableCell className="hidden md:table-cell text-foreground">
                        {formatBirthday(client.birth_date)}
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell text-foreground">
                      {getGenderLabel(client.gender)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-w-[300px]">
                      <span className="text-sm text-muted-foreground truncate block">
                        {client.notes}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          aria-label="Editar cliente"
                          className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-[var(--np-surface-inset-hover)] hover:text-foreground sm:h-9 sm:w-9"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {pode("cliente.excluir") && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            aria-label="Excluir cliente"
                            className="h-11 w-11 rounded-xl bg-[var(--np-danger-soft)] text-[color:var(--np-danger-text)] hover:bg-[var(--np-danger-solid)] hover:text-[color:var(--np-text-on-danger)] sm:h-9 sm:w-9"
                            onClick={() => handleDelete(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
            <span className="tabular-nums">
              Mostrando {startIndex + 1} a {Math.min(startIndex + parseInt(itemsPerPage), filteredClients.length)} de {filteredClients.length} Registros
            </span>
            <div className="flex items-center gap-2">
              <DsButton 
                variant="secondary" 
                size="sm"
                className="min-h-[44px] sm:min-h-0"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ← Anterior
              </DsButton>
              <span className="grid h-9 min-w-9 place-items-center rounded-full bg-[var(--np-accent-soft)] px-3 font-bold tabular-nums text-[color:var(--np-accent-text)] [font-family:var(--np-font-display)]">{currentPage}</span>
              <DsButton 
                variant="secondary" 
                size="sm"
                className="min-h-[44px] sm:min-h-0"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Próximo →
              </DsButton>
            </div>
          </div>
        </GlassCard>
      </div>

      <ClientModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        client={selectedClient} 
        onSubmit={handleSubmit} 
        isLoading={isCreating || isUpdating} 
      />
      <DeleteConfirmModal 
        open={deleteOpen} 
        onOpenChange={setDeleteOpen} 
        title="Excluir Cliente" 
        description={`Tem certeza que deseja excluir "${selectedClient?.name}"?`} 
        onConfirm={() => { 
          if (selectedClient) { 
            deleteClient(selectedClient.id); 
            setDeleteOpen(false); 
          } 
        }} 
        isLoading={isDeleting} 
      />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importar Clientes"
        description="Importe clientes de uma planilha XLS, XLSX ou CSV exportada de outro sistema."
        fields={clientImportFields}
        onImport={handleImportClients}
      />
    </AppLayoutNew>
  );
}
