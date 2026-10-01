import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button as NpButton } from "@design-system";

import {
  AccessLevelWithPermissions,
  PERMISSION_FEATURES,
  PERMISSION_ACTIONS,
} from "@/hooks/useAccessLevels";

interface AccessLevelConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessLevel: AccessLevelWithPermissions | null;
  onUpdatePermission: (data: { accessLevelId: string; permissionKey: string; enabled: boolean }) => void;
  onUpdateAccessLevel: (data: { id: string; name?: string; description?: string; color?: string }) => void;
  isUpdating: boolean;
}

export function AccessLevelConfigModal({
  open,
  onOpenChange,
  accessLevel,
  onUpdatePermission,
  onUpdateAccessLevel,
  isUpdating,
}: AccessLevelConfigModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (accessLevel) {
      setName(accessLevel.name);
    }
  }, [accessLevel]);

  if (!accessLevel) return null;

  const handleNameBlur = () => {
    if (name !== accessLevel.name && name.trim()) {
      onUpdateAccessLevel({ id: accessLevel.id, name: name.trim() });
    }
  };

  const handlePermissionToggle = (permissionKey: string, currentValue: boolean) => {
    onUpdatePermission({
      accessLevelId: accessLevel.id,
      permissionKey,
      enabled: !currentValue,
    });
  };

  const isAdmin = accessLevel.system_key === "admin";
  const isSystem = accessLevel.is_system;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] w-[calc(100vw-24px)] sm:w-full overflow-y-auto overflow-x-hidden grid-cols-[minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl font-extrabold">
            Editar grupo de acesso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <div className="space-y-1.5">
            <Label className="text-sm">
              Qual o <strong>nome</strong> do grupo de acesso? <span className="text-muted-foreground">(Obrigatório)</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              disabled={isAdmin}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Quais acessos gostaria de vincular ao grupo?</Label>
          </div>

          {isAdmin ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              O nível Administrador tem acesso completo e não pode ser modificado.
            </p>
          ) : (
            <div className="h-[450px] max-h-[55vh] max-w-full overflow-auto border border-border rounded-xl">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: "var(--np-surface-glass-strong)" }}>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">
                      Funcionalidades para esse<br />profissional:
                    </th>
                    {PERMISSION_ACTIONS.map(action => (
                      <th key={action.key} className="text-center p-3 font-semibold w-24 text-foreground">
                        {action.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_FEATURES.map((feature, index) => {
                    return (
                      <tr
                        key={feature.key}
                        className={index % 2 === 0 ? "bg-[color:var(--np-surface-inset)]" : ""}
                      >
                        <td className="p-3 text-foreground">{feature.label}</td>
                        {PERMISSION_ACTIONS.map(action => {
                          const permKey = `${feature.key}.${action.key}`;
                          const hasAction = feature.actions.includes(action.key);
                          const isEnabled = accessLevel.permissions[permKey] ?? false;

                          return (
                            <td key={action.key} className="text-center p-0">
                              {hasAction ? (
                                <label className="inline-flex h-11 w-11 items-center justify-center cursor-pointer">
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={() => handlePermissionToggle(permKey, isEnabled)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  aria-label={`${feature.label} - ${action.label}`}
                                />
                                </label>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-4">
          <NpButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </NpButton>
          <NpButton onClick={() => onOpenChange(false)} disabled={isUpdating} loading={isUpdating}>
            {isUpdating ? "Salvando..." : "Salvar"}
          </NpButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
