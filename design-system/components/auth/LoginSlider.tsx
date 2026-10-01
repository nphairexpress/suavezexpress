import * as React from "react";
import { Input, PasswordInput, Checkbox } from "../core/Input";
import { Button } from "../core/Button";
import { cx } from "../../lib/cx";

/*
 * Login deslizante: TELA DE LOGIN OFICIAL aprovada pelo dono.
 * Estrutura e animação do acervo "ig-frontendjoe-login-deslizante" (Login.jsx + Login.css):
 * cartão com borda interna de 8 px, foto (.card-bg) que troca de lado com `translate: 100% 0 → 0`,
 * dois "heros" e dois formulários em camadas que entram/saem com opacity + visibility + translate,
 * tudo em 0,65 s ease-in-out; botão de troca translúcido com blur(4px) que fica sólido no hover.
 * Do export: vidro forte, raio 28, logo e textos em pt-BR, âmbar no botão, painel da foto sempre
 * escuro (data-theme="dark" no próprio elemento). Login social do original omitido (decisão do export).
 * Formulários são só visual: quem usa liga no Supabase Auth via onLogin/onSignup.
 * secondary="forgot": o lado de cadastro vira "Recuperar senha" (salão sem auto-cadastro);
 * o link "Esqueci a senha" desliza o cartão para ele e quem usa liga onRecover no Supabase.
 */

export interface LoginSliderValues {
  email: string;
  password: string;
  name?: string;
  remember?: boolean;
}

