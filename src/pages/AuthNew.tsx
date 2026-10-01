import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { LoginSlider, npAssets, type LoginSliderValues } from "@design-system";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export default function AuthNew() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | undefined>();
  const [resetMessage, setResetMessage] = useState<string | undefined>();

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleResetPassword = async (rawEmail: string) => {
    const email = rawEmail.toLowerCase().trim();
    setResetError(undefined);
    setResetMessage(undefined);
    if (!email) {
      toast({ title: "Digite seu email primeiro", description: "Preencha o campo email acima e clique de novo em 'Esqueci minha senha'.", variant: "destructive" });
      setResetError("Digite seu email primeiro");
      return;
    }
    setResetLoading(true);
    const redirectTo = `${window.location.origin}/auth/nova-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setResetLoading(false);
    if (error) {
      toast({ title: "Erro ao enviar link", description: error.message, variant: "destructive" });
      setResetError(`Erro ao enviar link: ${error.message}`);
    } else {
      const description = `Se o email ${email} estiver cadastrado, você receberá um link para redefinir a senha.`;
      toast({
        title: "Link enviado!",
        description,
      });
      setResetMessage(description);
    }
  };

  const handleLogin = async (values: LoginSliderValues) => {
    setErrors({});
    const loginData = { email: values.email.toLowerCase(), password: values.password };

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="np-app np-bg np-auth">
      <LoginSlider
        logoSrc={npAssets.logo}
        photoSrc={npAssets.bgGraphite}
        secondary="forgot"
        showRemember={false}
        onLogin={handleLogin}
        loading={loading}
        fieldErrors={{ email: errors.email, password: errors.password }}
        onRecover={handleResetPassword}
        recoverLoading={resetLoading}
        recoverError={resetError}
        recoverMessage={resetMessage}
      />
    </div>
  );
}
