import * as React from "react";
import { Icon } from "./Icon";
import { cx } from "../../lib/cx";

/*
 * Parte do acervo "ig-codexr-file-upload-button" (@code.xr): pílula com o nome do arquivo à
 * esquerda e o bloco de ação à direita; ao enviar, o bloco expande para a pílula inteira
 * (0,45 s cubic-bezier(.65,0,.35,1)), aparece "Enviando…" com barra de progresso no rodapé
 * e termina em "Enviado" com check; o texto entra com o "pop" (scale 0 → 1, y 20 → 0, 0,4 s).
 * Cores do export: bloco âmbar (texto preto), concluído em verde, barra escura sobre âmbar.
 */

export type UploadState = "idle" | "uploading" | "done";

export interface UploadButtonProps {
  label?: string;
  uploadingLabel?: string;
  doneLabel?: string;
  /** Texto à esquerda antes do envio (nome do arquivo ou instrução) */
  fileName?: string;
  accept?: string;
  onFile?: (file: File) => void;
  /** Simula o envio sem abrir o seletor (vitrine/protótipo) */
  demo?: boolean;
  /** Controla o estado externamente */
  state?: UploadState;
  /** 0–100, quando controlado */
  progress?: number;
  /** Duração da simulação em ms */
  duration?: number;
  disabled?: boolean;
  /** Erro de envio: borda e texto vermelhos */
  error?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UploadButton({
  label = "Enviar",
  uploadingLabel = "Enviando…",
  doneLabel = "Enviado",
  fileName = "Comprovante.pdf",
  accept,
  onFile,
  demo = false,
  state,
  progress,
  duration = 2200,
  disabled = false,
  error,
  className,
  style,
}: UploadButtonProps) {
  const [stage, setStage] = React.useState<UploadState>("idle");
  const [pct, setPct] = React.useState(0);
  const timers = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cur = state ?? stage;
  const shown = progress ?? pct;

  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const run = () => {
    setStage("uploading");
    setPct(0);
    timers.current.push(window.setTimeout(() => setPct(100), 450));
    timers.current.push(window.setTimeout(() => setStage("done"), 450 + duration));
  };
  const click = () => {
    if (disabled || cur === "uploading") return;
    if (cur === "done") {
      setStage("idle");
      setPct(0);
      return;
    }
    if (demo) run();
    else inputRef.current?.click();
  };
  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      onFile?.(f);
      run();
    }
    e.target.value = "";
  };

  return (
    <div className={cx("np-upload-field", className)} style={style}>
      <button
        type="button"
        className={cx("np-upload", cur === "uploading" && "is-busy", cur === "done" && "is-done", error && "is-error")}
        onClick={click}
        disabled={disabled}
        aria-live="polite"
        aria-busy={cur === "uploading" || undefined}
      >
        <span className="np-upload__file">
          <Icon name="paperclip" size={18} />
          {fileName}
        </span>
        <span className="np-upload__fill" />
        <span className="np-upload__label">
          {cur === "done" ? (
            <span className="np-upload__txt" key="d">
              <Icon name="check" size={18} strokeWidth={2.6} />
              {doneLabel}
            </span>
          ) : cur === "uploading" ? (
            <span className="np-upload__txt" key="u">
              {uploadingLabel}
              {progress != null && <span className="np-num np-upload__pct">{Math.round(shown)}%</span>}
            </span>
          ) : (
            <span className="np-upload__txt" key="i">
              <Icon name="upload" size={18} />
              {label}
            </span>
          )}
        </span>
        {cur === "uploading" && (
          <span className="np-upload__bar" style={{ width: shown + "%", transitionDuration: (progress != null ? 200 : duration) + "ms" }} />
        )}
      </button>
      <input ref={inputRef} type="file" accept={accept} onChange={change} hidden />
      {error && <span className="np-field__hint np-field__hint--error">{error}</span>}
    </div>
  );
}
