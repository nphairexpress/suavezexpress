import * as React from "react";
import { Icon, type IconSource } from "./Icon";
import { cx } from "../../lib/cx";

type InputVariant = "pill" | "caps" | "money";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  /** Mensagem de erro (borda + texto vermelhos, aria-invalid) */
  error?: string;
  /** Ícone Lucide à esquerda */
  icon?: IconSource;
  /** Texto fixo à esquerda, ex.: "R$" */
  prefix?: string;
  /** pill = busca arredondada; caps = placeholder "BUSCAR…" espaçado; money = valor grande à direita */
  variant?: InputVariant | InputVariant[];
  /** Elemento à direita dentro do campo (ex.: botão de mostrar senha) */
  trailing?: React.ReactNode;
  /** Classe do wrapper .np-field */
  fieldClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, variant, prefix, trailing, id, className, fieldClassName, style, ...rest },
  ref,
) {
  const autoId = React.useId();
  const fid = id ?? autoId;
  const vs = Array.isArray(variant) ? variant : variant ? [variant] : [];
  const hintId = error || hint ? fid + "-hint" : undefined;
  return (
    <div className={cx("np-field", fieldClassName)} style={style}>
      {label && (
        <label className="np-field__label" htmlFor={fid}>
          {label}
        </label>
      )}
      <div className="np-input-wrap">
        {icon && <Icon name={icon} size={18} />}
        {prefix && !icon && <span className="np-input-prefix">{prefix}</span>}
        <input
          ref={ref}
          id={fid}
          className={cx("np-input", (icon || prefix) && "np-input--icon", error && "np-input--error", trailing && "np-input--trailing", ...vs.map((v) => "np-input--" + v), className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          {...rest}
        />
        {trailing && <span className="np-input-trailing">{trailing}</span>}
      </div>
      {(error || hint) && (
        <span id={hintId} className={cx("np-field__hint", error && "np-field__hint--error")}>
          {error || hint}
        </span>
      )}
    </div>
  );
});

/** Campo de senha com olho (estrutura do PasswordField do acervo "login deslizante"). */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type" | "trailing">>(function PasswordInput(props, ref) {
  const [show, setShow] = React.useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button type="button" className="np-input-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
          <Icon name={show ? "eye" : "eye-off"} size={18} />
        </button>
      }
    />
  );
});

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  /** Estado parcial (selecionar todos com parte marcada), do acervo "records table" */
  mixed?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, mixed = false, className, ...rest }, ref) {
  const inner = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (inner.current) inner.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <label className={cx("np-check", rest.disabled && "np-check--disabled", className)}>
      <input
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type="checkbox"
        aria-checked={mixed ? "mixed" : undefined}
        {...rest}
      />
      {label}
    </label>
  );
});
