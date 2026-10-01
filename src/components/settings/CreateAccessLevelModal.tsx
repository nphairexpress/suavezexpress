import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button as NpButton } from "@design-system";

interface CreateAccessLevelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; description?: string; color?: string }) => void;
  isCreating: boolean;
}

const COLOR_OPTIONS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
];

export function CreateAccessLevelModal({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateAccessLevelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });

    // Reset form
    setName("");
    setDescription("");
    setColor("#6366f1");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground font-extrabold">Criar Nível de Acesso Personalizado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Auxiliar, Estagiário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as responsabilidades deste nível"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={color === c}
                  className="grid h-11 w-11 place-items-center rounded-full"
                >
                  <span
                    className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-105 ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Após criar o nível, você poderá configurar as permissões específicas.
          </p>

          <DialogFooter className="gap-2">
            <NpButton type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </NpButton>
            <NpButton type="submit" disabled={!name.trim() || isCreating} loading={isCreating}>
              {isCreating ? "Criando..." : "Criar Nível"}
            </NpButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
