// @ts-nocheck
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useProfessionalCommissions, CommissionInput } from "@/hooks/useProfessionalCommissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";

interface ProfessionalCommissionsTabProps {
  professionalId: string;
  defaultCommission: number;
  packageCommission?: number;
  onPackageCommissionChange?: (value: number) => void;
}

interface CategoryCommission {
  category: string;
  selected: boolean;
  commission_percent: number;
  assistant_commission_percent: number;
  duration_minutes: number;
}

export function ProfessionalCommissionsTab({ professionalId, defaultCommission, packageCommission = 0, onPackageCommissionChange }: ProfessionalCommissionsTabProps) {
  const { services, isLoading: loadingServices } = useServices();
  const { commissions, isLoading: loadingCommissions, bulkUpsertCommissions, isUpserting } = useProfessionalCommissions(professionalId);

  const [categoryData, setCategoryData] = useState<CategoryCommission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [localPackageCommission, setLocalPackageCommission] = useState(packageCommission);

  useEffect(() => {
    setLocalPackageCommission(packageCommission);
  }, [packageCommission]);

  // Get unique categories from services
  const categories = [...new Set(services.map(s => s.category || "Sem Categoria"))];

  // Initialize category data
  useEffect(() => {
    const initialData: CategoryCommission[] = categories.map(category => {
      // Find services in this category
      const categoryServices = services.filter(s => (s.category || "Sem Categoria") === category);
      
      // Check if any service in this category has commission configured
      const existingCommissions = commissions.filter(c => 
        categoryServices.some(s => s.id === c.service_id)
      );

      const hasSelected = existingCommissions.length > 0;
      const avgCommission = hasSelected 
        ? existingCommissions.reduce((sum, c) => sum + c.commission_percent, 0) / existingCommissions.length 
        : defaultCommission;
      const avgAssistant = hasSelected 
        ? existingCommissions.reduce((sum, c) => sum + ((c as any).assistant_commission_percent || 0), 0) / existingCommissions.length 
        : 0;
      const avgDuration = hasSelected 
        ? existingCommissions.reduce((sum, c) => sum + ((c as any).duration_minutes || 0), 0) / existingCommissions.length 
        : 0;

      return {
        category,
        selected: hasSelected,
        commission_percent: avgCommission,
        assistant_commission_percent: avgAssistant,
        duration_minutes: avgDuration,
      };
    });

    setCategoryData(initialData);
    setHasChanges(false);
  }, [commissions, services, defaultCommission, categories.length]);

  const handleCategoryChange = (category: string, field: keyof CategoryCommission, value: any) => {
    setCategoryData(prev => prev.map(item => 
      item.category === category ? { ...item, [field]: value } : item
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    const inputs: CommissionInput[] = [];
    
    categoryData.forEach(catData => {
      if (catData.selected) {
        const categoryServices = services.filter(s => (s.category || "Sem Categoria") === catData.category);
        categoryServices.forEach(service => {
          inputs.push({
            professional_id: professionalId,
            service_id: service.id,
            commission_percent: catData.commission_percent,
            assistant_commission_percent: catData.assistant_commission_percent,
            duration_minutes: catData.duration_minutes,
          });
        });
      }
    });

    if (inputs.length > 0) {
      bulkUpsertCommissions(inputs);
    }
    setHasChanges(false);
  };

  if (loadingServices || loadingCommissions) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum serviço cadastrado. <Link to="/servicos" className="text-primary underline">Cadastre serviços primeiro</Link>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Selecione as categorias de serviço desse profissional e qual o valor de comissão que ele deve receber.
        </p>
        <p className="text-sm text-muted-foreground">
          Obs.: Não encontrou a categoria do profissional?{" "}
          <Link to="/servicos" className="text-primary underline">Clique aqui</Link> para cadastrá-la!
        </p>
      </div>

      {/* Package commission per professional */}
      {onPackageCommissionChange && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Comissão sobre venda de Pacotes</p>
              <p className="text-xs text-muted-foreground">Percentual que este profissional recebe ao vender um pacote</p>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={localPackageCommission}
                onChange={(e) => setLocalPackageCommission(parseFloat(e.target.value) || 0)}
                onBlur={() => {
                  if (localPackageCommission !== packageCommission) {
                    onPackageCommissionChange(localPackageCommission);
                  }
                }}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-48">Categoria</TableHead>
              <TableHead className="text-center">Comissão</TableHead>
              <TableHead className="text-center">Comissão Assistente</TableHead>
              <TableHead className="text-center">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryData.map((item) => (
              <TableRow key={item.category}>
                <TableCell>
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(item.category, "selected", checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell className="font-medium">{item.category}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={item.commission_percent}
                      onChange={(e) => 
                        handleCategoryChange(item.category, "commission_percent", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 text-center"
                      disabled={!item.selected}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={item.assistant_commission_percent}
                      onChange={(e) => 
                        handleCategoryChange(item.category, "assistant_commission_percent", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 text-center"
                      disabled={!item.selected}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={item.duration_minutes}
                      onChange={(e) => 
                        handleCategoryChange(item.category, "duration_minutes", parseInt(e.target.value) || 0)
                      }
                      className="w-20 text-center"
                      disabled={!item.selected}
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setHasChanges(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isUpserting}>
          {isUpserting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
