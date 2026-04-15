import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Gift, DollarSign, MoreHorizontal, Loader2, Percent, Tag } from "lucide-react";
import { usePackages, Package, PackageInput } from "@/hooks/usePackages";
import { PackageModal } from "@/components/modals/PackageModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";

export default function Pacotes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const { packages, isLoading, createPackage, updatePackage, deletePackage, isCreating, isUpdating, isDeleting } = usePackages();

  const handleEdit = (pkg: Package) => {
    setSelectedPackage(pkg);
    setModalOpen(true);
  };

  const handleDelete = (pkg: Package) => {
    setSelectedPackage(pkg);
    setDeleteOpen(true);
  };

  const handleSubmit = (data: PackageInput & { id?: string }) => {
    if (data.id) {
      updatePackage(data as PackageInput & { id: string });
    } else {
      createPackage(data);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Gerencie os pacotes de servicos do salao</p>
          <Button className="gap-2" onClick={() => { setSelectedPackage(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Novo Pacote
          </Button>
        </div>

        {packages.length === 0 ? (
          <Card className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pacote cadastrado</p>
              <Button variant="link" onClick={() => { setSelectedPackage(null); setModalOpen(true); }}>
                Criar primeiro pacote
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const items = pkg.package_items || [];
              const totalServices = items.reduce((sum, i) => sum + i.quantity, 0);

              return (
                <Card key={pkg.id} className={`hover:shadow-md transition-shadow ${!pkg.is_active ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Gift className="h-4 w-4 text-primary" />
                          {pkg.name}
                        </CardTitle>
                        {!pkg.is_active && <Badge variant="secondary" className="mt-1">Inativo</Badge>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(pkg)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(pkg)} className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    )}

                    {/* Services list */}
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.service?.name || "Servico"}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(Number(item.unit_price) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Pricing footer */}
                    <div className="border-t pt-3 space-y-1">
                      {Number(pkg.original_price) > 0 && Number(pkg.original_price) !== Number(pkg.price) && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Preco original
                          </span>
                          <span className="line-through text-muted-foreground">
                            {formatCurrency(Number(pkg.original_price))}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-medium flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Preco do pacote
                        </span>
                        <span className="font-bold text-primary">
                          {formatCurrency(Number(pkg.price))}
                        </span>
                      </div>
                      {Number(pkg.discount_percent) > 0 && (
                        <div className="flex justify-end">
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <Percent className="h-3 w-3 mr-1" />
                            {Number(pkg.discount_percent).toFixed(1)}% de desconto
                          </Badge>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      {totalServices} {totalServices === 1 ? "servico" : "servicos"} inclusos
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PackageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        pkg={selectedPackage}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Pacote"
        description={`Tem certeza que deseja excluir "${selectedPackage?.name}"?`}
        onConfirm={() => {
          if (selectedPackage) {
            deletePackage(selectedPackage.id);
            setDeleteOpen(false);
          }
        }}
        isLoading={isDeleting}
      />
    </AppLayoutNew>
  );
}
