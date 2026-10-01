import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { Button, GlassCard, Icon, PasswordInput, npAssets } from "@design-system";

export default function AuthNovaSenha() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { session, loading: authLoading, recoveryMode, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (password.length < 8) fieldErrors.password = "Senha deve ter pelo menos 8 caracteres";
    if (confirm !== password) fieldErrors.confirm = "As senhas não conferem";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
      return;
    }

    await signOut();
    toast({ title: "Senha alterada, entre com a nova senha" });
    navigate("/auth", { replace: true });
  };

  const hasRecoverySession = recoveryMode && !!session;

  return (
    <div className="np-app np-bg np-auth">
      <GlassCard tone="strong" radius="xl" padding={32} className="np-auth__card">
        <span className="np-logo-chip np-auth__logo">
          <img src={npAssets.logo} alt="NP Hair Express" />
        </span>

        {authLoading ? (
          <div className="np-auth__spin" aria-busy="true" aria-label="Carregando">
            <Icon name="loader-circle" size={32} className="np-spin" />
          </div>
        ) : !hasRecoverySession ? (
          <>
            <h2 className="np-display">Link inválido ou expirado</h2>
            <p>Peça um novo link em "Esqueci a senha" na tela de entrada.</p>
            <Button block size="lg" onClick={() => navigate("/auth", { replace: true })}>
              Ir para a tela de entrada
            </Button>
          </>
        ) : (
          <>
            <h2 className="np-display">Nova senha</h2>
            <p>Digite a nova senha para acessar o sistema</p>

            <form onSubmit={handleSubmit} noValidate className="np-auth__form">
              <PasswordInput
                id="password"
                label="Nova senha"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <PasswordInput
                id="confirm"
                label="Confirmar nova senha"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={errors.confirm}
              />
              <Button type="submit" block size="lg" loading={loading}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          </>
        )}
      </GlassCard>
    </div>
  );
}
