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
  className,
  style,
}: LoginSliderProps) {
  const [register, setRegister] = React.useState(defaultMode === "signup");
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
        <h2 className="np-display">Já tem acesso?</h2>
        <p>Entre com seu e-mail e senha para abrir a fila e o caixa do dia.</p>
        <button type="button" className="np-login__switch" onClick={() => setRegister(false)} tabIndex={register ? 0 : -1}>
          Entrar
        </button>
      </div>

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

      <div className="np-login__hero np-login__hero--login" data-theme="dark">
        {logoSrc && <img src={logoSrc} alt="NP Hair Express" className="np-login__logo" />}
        <h2 className="np-display">Olá, equipe!</h2>
        <p>{allowSignup ? "Primeiro dia no salão? Crie seu acesso e peça a liberação ao gerente." : "Beleza pra quem não para!"}</p>
        {allowSignup && (
          <button type="button" className="np-login__switch" onClick={() => setRegister(true)} tabIndex={register ? -1 : 0}>
            Cadastrar
          </button>
        )}
      </div>

      <form
        className="np-login__form np-login__form--login"
        aria-hidden={register}
        onSubmit={(e) => {
          e.preventDefault();
          onLogin?.(read(e.currentTarget));
        }}
      >
        <h2 className="np-display">Entrar</h2>
        <Input name="email" type="email" label="E-mail" placeholder="voce@nphair.com.br" autoComplete="email" tabIndex={register ? -1 : 0} />
        <PasswordInput name="password" label="Senha" placeholder="Sua senha" autoComplete="current-password" tabIndex={register ? -1 : 0} />
        <div className="np-login__row">
          <Checkbox name="remember" label="Lembrar de mim" defaultChecked tabIndex={register ? -1 : 0} />
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
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
