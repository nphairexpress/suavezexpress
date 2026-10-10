import { Clock } from "lucide-react";
import type { FilaAbertura } from "@/hooks/usePublicQueue";
import { textoAvisoFila } from "@/lib/filaAviso";

// Aviso informativo (nunca bloqueia): aparece só quando a fila está fora do horário.
export function FilaAviso({ fila, className = "" }: { fila: FilaAbertura; className?: string }) {
  const texto = textoAvisoFila(fila);
  if (!texto) return null;
  return (
    <div
      role="status"
      className={`rounded-2xl border border-[color:var(--np-accent-border)] bg-[color:var(--np-accent-soft)] px-4 py-3 text-center text-sm text-foreground ${className}`}
    >
      <Clock className="mx-auto mb-1 h-4 w-4 text-[color:var(--np-accent-text)]" />
      <p>{texto}</p>
    </div>
  );
}