export interface LoginSliderProps {
  /** Foto escura para o painel deslizante */
  photoSrc?: string;
  /** Logo para fundo escuro (PNG transparente) */
  logoSrc?: string;
  defaultMode?: "login" | "signup";
  onLogin?: (v: LoginSliderValues) => void;
  onSignup?: (v: LoginSliderValues) => void;
  onForgot?: () => void;
  /** Botão em carregamento enquanto autentica */
  loading?: boolean;
  /** Erro de autenticação mostrado no formulário ativo */
  error?: string;
  /** Esconde o lado "Criar acesso" (salão sem auto-cadastro) */
  allowSignup?: boolean;
  /** O que fica no segundo lado do cartão: "signup" (padrão, Criar acesso) ou "forgot" (Recuperar senha) */
  secondary?: "signup" | "forgot";
  /** secondary="forgot": envio do e-mail de recuperação */
  onRecover?: (email: string) => void;
  /** secondary="forgot": botão "Enviar link" em carregamento */
  recoverLoading?: boolean;
  /** secondary="forgot": erro mostrado no painel de recuperação */
  recoverError?: string;
  /** secondary="forgot": confirmação mostrada no painel de recuperação */
  recoverMessage?: string;
  /** Erros por campo no formulário de entrada */
  fieldErrors?: { email?: string; password?: string };
  /** Mostra o "Lembrar de mim" (padrão true) */
  showRemember?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LoginSlider({
  photoSrc,
  logoSrc,
  defaultMode = "login",
  onLogin,
  onSignup,
  onForgot,
  loading = false,
  error,
  allowSignup = true,
  secondary = "signup",
  onRecover,
  recoverLoading = false,
  recoverError,
  recoverMessage,
  fieldErrors,
  showRemember = true,
  className,
  style,
}: LoginSliderProps) {
  const [register, setRegister] = React.useState(defaultMode === "signup");
  const forgot = secondary === "forgot";
  const loginEmailRef = React.useRef<HTMLInputElement>(null);
  const recoverEmailRef = React.useRef<HTMLInputElement>(null);
  const openForgot = () => {
    if (recoverEmailRef.current && loginEmailRef.current && !recoverEmailRef.current.value) recoverEmailRef.current.value = loginEmailRef.current.value;
    setRegister(true);
  };
  const read = (form: HTMLFormElement): LoginSliderValues => {
    const fd = new FormData(form);
    return { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), name: String(fd.get("name") ?? "") || undefined, remember: fd.get("remember") === "on" };
  };
  const photo = photoSrc ? { "--np-login-photo": `url("${photoSrc}")` } : {};
  return (
    <div className={cx("np-login", register && "is-register", className)} style={{ ...(photo as React.CSSProperties), ...style }}>
      <div className="np-login__bg" data-theme="dark" />

      <div className="np-login__hero np-login__hero--register" data-theme="dark">
        {logoSrc && <img src={logoSrc} alt="NP Hair Express" className="np-login__logo" />}
        <h2 className="np-display">{forgot ? "Lembrou a senha?" : "Já tem acesso?"}</h2>
        <p>{forgot ? "Volte e entre com seu e-mail e senha." : "Entre com seu e-mail e senha para abrir a fila e o caixa do dia."}</p>
        <button type="button" className="np-login__switch" onClick={() => setRegister(false)} tabIndex={register ? 0 : -1}>
          Entrar
        </button>
      </div>

      {forgot ? (
        <form
          className="np-login__form np-login__form--register"
          aria-hidden={!register}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onRecover?.(String(new FormData(e.currentTarget).get("email") ?? ""));
          }}
        >
          <h2 className="np-display">Recuperar senha</h2>
          <p className="np-login__text">Digite o e-mail do seu acesso. Enviamos um link para criar uma senha nova.</p>
          <Input ref={recoverEmailRef} name="email" type="email" label="E-mail" placeholder="voce@nphair.com.br" autoComplete="email" tabIndex={register ? 0 : -1} />
          {register && recoverError && <span className="np-field__hint np-field__hint--error" role="alert">{recoverError}</span>}
          {register && recoverMessage && <span className="np-field__hint np-login__ok" role="status">{recoverMessage}</span>}
          <Button type="submit" block size="lg" loading={register && recoverLoading} tabIndex={register ? 0 : -1}>
            Enviar link
          </Button>
        </form>
      ) : (
        <form
          className="np-login__form np-login__form--register"
          aria-hidden={!register}
          onSubmit={(e) => {
            e.preventDefault();
            onSignup?.(read(e.currentTarget));
          }}
        >
          <h2 className="np-display">Criar acesso</h2>
          <Input name="name" label="Nome completo" placeholder="Ex.: Juliana Prado" autoComplete="name" tabIndex={register ? 0 : -1} />
          <Input name="email" type="email" label="E-mail" placeholder="voce@nphair.com.br" autoComplete="email" tabIndex={register ? 0 : -1} />
          <PasswordInput name="password" label="Senha" placeholder="Mínimo 8 caracteres" autoComplete="new-password" tabIndex={register ? 0 : -1} />
          {register && error && <span className="np-field__hint np-field__hint--error">{error}</span>}
          <Button type="submit" block size="lg" loading={register && loading} tabIndex={register ? 0 : -1}>
            Cadastrar
          </Button>
        </form>
      )}

      <div className="np-login__hero np-login__hero--login" data-theme="dark">
        {logoSrc && <img src={logoSrc} alt="NP Hair Express" className="np-login__logo" />}
        <h2 className="np-display">Olá, equipe!</h2>
        <p>{allowSignup && !forgot ? "Primeiro dia no salão? Crie seu acesso e peça a liberação ao gerente." : "Beleza pra quem não para!"}</p>
        {allowSignup && !forgot && (
          <button type="button" className="np-login__switch" onClick={() => setRegister(true)} tabIndex={register ? -1 : 0}>
            Cadastrar
          </button>
        )}
      </div>

      <form
        className="np-login__form np-login__form--login"
        aria-hidden={register}
        noValidate={forgot || undefined}
        onSubmit={(e) => {
          e.preventDefault();
          onLogin?.(read(e.currentTarget));
        }}
      >
        <h2 className="np-display">Entrar</h2>
        <Input ref={loginEmailRef} name="email" type="email" label="E-mail" placeholder="voce@nphair.com.br" autoComplete="email" error={fieldErrors?.email} tabIndex={register ? -1 : 0} />
        <PasswordInput name="password" label="Senha" placeholder="Sua senha" autoComplete="current-password" error={fieldErrors?.password} tabIndex={register ? -1 : 0} />
        <div className={cx("np-login__row", !showRemember && "np-login__row--end")}>
          {showRemember && <Checkbox name="remember" label="Lembrar de mim" defaultChecked tabIndex={register ? -1 : 0} />}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (forgot) openForgot();
              onForgot?.();
            }}
            tabIndex={register ? -1 : 0}
          >
            Esqueci a senha
          </a>
        </div>
        {!register && error && <span className="np-field__hint np-field__hint--error">{error}</span>}
        <Button type="submit" block size="lg" loading={!register && loading} tabIndex={register ? -1 : 0}>
          Entrar
        </Button>
      </form>
    </div>
  );
}
