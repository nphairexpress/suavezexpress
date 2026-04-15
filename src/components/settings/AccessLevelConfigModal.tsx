import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
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
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl">
            Editar grupo de acesso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <ScrollArea className="h-[450px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">
                      Funcionalidades para esse<br />profissional:
                    </th>
                    {PERMISSION_ACTIONS.map(action => (
                      <th key={action.key} className="text-center p-3 font-semibold w-24">
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
                        className={index % 2 === 0 ? "bg-muted/30" : ""}
                      >
                        <td className="p-3">{feature.label}</td>
                        {PERMISSION_ACTIONS.map(action => {
                          const permKey = `${feature.key}.${action.key}`;
                          const hasAction = feature.actions.includes(action.key);
                          const isEnabled = accessLevel.permissions[permKey] ?? false;

                          return (
                            <td key={action.key} className="text-center p-3">
                              {hasAction ? (
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={() => handlePermissionToggle(permKey, isEnabled)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
