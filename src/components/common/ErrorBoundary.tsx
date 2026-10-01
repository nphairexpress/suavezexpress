// 29/09/2026 (auditoria R-09/D9): erro de tela vira aviso visível + registro em client_errors
// (edge `client-error`, só staff logado). Envio best-effort: nunca derruba a tela por falhar.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";

// Dedupe simples: a mesma mensagem não sobe 2x em 1 minuto (loops de erro geram centenas).
const recent = new Map<string, number>();
const DEDUPE_MS = 60_000;

export function reportClientError(message: string, stack?: string) {
  try {
    const now = Date.now();
    const last = recent.get(message);
    if (last && now - last < DEDUPE_MS) return;
    recent.set(message, now);
    supabase.functions
      .invoke("client-error", {
        body: { message, stack: stack ?? null, url: window.location.href, user_agent: navigator.userAgent },
      })
      .catch(() => {});
  } catch {
    // best-effort
  }
}

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error?.message || String(error), `${error?.stack || ""}\n${info.componentStack || ""}`);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="np-display text-2xl">Algo deu errado</h1>
        <p className="text-muted-foreground">O erro foi registrado. Recarregue a página para continuar.</p>
        <button
          onClick={() => window.location.reload()}
          className="h-12 rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
