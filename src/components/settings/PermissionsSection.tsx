import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppRole } from "@/contexts/AuthContext";
import { useSalonPermissions, PERMISSION_KEYS, PERMISSION_LABELS } from "@/hooks/useSalonPermissions";

const ROLE_COLUMNS: { role: AppRole; label: string }[] = [
  { role: "admin", label: "Administrador" },
  { role: "financial", label: "Financeiro" },
  { role: "manager", label: "Gerente" },
  { role: "receptionist", label: "Recepcionista" },
  { role: "professional", label: "Profissional" },
];

export function PermissionsSection() {
  const { rows, available, isLoading, updateRoles } = useSalonPermissions();
  const { toast } = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando permissões...
      </div>
    );
  }

  if (!available) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Permissões configuráveis ainda não ativadas neste sistema.
        </CardContent>
      </Card>
    );
  }

  // Chaves conhecidas primeiro (na ordem do rótulo); qualquer chave extra do banco vai no fim.
  const keys = [
    ...PERMISSION_KEYS.filter((k) => rows.some((r) => r.permission_key === k)),
    ...rows.map((r) => r.permission_key).filter((k) => !PERMISSION_KEYS.includes(k)),
  ];

  const handleToggle = async (permissionKey: string, role: AppRole, checked: boolean) => {
    const row = rows.find((r) => r.permission_key === permissionKey);
    if (!row) return;
    const current = row.roles.filter((r) => r !== "admin");
    const next = checked ? [...current, role] : current.filter((r) => r !== role);
    const roles: AppRole[] = ["admin", ...ROLE_COLUMNS.map((c) => c.role).filter((r) => r !== "admin" && next.includes(r))];
    setSavingKey(permissionKey);
    try {
      await updateRoles(permissionKey, roles);
      toast({ title: "Permissão atualizada", description: PERMISSION_LABELS[permissionKey] ?? permissionKey });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message ?? "Tente novamente", variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões por nível de acesso</CardTitle>
        <CardDescription>
          Marque quem pode fazer cada ação. A alteração vale imediatamente para todos os usuários do salão,
          inclusive no banco de dados. Administrador sempre pode tudo.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              {ROLE_COLUMNS.map((c) => (
                <TableHead key={c.role} className="text-center whitespace-nowrap">{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => {
              const row = rows.find((r) => r.permission_key === key);
              const isSaving = savingKey === key;
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    {PERMISSION_LABELS[key] ?? key}
                    <div className="text-xs text-muted-foreground font-mono">{key}</div>
                  </TableCell>
                  {ROLE_COLUMNS.map((c) => {
                    const isAdminCol = c.role === "admin";
                    const checked = isAdminCol || !!row?.roles.includes(c.role);
                    return (
                      <TableCell key={c.role} className="text-center">
                        <Checkbox
                          checked={checked}
                          disabled={isAdminCol || isSaving || !!savingKey}
                          onCheckedChange={(v) => handleToggle(key, c.role, v === true)}
                          aria-label={`${PERMISSION_LABELS[key] ?? key} - ${c.label}`}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
