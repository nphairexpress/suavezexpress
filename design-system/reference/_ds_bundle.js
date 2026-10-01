/* @ds-bundle: {"format":4,"namespace":"NPHairExpressDesignSystem_ba69cf","components":[{"name":"LoginSlider","sourcePath":"components/auth/LoginSlider.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"CountBadge","sourcePath":"components/core/Badge.jsx"},{"name":"StatusPill","sourcePath":"components/core/Badge.jsx"},{"name":"Avatar","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"IconButton","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Checkbox","sourcePath":"components/core/Input.jsx"},{"name":"ThemeToggle","sourcePath":"components/core/ThemeToggle.jsx"},{"name":"UploadButton","sourcePath":"components/core/UploadButton.jsx"},{"name":"CashCard","sourcePath":"components/domain/CashCard.jsx"},{"name":"Receipt","sourcePath":"components/domain/CashCard.jsx"},{"name":"DiffField","sourcePath":"components/domain/CheckoutCard.jsx"},{"name":"CheckoutCard","sourcePath":"components/domain/CheckoutCard.jsx"},{"name":"PendingCard","sourcePath":"components/domain/PendingCard.jsx"},{"name":"QueueTicketCard","sourcePath":"components/domain/QueueTicketCard.jsx"},{"name":"ProfessionalCard","sourcePath":"components/domain/QueueTicketCard.jsx"},{"name":"GlassSidebar","sourcePath":"components/navigation/GlassSidebar.jsx"},{"name":"NavTabs","sourcePath":"components/navigation/NavTabs.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"},{"name":"CalendarCard","sourcePath":"components/surfaces/CalendarCard.jsx"},{"name":"TaskList","sourcePath":"components/surfaces/CalendarCard.jsx"},{"name":"GlassCard","sourcePath":"components/surfaces/GlassCard.jsx"},{"name":"StatCard","sourcePath":"components/surfaces/GlassCard.jsx"},{"name":"LineChart","sourcePath":"components/surfaces/LineChart.jsx"},{"name":"BarChart","sourcePath":"components/surfaces/LineChart.jsx"}],"sourceHashes":{"components/auth/LoginSlider.jsx":"3ed5388d5c05","components/core/Badge.jsx":"142923096d55","components/core/Button.jsx":"01d1b57dc29f","components/core/Icon.jsx":"0425f4fa5f17","components/core/Input.jsx":"75c47a13b2e2","components/core/ThemeToggle.jsx":"378b7fca46de","components/core/UploadButton.jsx":"bfe4aafe481e","components/domain/CashCard.jsx":"3d0c380c7d9a","components/domain/CheckoutCard.jsx":"b42667aa1f00","components/domain/PendingCard.jsx":"701340727aa2","components/domain/QueueTicketCard.jsx":"18d9c625acd6","components/domain/format.js":"ac1d6f96e96b","components/navigation/GlassSidebar.jsx":"f628a85544cd","components/navigation/NavTabs.jsx":"0942c7b96f0d","components/navigation/TopBar.jsx":"fbf5c22408ef","components/surfaces/CalendarCard.jsx":"2f840318ebda","components/surfaces/GlassCard.jsx":"07fd46f9f989","components/surfaces/LineChart.jsx":"437f759e45dd","ui_kits/painel/screens-gestao.jsx":"c9f7719102f2","ui_kits/painel/screens-operacao.jsx":"88099555213f","ui_kits/painel/screens-overview.jsx":"2c71a35c5920","ui_kits/recepcao/recepcao-screens.jsx":"d79af9679793","ui_kits/shared/data.js":"b0b6326fcb57","ui_kits/shared/phone-chrome.jsx":"4bc462bf1017","ui_kits/terminal/terminal-screens.jsx":"9738ceea36ed"},"inlinedExternals":[],"unexposedExports":[{"name":"applyTheme","sourcePath":"components/core/ThemeToggle.jsx"},{"name":"brl","sourcePath":"components/domain/format.js"},{"name":"getInitialTheme","sourcePath":"components/core/ThemeToggle.jsx"},{"name":"initTheme","sourcePath":"components/core/ThemeToggle.jsx"},{"name":"parseBrl","sourcePath":"components/domain/format.js"},{"name":"useTheme","sourcePath":"components/core/ThemeToggle.jsx"}]} */

(() => {

const __ds_ns = (window.NPHairExpressDesignSystem_ba69cf = window.NPHairExpressDesignSystem_ba69cf || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  tone = 'neutral',
  dot = false,
  live = false,
  size = 'md',
  children,
  className = '',
  style
}) {
  const cls = ['np-badge', tone !== 'neutral' ? 'np-badge--' + tone : '', live ? 'np-badge--live' : '', size === 'lg' ? 'np-badge--lg' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: cls,
    style: style
  }, (dot || live) && /*#__PURE__*/React.createElement("span", {
    className: "np-badge__dot"
  }), children);
}
function CountBadge({
  count,
  tone = 'accent',
  className = ''
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: 'np-count' + (tone === 'danger' ? ' np-count--danger' : '') + (className ? ' ' + className : '')
  }, count);
}
function StatusPill({
  status = 'livre',
  children
}) {
  const map = {
    davez: {
      tone: 'solid',
      label: 'Da vez',
      live: true
    },
    livre: {
      tone: 'positive',
      label: 'Livre',
      live: false
    },
    atendendo: {
      tone: 'neutral',
      label: 'Atendendo',
      live: true
    },
    pausa: {
      tone: 'neutral',
      label: 'Em pausa',
      live: false
    },
    ausente: {
      tone: 'danger',
      label: 'Ausente',
      live: false
    }
  };
  const s = map[status] || map.livre;
  return /*#__PURE__*/React.createElement(Badge, {
    tone: s.tone,
    dot: true,
    live: s.live
  }, children || s.label);
}
function Avatar({
  src,
  name = '',
  size = 40,
  style
}) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", {
    className: "np-avatar",
    style: {
      width: size,
      height: size,
      fontSize: size * 0.36,
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : ini);
}
Object.assign(__ds_scope, { Badge, CountBadge, StatusPill, Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
const LUCIDE_SRC = 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
let lucidePromise = null;
function loadLucide() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.lucide) return Promise.resolve(window.lucide);
  if (!lucidePromise) {
    lucidePromise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = LUCIDE_SRC;
      s.onload = () => resolve(window.lucide);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return lucidePromise;
}
const toPascal = n => String(n).split(/[-_ ]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = 'currentColor',
  className = '',
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let alive = true;
    loadLucide().then(l => {
      if (!alive || !l || !ref.current) return;
      const node = l.icons[toPascal(name)] || l.icons[name];
      if (!node) return;
      const el = l.createElement(node);
      el.setAttribute('width', size);
      el.setAttribute('height', size);
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-width', strokeWidth);
      ref.current.replaceChildren(el);
    });
    return () => {
      alive = false;
    };
  }, [name, size, strokeWidth, color]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: 'np-icon ' + className,
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      flex: 'none',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const cls = ['np-btn', 'np-btn--' + variant, size !== 'md' ? 'np-btn--' + size : '', block ? 'np-btn--block' : '', className].filter(Boolean).join(' ');
  const is = size === 'xl' ? 24 : size === 'lg' ? 20 : size === 'sm' ? 16 : 18;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: is
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: is
  }));
}
function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  round = false,
  badge,
  className = '',
  ...rest
}) {
  const cls = ['np-icon-btn', variant !== 'default' ? 'np-icon-btn--' + variant : '', size !== 'md' ? 'np-icon-btn--' + size : '', round ? 'np-icon-btn--round' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": label,
    title: label
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 16 : size === 'lg' ? 22 : 20
  }), badge != null && /*#__PURE__*/React.createElement("span", {
    className: "np-count np-count--dot"
  }, badge));
}
Object.assign(__ds_scope, { Button, IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  icon,
  variant,
  prefix,
  id,
  className = '',
  style,
  ...rest
}) {
  const fid = id || (label ? 'f-' + String(label).toLowerCase().replace(/\W+/g, '-') : undefined);
  const vs = Array.isArray(variant) ? variant : variant ? [variant] : [];
  const cls = ['np-input', icon || prefix ? 'np-input--icon' : '', error ? 'np-input--error' : '', ...vs.map(v => 'np-input--' + v), className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: "np-field",
    style: style
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "np-field__label",
    htmlFor: fid
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "np-input-wrap"
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  }), prefix && !icon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      color: 'var(--text-tertiary)',
      fontWeight: 600,
      fontSize: 14
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    className: cls,
    "aria-invalid": !!error
  }, rest))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: 'np-field__hint' + (error ? ' np-field__hint--error' : '')
  }, error || hint));
}
function Checkbox({
  label,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: 'np-check ' + className
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox"
  }, rest)), label);
}
Object.assign(__ds_scope, { Input, Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/auth/LoginSlider.jsx
try { (() => {
function PasswordField({
  label,
  placeholder
}) {
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "np-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "np-field__label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "np-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "np-input",
    type: show ? 'text' : 'password',
    placeholder: placeholder,
    defaultValue: "expresso123",
    style: {
      paddingRight: 48
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShow(!show),
    "aria-label": show ? 'Ocultar senha' : 'Mostrar senha',
    style: {
      position: 'absolute',
      right: 4,
      width: 40,
      height: 40,
      border: 0,
      background: 'transparent',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: show ? 'eye' : 'eye-off',
    size: 18
  }))));
}
function LoginSlider({
  photoSrc,
  logoSrc,
  defaultMode = 'login',
  onLogin,
  onSignup,
  onForgot,
  width = 820,
  height = 540,
  style
}) {
  const [mode, setMode] = React.useState(defaultMode);
  const signup = mode === 'signup';
  const ease = 'cubic-bezier(.77,0,.18,1)';
  const pane = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '32px 44px',
    gap: 14,
    transition: 'opacity 420ms ' + ease + ', transform 600ms ' + ease
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width,
      maxWidth: '100%',
      height,
      borderRadius: 28,
      background: 'var(--surface-glass-strong)',
      border: '1px solid var(--border-glass)',
      WebkitBackdropFilter: 'blur(24px)',
      backdropFilter: 'blur(24px)',
      boxShadow: 'var(--shadow-modal), var(--inner-highlight)',
      overflow: 'hidden',
      color: 'var(--text-primary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onLogin && onLogin();
    },
    style: {
      ...pane,
      left: 0,
      opacity: signup ? 0 : 1,
      transform: signup ? 'translateX(-30px)' : 'none',
      pointerEvents: signup ? 'none' : 'auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "np-display",
    style: {
      margin: '0 0 6px',
      fontSize: 26,
      textAlign: 'center'
    }
  }, "Entrar"), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "E-mail ou usu\xE1rio",
    placeholder: "voce@nphair.com.br",
    defaultValue: "recepcao@nphair.com.br"
  }), /*#__PURE__*/React.createElement(PasswordField, {
    label: "Senha",
    placeholder: "Sua senha"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    label: "Lembrar de mim",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onForgot && onForgot();
    },
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, "Esqueci a senha")), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    type: "submit",
    block: true,
    size: "lg"
  }, "Entrar")), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSignup && onSignup();
    },
    style: {
      ...pane,
      right: 0,
      opacity: signup ? 1 : 0,
      transform: signup ? 'none' : 'translateX(30px)',
      pointerEvents: signup ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "np-display",
    style: {
      margin: '0 0 6px',
      fontSize: 26,
      textAlign: 'center'
    }
  }, "Criar acesso"), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "Nome completo",
    placeholder: "Ex.: Juliana Prado"
  }), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "E-mail",
    placeholder: "voce@nphair.com.br"
  }), /*#__PURE__*/React.createElement(PasswordField, {
    label: "Senha",
    placeholder: "M\xEDnimo 8 caracteres"
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    type: "submit",
    block: true,
    size: "lg"
  }, "Cadastrar")), /*#__PURE__*/React.createElement("div", {
    "data-theme": "dark",
    style: {
      position: 'absolute',
      top: 8,
      bottom: 8,
      left: signup ? 8 : 'calc(50% + 0px)',
      width: 'calc(50% - 8px)',
      borderRadius: 22,
      overflow: 'hidden',
      transition: 'left 700ms ' + ease,
      backgroundColor: 'var(--bg-app)',
      backgroundImage: 'radial-gradient(420px 300px at 80% 0%, var(--photo-glow), transparent 60%), linear-gradient(180deg, var(--photo-scrim-top), var(--photo-scrim-bottom))' + (photoSrc ? ', url(' + photoSrc + ')' : ''),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      boxShadow: 'inset 0 0 0 1px var(--border-glass)',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 36,
      textAlign: 'center',
      gap: 14
    }
  }, logoSrc && /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "NP Hair Express",
    style: {
      width: '78%',
      maxWidth: 280,
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("h3", {
    className: "np-display",
    style: {
      margin: 0,
      fontSize: 24,
      color: 'var(--text-primary)'
    }
  }, signup ? 'Já tem acesso?' : 'Olá, equipe!'), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: 'var(--text-on-photo-2)',
      maxWidth: 280,
      lineHeight: 1.5
    }
  }, signup ? 'Entre com seu e-mail e senha para abrir a fila e o caixa do dia.' : 'Primeiro dia no salão? Crie seu acesso e peça a liberação ao gerente.'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMode(signup ? 'login' : 'signup'),
    style: {
      marginTop: 8,
      height: 44,
      padding: '0 34px',
      borderRadius: 14,
      border: '1px solid var(--glass-btn-border)',
      background: 'var(--glass-btn-bg)',
      WebkitBackdropFilter: 'blur(12px)',
      backdropFilter: 'blur(12px)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 15,
      cursor: 'pointer',
      transition: 'background 240ms, transform 150ms'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--glass-btn-bg-hover)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'var(--glass-btn-bg)';
    }
  }, signup ? 'Entrar' : 'Cadastrar'))));
}
Object.assign(__ds_scope, { LoginSlider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/auth/LoginSlider.jsx", error: String((e && e.message) || e) }); }

// components/core/ThemeToggle.jsx
try { (() => {
const THEME_KEY = 'np-theme';
function getInitialTheme() {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === 'light' || s === 'dark') return s;
  } catch (e) {}
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme(theme, opts) {
  const o = opts || {};
  const root = document.documentElement;
  if (o.animate) {
    root.classList.add('np-theme-anim');
    setTimeout(() => root.classList.remove('np-theme-anim'), 520);
  }
  root.setAttribute('data-theme', theme);
  if (o.persist !== false) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }
}
function initTheme() {
  if (!document.documentElement.getAttribute('data-theme')) applyTheme(getInitialTheme(), {
    persist: false
  });
  return document.documentElement.getAttribute('data-theme');
}
function useTheme() {
  const read = () => document.documentElement.getAttribute('data-theme') || getInitialTheme();
  const [theme, setThemeState] = React.useState(read);
  React.useEffect(() => {
    const mo = new MutationObserver(() => setThemeState(read()));
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => mo.disconnect();
  }, []);
  const setTheme = t => applyTheme(t, {
    animate: true
  });
  return [theme, setTheme];
}
function ThemeToggle({
  variant = 'icon',
  size = 'md',
  className = '',
  style
}) {
  const [theme, setTheme] = useTheme();
  const dark = theme !== 'light';
  const label = dark ? 'Acender a luz' : 'Apagar a luz';
  const [spin, setSpin] = React.useState(0);
  const click = () => {
    setSpin(n => n + 1);
    setTheme(dark ? 'light' : 'dark');
  };
  const is = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const icons = /*#__PURE__*/React.createElement("span", {
    className: "np-theme-toggle__icons",
    style: {
      width: is,
      height: is
    },
    key: spin
  }, /*#__PURE__*/React.createElement("span", {
    className: 'np-theme-toggle__icon' + (dark ? ' is-on' : '')
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sun",
    size: is
  })), /*#__PURE__*/React.createElement("span", {
    className: 'np-theme-toggle__icon' + (!dark ? ' is-on' : '')
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "moon",
    size: is
  })));
  if (variant === 'pill') {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: 'np-btn np-btn--secondary np-theme-toggle ' + (size === 'lg' ? 'np-btn--lg ' : size === 'sm' ? 'np-btn--sm ' : '') + className,
      onClick: click,
      "aria-label": label,
      "aria-pressed": !dark,
      style: style
    }, icons, label);
  }
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'np-icon-btn np-icon-btn--round np-theme-toggle ' + (size === 'sm' ? 'np-icon-btn--sm ' : size === 'lg' ? 'np-icon-btn--lg ' : '') + className,
    onClick: click,
    "aria-label": label,
    title: label,
    "aria-pressed": !dark,
    style: style
  }, icons);
}
ThemeToggle.init = initTheme;
ThemeToggle.apply = applyTheme;
ThemeToggle.getInitial = getInitialTheme;
ThemeToggle.useTheme = useTheme;
Object.assign(__ds_scope, { getInitialTheme, applyTheme, initTheme, useTheme, ThemeToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ThemeToggle.jsx", error: String((e && e.message) || e) }); }

// components/core/UploadButton.jsx
try { (() => {
function UploadButton({
  label = 'Enviar arquivo',
  uploadingLabel = 'Enviando…',
  doneLabel = 'Enviado',
  accept,
  onFile,
  demo = false,
  state,
  progress,
  duration = 1400,
  variant = 'primary',
  size = 'md',
  block = false
}) {
  const [st, setSt] = React.useState('idle');
  const [pct, setPct] = React.useState(0);
  const inputRef = React.useRef(null);
  const cur = state || st;
  const shown = progress != null ? progress : pct;
  const run = () => {
    setSt('uploading');
    setPct(0);
    const t0 = performance.now();
    const tick = t => {
      const p = Math.min(100, (t - t0) / duration * 100);
      setPct(p);
      if (p < 100) requestAnimationFrame(tick);else {
        setSt('done');
        setTimeout(() => {
          setSt('idle');
          setPct(0);
        }, 2200);
      }
    };
    requestAnimationFrame(tick);
  };
  const click = () => {
    if (cur !== 'idle') return;
    if (demo) run();else inputRef.current && inputRef.current.click();
  };
  const change = e => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      onFile && onFile(f);
      run();
    }
    e.target.value = '';
  };
  const cls = ['np-btn', 'np-btn--' + variant, size !== 'md' ? 'np-btn--' + size : '', block ? 'np-btn--block' : '', cur === 'done' ? 'np-btn--done' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: cls,
    onClick: click,
    "aria-live": "polite",
    style: {
      minWidth: 168
    }
  }, cur === 'uploading' && /*#__PURE__*/React.createElement("span", {
    className: "np-btn__progress",
    style: {
      width: shown + '%'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "np-btn__label"
  }, cur === 'idle' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "upload",
    size: 18
  }), label), cur === 'uploading' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    size: 18,
    style: {
      animation: 'np-spin 900ms linear infinite'
    }
  }), uploadingLabel, " ", /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 13
    }
  }, Math.round(shown), "%")), cur === 'done' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 18,
    strokeWidth: 3
  }), doneLabel)), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "file",
    accept: accept,
    onChange: change,
    hidden: true
  }));
}
Object.assign(__ds_scope, { UploadButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/UploadButton.jsx", error: String((e && e.message) || e) }); }

// components/domain/PendingCard.jsx
try { (() => {
const SEV = {
  alta: {
    label: 'Alta',
    tone: 'danger',
    icon: 'octagon-alert',
    c: 'var(--danger-solid)',
    glow: 'var(--danger-glow)'
  },
  media: {
    label: 'Média',
    tone: 'accent',
    icon: 'triangle-alert',
    c: 'var(--accent)',
    glow: 'var(--accent-glow-soft)'
  },
  baixa: {
    label: 'Baixa',
    tone: 'neutral',
    icon: 'info',
    c: 'var(--text-secondary)',
    glow: 'transparent'
  }
};
function PendingCard({
  severity = 'media',
  title,
  description,
  owner,
  when,
  value,
  actionLabel = 'Resolver',
  onAction,
  resolved = false,
  style
}) {
  const s = SEV[severity] || SEV.media;
  return /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--lift",
    style: {
      padding: 20,
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      opacity: resolved ? .55 : 1,
      boxShadow: 'var(--shadow-glass), 0 0 36px ' + s.glow + ', var(--inner-highlight)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      flex: 'none',
      borderRadius: 14,
      display: 'grid',
      placeItems: 'center',
      background: severity === 'baixa' ? 'var(--surface-inset)' : s.c,
      color: severity === 'alta' ? 'var(--text-on-danger)' : severity === 'media' ? 'var(--text-on-accent)' : 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: resolved ? 'check' : s.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: resolved ? 'positive' : s.tone,
    dot: true
  }, resolved ? 'Resolvida' : 'Gravidade ' + s.label.toLowerCase()), when && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, when)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      textDecoration: resolved ? 'line-through' : 'none'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, description), owner && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "user-round",
    size: 13
  }), owner)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 10
    }
  }, value && /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 18,
      color: severity === 'alta' ? 'var(--danger-text)' : 'var(--text-primary)'
    }
  }, value), onAction && !resolved && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: severity === 'alta' ? 'primary' : 'secondary',
    onClick: onAction
  }, actionLabel)));
}
Object.assign(__ds_scope, { PendingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/PendingCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/QueueTicketCard.jsx
try { (() => {
const TICKET_STATUS = {
  aguardando: {
    label: 'Aguardando',
    tone: 'neutral'
  },
  chamada: {
    label: 'Chamando agora',
    tone: 'solid',
    live: true
  },
  atendimento: {
    label: 'Em atendimento',
    tone: 'positive',
    live: true
  },
  ausente: {
    label: 'Não compareceu',
    tone: 'danger'
  }
};
function QueueTicketCard({
  ticket,
  client,
  service,
  professional,
  wait,
  position,
  status = 'aguardando',
  size = 'md',
  onCall,
  onSkip,
  style
}) {
  const s = TICKET_STATUS[status] || TICKET_STATUS.aguardando;
  const called = status === 'chamada';
  const fs = size === 'lg' ? 'var(--fs-ticket-lg)' : size === 'sm' ? 'var(--fs-ticket-sm)' : 'var(--fs-ticket-md)';
  return /*#__PURE__*/React.createElement("div", {
    className: 'glass-card glass-card--lift' + (called ? ' glass-card--glow' : ''),
    style: {
      padding: size === 'sm' ? 18 : 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      borderColor: called ? 'var(--accent-border)' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-caps"
  }, "Senha", position != null ? ' · ' + position + 'º na fila' : ''), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: s.tone,
    dot: true,
    live: s.live
  }, s.label)), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontWeight: 900,
      fontSize: fs,
      lineHeight: .92,
      letterSpacing: '-.03em',
      color: called ? 'var(--accent-display)' : 'var(--text-primary)',
      textShadow: called ? 'var(--accent-text-glow)' : 'none',
      animation: called ? 'np-ticket-in 520ms cubic-bezier(.22,1,.36,1)' : 'none'
    }
  }, ticket), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: size === 'sm' ? 15 : 18,
      fontWeight: 600
    }
  }, client), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px 14px',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, service && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "scissors",
    size: 14
  }), service), professional && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "user-round",
    size: 14
  }), professional), wait && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 14
  }), wait))), (onCall || onSkip) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, onCall && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    icon: called ? 'volume-2' : 'megaphone',
    onClick: onCall,
    style: {
      flex: 1
    }
  }, called ? 'Chamar de novo' : 'Chamar'), onSkip && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    icon: "skip-forward",
    onClick: onSkip
  }, "Pular")));
}
function ProfessionalCard({
  name,
  avatar,
  role,
  status = 'livre',
  ticket,
  client,
  elapsed,
  today,
  turn,
  onAction,
  actionLabel,
  style
}) {
  const davez = status === 'davez';
  return /*#__PURE__*/React.createElement("div", {
    className: 'glass-card glass-card--lift' + (davez ? ' glass-card--glow' : ''),
    style: {
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      borderColor: davez ? 'var(--accent-border)' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    src: avatar,
    size: 52,
    style: {
      boxShadow: davez ? '0 0 0 3px var(--accent)' : status === 'livre' ? '0 0 0 3px var(--positive)' : '0 0 0 2px var(--avatar-ring)'
    }
  }), turn != null && /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      position: 'absolute',
      bottom: -4,
      right: -6,
      minWidth: 22,
      height: 22,
      padding: '0 5px',
      borderRadius: 999,
      background: davez ? 'var(--accent)' : 'var(--surface-ink)',
      color: davez ? 'var(--text-on-accent)' : 'var(--text-on-ink)',
      fontSize: 11,
      display: 'grid',
      placeItems: 'center',
      border: '2px solid var(--ring-bg)'
    }
  }, turn, "\xBA")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 16,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), role && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, role)), /*#__PURE__*/React.createElement(__ds_scope.StatusPill, {
    status: status
  })), status === 'atendendo' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 12,
      background: 'var(--surface-inset)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 22,
      fontWeight: 900
    }
  }, ticket), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: 'var(--text-secondary)',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, client), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, elapsed)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, "Hoje: ", /*#__PURE__*/React.createElement("b", {
    className: "np-num",
    style: {
      color: 'var(--text-primary)',
      fontSize: 13
    }
  }, today), " atendimentos"), onAction && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: davez ? 'primary' : 'secondary',
    onClick: onAction
  }, actionLabel || (davez ? 'Chamar próxima' : 'Ver'))));
}
Object.assign(__ds_scope, { QueueTicketCard, ProfessionalCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/QueueTicketCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/format.js
try { (() => {
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
const parseBrl = s => Number(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
Object.assign(__ds_scope, { brl, parseBrl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/format.js", error: String((e && e.message) || e) }); }

// components/domain/CashCard.jsx
try { (() => {
function CashCard({
  title = 'Caixa da recepção',
  openedBy,
  openedAt,
  status = 'aberto',
  lines = [],
  style,
  footer
}) {
  const exp = lines.reduce((s, l) => s + l.expected, 0);
  const cnt = lines.reduce((s, l) => s + (l.counted != null ? l.counted : l.expected), 0);
  const diff = cnt - exp;
  const short = diff < -0.004;
  return /*#__PURE__*/React.createElement("div", {
    className: 'glass-card',
    style: {
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      borderColor: short ? 'var(--danger-border)' : undefined,
      boxShadow: short ? 'var(--shadow-glass), 0 0 40px var(--danger-glow)' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, openedBy && 'Aberto por ' + openedBy, openedAt && ' · ' + openedAt)), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: status === 'aberto' ? 'positive' : 'neutral',
    dot: true,
    live: status === 'aberto'
  }, status === 'aberto' ? 'Aberto' : 'Fechado')), /*#__PURE__*/React.createElement("table", {
    className: "np-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Forma"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Esperado"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Contado"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Dif."))), /*#__PURE__*/React.createElement("tbody", null, lines.map((l, i) => {
    const d = (l.counted != null ? l.counted : l.expected) - l.expected;
    return /*#__PURE__*/React.createElement("tr", {
      key: i
    }, /*#__PURE__*/React.createElement("td", null, l.label), /*#__PURE__*/React.createElement("td", {
      className: "np-num",
      style: {
        textAlign: 'right',
        fontWeight: 600,
        fontSize: 13
      }
    }, __ds_scope.brl(l.expected)), /*#__PURE__*/React.createElement("td", {
      className: "np-num",
      style: {
        textAlign: 'right',
        fontWeight: 600,
        fontSize: 13
      }
    }, __ds_scope.brl(l.counted != null ? l.counted : l.expected)), /*#__PURE__*/React.createElement("td", {
      className: "np-num",
      style: {
        textAlign: 'right',
        fontSize: 13,
        color: d < -0.004 ? 'var(--danger-text)' : d > 0.004 ? 'var(--positive-text)' : 'var(--text-tertiary)'
      }
    }, Math.abs(d) < 0.005 ? '—' : (d > 0 ? '+' : '−') + __ds_scope.brl(Math.abs(d))));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderRadius: 12,
      background: 'var(--surface-inset)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-label",
    style: {
      fontSize: 12
    }
  }, "Total esperado"), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 22
    }
  }, __ds_scope.brl(exp))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderRadius: 12,
      background: short ? 'var(--danger-soft)' : 'var(--positive-soft)',
      border: '1px solid ' + (short ? 'var(--danger-border)' : 'var(--positive-border)')
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: short ? 'var(--danger-text)' : 'var(--positive-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: short ? 'triangle-alert' : 'circle-check',
    size: 14
  }), short ? 'Falta no caixa' : 'Caixa confere'), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 22,
      color: short ? 'var(--danger-text)' : 'var(--positive-text)'
    }
  }, short ? '− ' + __ds_scope.brl(Math.abs(diff)) : __ds_scope.brl(diff)))), footer);
}
function Receipt({
  number,
  date,
  client,
  ticket,
  items = [],
  discount = 0,
  method,
  received,
  change,
  style
}) {
  const total = items.reduce((s, i) => s + i.price, 0) - discount;
  const mask = 'linear-gradient(#000,#000) top/100% calc(100% - 8px) no-repeat, radial-gradient(circle at 8px 8px, transparent 6px, #000 6.5px) bottom/16px 8px repeat-x';
  const row = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 12
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 300,
      background: 'var(--receipt-bg)',
      color: 'var(--receipt-ink)',
      fontFamily: 'var(--font-body)',
      padding: '24px 22px 30px',
      borderRadius: '14px 14px 0 0',
      boxShadow: 'var(--shadow-modal)',
      WebkitMask: mask,
      mask,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: '-.01em'
    }
  }, "NP HAIR ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--receipt-accent)'
    }
  }, "EXPRESS")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--receipt-ink-2)'
    }
  }, "Salto/SP \xB7 Comprovante sem valor fiscal")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1.5px dashed var(--receipt-rule)',
      margin: '14px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...row,
      color: 'var(--receipt-ink-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Comanda ", number), /*#__PURE__*/React.createElement("span", null, date)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...row,
      color: 'var(--receipt-ink-2)',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", null, client), ticket && /*#__PURE__*/React.createElement("span", null, "Senha ", ticket)), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1.5px dashed var(--receipt-rule)',
      margin: '14px 0'
    }
  }), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      ...row,
      padding: '3px 0'
    }
  }, /*#__PURE__*/React.createElement("span", null, it.name, it.pro ? ' · ' + it.pro : ''), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontWeight: 600,
      fontFamily: 'var(--font-body)'
    }
  }, __ds_scope.brl(it.price)))), discount > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...row,
      padding: '3px 0',
      color: 'var(--receipt-ink-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Desconto"), /*#__PURE__*/React.createElement("span", null, "\u2212 ", __ds_scope.brl(discount))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1.5px dashed var(--receipt-rule)',
      margin: '12px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...row,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "TOTAL"), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 24
    }
  }, __ds_scope.brl(total))), method && /*#__PURE__*/React.createElement("div", {
    style: {
      ...row,
      marginTop: 6,
      color: 'var(--receipt-ink-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Pago em ", method), /*#__PURE__*/React.createElement("span", null, received != null ? __ds_scope.brl(received) : '')), change > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...row,
      color: 'var(--receipt-ink-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Troco"), /*#__PURE__*/React.createElement("span", null, __ds_scope.brl(change))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 18,
      fontSize: 12,
      fontWeight: 600
    }
  }, "Beleza pra quem n\xE3o para!"));
}
Object.assign(__ds_scope, { CashCard, Receipt });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/CashCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/CheckoutCard.jsx
try { (() => {
const METHODS = [{
  id: 'dinheiro',
  label: 'Dinheiro',
  icon: 'banknote'
}, {
  id: 'pix',
  label: 'Pix',
  icon: 'qr-code'
}, {
  id: 'debito',
  label: 'Débito',
  icon: 'credit-card'
}, {
  id: 'credito',
  label: 'Crédito',
  icon: 'credit-card'
}, {
  id: 'clube',
  label: 'Clube',
  icon: 'crown'
}];
function DiffField({
  value,
  label = 'Diferença',
  style
}) {
  const zero = Math.abs(value) < 0.005;
  const pos = value > 0;
  const color = zero ? 'var(--text-primary)' : pos ? 'var(--positive-text)' : 'var(--danger-text)';
  const bg = zero ? 'var(--surface-inset)' : pos ? 'var(--positive-soft)' : 'var(--danger-soft)';
  const bd = zero ? 'var(--border-glass)' : pos ? 'var(--positive-border)' : 'var(--danger-border)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 12,
      background: bg,
      border: '1px solid ' + bd,
      transition: 'background 240ms, border-color 240ms',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 600,
      color
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: zero ? 'equal' : pos ? 'arrow-up-right' : 'triangle-alert',
    size: 16
  }), label, !zero && (pos ? ' · troco' : ' · falta')), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 20,
      color
    }
  }, zero ? __ds_scope.brl(0) : (pos ? '+ ' : '− ') + __ds_scope.brl(Math.abs(value))));
}
function CheckoutCard({
  number,
  client,
  ticket,
  items = [],
  discount = 0,
  methods = METHODS,
  defaultMethod = 'dinheiro',
  defaultReceived,
  onFinish,
  style
}) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const total = subtotal - discount;
  const [method, setMethod] = React.useState(defaultMethod);
  const [received, setReceived] = React.useState(defaultReceived != null ? String(defaultReceived).replace('.', ',') : '');
  const recv = method === 'dinheiro' ? __ds_scope.parseBrl(received) : total;
  const diff = recv - total;
  return /*#__PURE__*/React.createElement("div", {
    className: "glass-card",
    style: {
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "np-caps"
  }, "Comanda ", number), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginTop: 2
    }
  }, client)), ticket && /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: 'var(--accent-display)'
    }
  }, ticket)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderTop: i ? '1px solid var(--divider)' : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, it.name), it.pro && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, it.pro)), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 15
    }
  }, __ds_scope.brl(it.price))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      paddingTop: 12,
      borderTop: '1px dashed var(--border-strong)'
    }
  }, discount > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Desconto"), /*#__PURE__*/React.createElement("span", {
    className: "np-num"
  }, "\u2212 ", __ds_scope.brl(discount))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)'
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 30
    }
  }, __ds_scope.brl(total)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "np-field__label",
    style: {
      marginBottom: 8
    }
  }, "Forma de pagamento"), /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(64px,1fr))',
      gap: 8
    }
  }, methods.map(m => {
    const on = m.id === method;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      role: "radio",
      "aria-checked": on,
      onClick: () => setMethod(m.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 64,
        borderRadius: 12,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (on ? 'transparent' : 'var(--border-glass)'),
        background: on ? 'var(--accent)' : 'var(--surface-inset)',
        color: on ? 'var(--text-on-accent)' : 'var(--text-secondary)',
        boxShadow: on ? 'var(--shadow-accent)' : 'none',
        transition: 'all 200ms cubic-bezier(.22,1,.36,1)',
        transform: on ? 'translateY(-2px)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: m.icon,
      size: 20
    }), m.label);
  }))), method === 'dinheiro' && /*#__PURE__*/React.createElement("div", {
    className: "np-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "np-field__label"
  }, "Valor recebido"), /*#__PURE__*/React.createElement("div", {
    className: "np-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      color: 'var(--text-tertiary)',
      fontWeight: 600
    }
  }, "R$"), /*#__PURE__*/React.createElement("input", {
    className: "np-input np-input--money np-input--icon",
    inputMode: "decimal",
    value: received,
    onChange: e => setReceived(e.target.value),
    placeholder: "0,00"
  }))), method === 'clube' && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "accent",
    dot: true
  }, "Escova coberta pelo Clube \xB7 3 de 4 usadas no m\xEAs"), /*#__PURE__*/React.createElement(DiffField, {
    value: diff
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "lg",
    block: true,
    icon: "check",
    disabled: diff < -0.004,
    onClick: () => onFinish && onFinish({
      method,
      total,
      received: recv,
      diff
    })
  }, "Finalizar e imprimir"));
}
Object.assign(__ds_scope, { DiffField, CheckoutCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/CheckoutCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/GlassSidebar.jsx
try { (() => {
function NavItem({
  item,
  active,
  activeId,
  onSelect,
  collapsed
}) {
  const hasKids = item.children && item.children.length > 0;
  const kidActive = hasKids && item.children.some(c => c.id === activeId);
  const [open, setOpen] = React.useState(kidActive || !!item.defaultOpen);
  const cls = ['np-nav-item', active ? 'np-nav-item--active' : '', hasKids && open && !collapsed ? 'np-nav-item--open' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: cls,
    title: collapsed ? item.label : undefined,
    "aria-current": active ? 'page' : undefined,
    "aria-expanded": hasKids ? open : undefined,
    onClick: () => {
      if (hasKids && !collapsed) setOpen(!open);else onSelect && onSelect(hasKids ? item.children[0].id : item.id);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-nav-item__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("span", {
    className: "np-nav-item__label"
  }, item.label), item.badge != null && /*#__PURE__*/React.createElement(__ds_scope.CountBadge, {
    count: item.badge,
    tone: item.badgeTone
  }), hasKids && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 18,
    className: "np-nav-item__chev"
  })), hasKids && !collapsed && /*#__PURE__*/React.createElement("div", {
    className: 'np-subnav' + (open ? ' np-subnav--open' : '')
  }, /*#__PURE__*/React.createElement("div", null, item.children.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    className: 'np-subnav-item' + (c.id === activeId ? ' np-subnav-item--active' : ''),
    onClick: () => onSelect && onSelect(c.id)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, c.label), c.badge != null && /*#__PURE__*/React.createElement(__ds_scope.CountBadge, {
    count: c.badge,
    tone: c.badgeTone
  }))))));
}
function GlassSidebar({
  title = 'Sua Vez Express',
  logoSrc,
  user,
  sections = [],
  footer = [],
  activeId,
  onSelect,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  notifications,
  themeToggle = false,
  showSearch = true,
  onSearch,
  style
}) {
  const [c, setC] = React.useState(defaultCollapsed);
  const collapsed = collapsedProp != null ? collapsedProp : c;
  const toggle = () => {
    setC(!collapsed);
    onCollapsedChange && onCollapsedChange(!collapsed);
  };
  const renderItems = items => items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    active: it.id === activeId,
    activeId: activeId,
    onSelect: onSelect,
    collapsed: collapsed
  }));
  return /*#__PURE__*/React.createElement("aside", {
    className: 'np-sidebar' + (collapsed ? ' np-sidebar--collapsed' : ''),
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      flexDirection: collapsed ? 'column' : 'row'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-hide-collapsed",
    style: {
      flex: 1,
      minWidth: 0
    }
  }, logoSrc ? /*#__PURE__*/React.createElement("span", {
    className: "np-logo-chip"
  }, /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: title,
    style: {
      height: 22,
      display: 'block',
      maxWidth: '100%'
    }
  })) : /*#__PURE__*/React.createElement("span", {
    className: "np-display",
    style: {
      fontSize: 20,
      whiteSpace: 'nowrap'
    }
  }, title)), notifications != null && /*#__PURE__*/React.createElement("button", {
    className: "np-icon-btn np-icon-btn--ghost np-icon-btn--round",
    "aria-label": "Notifica\xE7\xF5es",
    style: {
      color: 'var(--sidebar-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    className: "np-count np-count--danger np-count--dot"
  }, notifications)), (themeToggle === true || themeToggle === 'collapsed' && collapsed) && /*#__PURE__*/React.createElement(__ds_scope.ThemeToggle, {
    size: collapsed ? 'md' : 'sm'
  }), /*#__PURE__*/React.createElement("button", {
    onClick: toggle,
    "aria-label": collapsed ? 'Expandir menu' : 'Recolher menu',
    title: collapsed ? 'Expandir' : 'Recolher',
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      padding: collapsed ? 0 : '0 12px 0 8px',
      width: collapsed ? 32 : 'auto',
      justifyContent: 'center',
      borderRadius: 999,
      border: 0,
      background: 'var(--chip-bg)',
      color: 'var(--chip-text)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12,
      cursor: 'pointer',
      boxShadow: 'var(--shadow-sm)',
      transition: 'transform 150ms'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: collapsed ? 'chevron-right' : 'chevron-left',
    size: 16,
    strokeWidth: 2.5
  }), !collapsed && 'Recolher')), /*#__PURE__*/React.createElement("div", {
    className: "np-sidebar__sep"
  }), user && /*#__PURE__*/React.createElement("button", {
    className: "np-nav-item",
    style: {
      minHeight: 60,
      padding: collapsed ? 0 : '0 8px',
      gap: 12
    },
    title: collapsed ? user.name : undefined
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: user.name,
    src: user.avatar,
    size: 44
  }), /*#__PURE__*/React.createElement("span", {
    className: "np-nav-item__label",
    style: {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--sidebar-text)'
    }
  }, user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-left-right",
    size: 12
  }), user.subtitle || 'Trocar usuário')), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 18,
    className: "np-nav-item__chev"
  })), user && /*#__PURE__*/React.createElement("div", {
    className: "np-sidebar__sep"
  }), showSearch && !collapsed && /*#__PURE__*/React.createElement("div", {
    className: "np-input-wrap",
    style: {
      margin: '0 0 4px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    className: "np-input np-input--icon np-input--pill np-input--caps",
    placeholder: "Buscar\u2026",
    onChange: e => onSearch && onSearch(e.target.value),
    style: {
      height: 40
    }
  })), showSearch && collapsed && /*#__PURE__*/React.createElement("button", {
    className: "np-nav-item",
    "aria-label": "Buscar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-nav-item__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 20
  }))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      margin: '0 -4px',
      padding: '0 4px'
    }
  }, sections.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    className: "np-sidebar__sep",
    style: {
      margin: '8px 4px'
    }
  }), s.title && /*#__PURE__*/React.createElement("div", {
    className: "np-nav-section"
  }, s.title), renderItems(s.items)))), footer.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "np-sidebar__sep"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, renderItems(footer))));
}
Object.assign(__ds_scope, { GlassSidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/GlassSidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavTabs.jsx
try { (() => {
function NavTabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  variant = 'pill',
  style
}) {
  const [inner, setInner] = React.useState(defaultValue || tabs[0] && tabs[0].id);
  const cur = value != null ? value : inner;
  const wrap = React.useRef(null);
  const [ind, setInd] = React.useState({
    left: 0,
    width: 0
  });
  React.useLayoutEffect(() => {
    const el = wrap.current && wrap.current.querySelector('[data-tab="' + cur + '"]');
    if (el) setInd({
      left: el.offsetLeft,
      width: el.offsetWidth
    });
  }, [cur, tabs.length]);
  React.useEffect(() => {
    const f = () => {
      const el = wrap.current && wrap.current.querySelector('[data-tab="' + cur + '"]');
      if (el) setInd({
        left: el.offsetLeft,
        width: el.offsetWidth
      });
    };
    document.fonts && document.fonts.ready.then(f);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [cur]);
  const pick = id => {
    setInner(id);
    onChange && onChange(id);
  };
  const onKey = e => {
    const i = tabs.findIndex(t => t.id === cur);
    if (e.key === 'ArrowRight') pick(tabs[(i + 1) % tabs.length].id);
    if (e.key === 'ArrowLeft') pick(tabs[(i - 1 + tabs.length) % tabs.length].id);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: wrap,
    role: "tablist",
    className: 'np-tabs' + (variant === 'underline' ? ' np-tabs--underline' : ''),
    onKeyDown: onKey,
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-tabs__ind",
    style: {
      left: ind.left,
      width: ind.width
    }
  }), tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    "data-tab": t.id,
    role: "tab",
    "aria-selected": t.id === cur,
    tabIndex: t.id === cur ? 0 : -1,
    className: "np-tab",
    onClick: () => pick(t.id)
  }, t.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16
  }), t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 11,
      opacity: .8
    }
  }, t.count))));
}
Object.assign(__ds_scope, { NavTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavTabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function TopBar({
  title,
  subtitle,
  searchPlaceholder = 'Buscar cliente, comanda, senha…',
  notifications,
  user,
  themeToggle = false,
  children,
  onSearch,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 240px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    className: "np-display",
    style: {
      margin: 0,
      fontSize: 26,
      fontWeight: 800
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, subtitle)), searchPlaceholder && /*#__PURE__*/React.createElement("div", {
    className: "np-input-wrap",
    style: {
      flex: '0 1 320px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    className: "np-input np-input--icon np-input--pill",
    placeholder: searchPlaceholder,
    onChange: e => onSearch && onSearch(e.target.value)
  })), children, themeToggle && /*#__PURE__*/React.createElement(__ds_scope.ThemeToggle, null), notifications != null && /*#__PURE__*/React.createElement("button", {
    className: "np-icon-btn np-icon-btn--round",
    "aria-label": "Notifica\xE7\xF5es"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 20
  }), notifications > 0 && /*#__PURE__*/React.createElement("span", {
    className: "np-count np-count--danger np-count--dot"
  }, notifications)), user && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 14px 4px 4px',
      borderRadius: 999,
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-glass)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: user.name,
    src: user.avatar,
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.25
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, user.name), user.role && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, user.role))));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/CalendarCard.jsx
try { (() => {
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['Do', 'Se', 'Te', 'Qa', 'Qi', 'Sx', 'Sa'];
function CalendarCard({
  year = 2026,
  month = 8,
  selected,
  onSelect,
  marks = {},
  compact = false,
  style
}) {
  const [ym, setYm] = React.useState({
    y: year,
    m: month
  });
  const [sel, setSel] = React.useState(selected);
  const first = new Date(ym.y, ym.m, 1).getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = Array.from({
    length: first
  }, () => null).concat(Array.from({
    length: days
  }, (_, i) => i + 1));
  const move = d => setYm(({
    y,
    m
  }) => {
    const n = m + d;
    return {
      y: y + Math.floor(n / 12),
      m: (n + 12) % 12
    };
  });
  const colors = {
    accent: ['var(--accent)', 'var(--text-on-accent)'],
    positive: ['var(--positive)', 'var(--text-on-accent)'],
    danger: ['var(--danger-solid)', 'var(--text-on-danger)']
  };
  const sz = compact ? 30 : 36;
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, MESES[ym.m], " ", ym.y), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "np-icon-btn np-icon-btn--sm np-icon-btn--round",
    "aria-label": "M\xEAs anterior",
    onClick: () => move(-1)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-left",
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "np-icon-btn np-icon-btn--sm np-icon-btn--round",
    "aria-label": "Pr\xF3ximo m\xEAs",
    onClick: () => move(1)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      gap: 4,
      justifyItems: 'center'
    }
  }, DIAS.map(d => /*#__PURE__*/React.createElement("span", {
    key: d,
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      height: 22
    }
  }, d)), cells.map((d, i) => {
    if (!d) return /*#__PURE__*/React.createElement("span", {
      key: i
    });
    const mk = marks[d];
    const isSel = d === sel;
    const c = isSel ? colors.accent : mk ? colors[mk] : null;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => {
        setSel(d);
        onSelect && onSelect(d);
      },
      className: "np-num",
      style: {
        width: sz,
        height: sz,
        border: 0,
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: c ? 800 : 500,
        fontFamily: c ? 'var(--font-display)' : 'var(--font-body)',
        background: c ? c[0] : 'transparent',
        color: c ? c[1] : 'var(--text-secondary)',
        boxShadow: isSel ? '0 0 0 3px var(--accent-soft),0 6px 16px var(--accent-border)' : 'none',
        transition: 'background 200ms, transform 150ms'
      },
      onMouseEnter: e => {
        if (!c) e.currentTarget.style.background = 'var(--surface-inset-hover)';
      },
      onMouseLeave: e => {
        if (!c) e.currentTarget.style.background = 'transparent';
      }
    }, d);
  })));
}
function TaskList({
  items = [],
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, items.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,.8fr) minmax(0,1.2fr)',
      alignItems: 'center',
      gap: 16,
      padding: '12px 0',
      borderTop: i ? '1px solid var(--divider)' : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, t.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, t.meta)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, t.durationLabel || 'Duração'), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 14
    }
  }, t.duration)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 12,
      width: 36,
      color: 'var(--text-secondary)'
    }
  }, t.progress, "%"), /*#__PURE__*/React.createElement("div", {
    className: "np-progress",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: t.progress + '%'
    }
  }))))));
}
Object.assign(__ds_scope, { CalendarCard, TaskList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/CalendarCard.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/GlassCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function GlassCard({
  as = 'div',
  lift = false,
  radius = 'lg',
  tone = 'default',
  glow = false,
  padding = 24,
  title,
  subtitle,
  action,
  children,
  className = '',
  style,
  ...rest
}) {
  const Tag = as;
  const cls = ['glass-card', lift ? 'glass-card--lift' : '', radius === 'xl' ? 'glass-card--xl' : '', tone !== 'default' ? 'glass-card--' + tone : '', glow ? 'glass-card--glow' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    style: {
      padding,
      ...style
    }
  }, rest), (title || action) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      fontWeight: 600,
      color: tone === 'accent' ? 'var(--text-on-accent)' : 'var(--text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 12,
      color: tone === 'accent' ? 'var(--text-on-accent-2)' : 'var(--text-tertiary)'
    }
  }, subtitle)), action), children);
}
function StatCard({
  title,
  value,
  change,
  trend = 'up',
  icon,
  hint,
  accent = false,
  style
}) {
  const up = trend === 'up';
  return /*#__PURE__*/React.createElement("div", {
    className: 'glass-card glass-card--lift' + (accent ? ' glass-card--accent' : ''),
    style: {
      padding: 24,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: accent ? 'var(--text-on-accent-2)' : 'var(--text-secondary)'
    }
  }, title), /*#__PURE__*/React.createElement("h2", {
    className: "np-num",
    style: {
      margin: '4px 0 0',
      fontSize: 24,
      color: accent ? 'var(--text-on-accent)' : 'var(--text-primary)'
    }
  }, value), change != null && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 14,
      fontWeight: 500,
      color: accent ? 'var(--text-on-accent)' : up ? 'var(--positive-text)' : 'var(--danger-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: up ? 'arrow-up-right' : 'arrow-down-right',
    size: 16
  }), change, "%", hint && /*#__PURE__*/React.createElement("span", {
    style: {
      color: accent ? 'var(--text-on-accent-2)' : 'var(--text-tertiary)',
      fontWeight: 400,
      marginLeft: 4
    }
  }, hint))), icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      flex: 'none',
      borderRadius: 14,
      display: 'grid',
      placeItems: 'center',
      background: accent ? 'var(--on-accent-overlay)' : 'linear-gradient(135deg,var(--accent-hover),var(--accent-press))',
      color: 'var(--text-on-accent)',
      boxShadow: accent ? 'none' : 'var(--shadow-accent)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 24
  }))));
}
Object.assign(__ds_scope, { GlassCard, StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/GlassCard.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/LineChart.jsx
try { (() => {
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6,
      c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6,
      c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2[0] + ',' + p2[1];
  }
  return d;
}
function LineChart({
  data = [],
  labels = [],
  height = 180,
  highlight,
  format = v => v,
  showGrid = true
}) {
  const uid = React.useId ? React.useId().replace(/:/g, '') : 'lc';
  const W = 600,
    H = height,
    pad = {
      t: 28,
      r: 8,
      b: labels.length ? 24 : 6,
      l: 8
    };
  const max = Math.max(...data) * 1.1 || 1,
    min = 0;
  const pts = data.map((v, i) => [pad.l + i * (W - pad.l - pad.r) / Math.max(1, data.length - 1), pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)]);
  const line = smoothPath(pts);
  const area = line + ' L' + pts[pts.length - 1][0] + ',' + (H - pad.b) + ' L' + pts[0][0] + ',' + (H - pad.b) + ' Z';
  const hp = highlight != null ? pts[highlight] : null;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 ' + W + ' ' + H,
    width: "100%",
    height: H,
    preserveAspectRatio: "none",
    style: {
      display: 'block',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: 'a' + uid,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    style: {
      stopColor: 'var(--chart-area)'
    }
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    style: {
      stopColor: 'var(--accent)',
      stopOpacity: 0
    }
  })), /*#__PURE__*/React.createElement("filter", {
    id: 'g' + uid
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "4"
  }))), showGrid && [0.25, 0.5, 0.75].map(f => /*#__PURE__*/React.createElement("line", {
    key: f,
    x1: pad.l,
    x2: W - pad.r,
    y1: pad.t + f * (H - pad.t - pad.b),
    y2: pad.t + f * (H - pad.t - pad.b),
    style: {
      stroke: 'var(--divider)'
    },
    strokeDasharray: "3 5",
    vectorEffect: "non-scaling-stroke"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: 'url(#a' + uid + ')'
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    style: {
      stroke: 'var(--accent)'
    },
    strokeWidth: "6",
    opacity: ".35",
    filter: 'url(#g' + uid + ')',
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    style: {
      stroke: 'var(--accent-hover)'
    },
    strokeWidth: "2.5",
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke"
  }), hp && /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: hp[0],
    x2: hp[0],
    y1: hp[1],
    y2: H - pad.b,
    style: {
      stroke: 'var(--accent)'
    },
    strokeOpacity: ".5",
    strokeDasharray: "3 4",
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: hp[0],
    cy: hp[1],
    r: "6",
    style: {
      fill: 'var(--bg-app)',
      stroke: 'var(--accent-hover)'
    },
    strokeWidth: "3"
  })), labels.map((l, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: pts[i] ? pts[i][0] : 0,
    y: H - 4,
    textAnchor: "middle",
    fontSize: "11",
    style: {
      fill: 'var(--text-tertiary)'
    },
    fontFamily: "Poppins"
  }, l)), hp && /*#__PURE__*/React.createElement("foreignObject", {
    x: hp[0] - 50,
    y: hp[1] - 34,
    width: "100",
    height: "26"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      padding: '3px 10px',
      borderRadius: 999,
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      fontSize: 12
    }
  }, format(data[highlight])))));
}
function BarChart({
  data = [],
  height = 180,
  highlight,
  format = v => v
}) {
  const max = Math.max(...data.map(d => d.value)) || 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      height
    }
  }, data.map((d, i) => {
    const on = i === highlight;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        height: '100%',
        justifyContent: 'flex-end'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      className: "np-num",
      style: {
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--accent)',
        color: 'var(--text-on-accent)'
      }
    }, format(d.value)), /*#__PURE__*/React.createElement("div", {
      title: String(format(d.value)),
      style: {
        width: '100%',
        maxWidth: 34,
        height: d.value / max * (height - 50) + 'px',
        borderRadius: 10,
        background: on ? 'linear-gradient(180deg,var(--accent-hover),var(--accent-press))' : 'linear-gradient(180deg,var(--chart-bar-from),var(--chart-bar-to))',
        boxShadow: on ? '0 8px 24px var(--accent-border)' : 'none',
        transition: 'height 420ms cubic-bezier(.22,1,.36,1)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: on ? 'var(--text-primary)' : 'var(--text-tertiary)'
      }
    }, d.label));
  }));
}
Object.assign(__ds_scope, { LineChart, BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/LineChart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/screens-gestao.jsx
try { (() => {
function ClientesScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    GlassCard,
    Badge,
    Avatar,
    Button,
    Icon
  } = DS;
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(D.clientes[0]);
  const list = D.clientes.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Clientes",
    subtitle: "1.284 cadastradas",
    searchPlaceholder: "Nome ou telefone\u2026",
    onSearch: setQ
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "user-plus"
  }, "Nova cliente")), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 320px',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(GlassCard, {
    padding: 12
  }, /*#__PURE__*/React.createElement("table", {
    className: "np-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Cliente"), /*#__PURE__*/React.createElement("th", null, "Telefone"), /*#__PURE__*/React.createElement("th", null, "\xDAltima visita"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Visitas"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Gasto total"))), /*#__PURE__*/React.createElement("tbody", null, list.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.name,
    onClick: () => setSel(c),
    style: {
      cursor: 'pointer',
      background: sel.name === c.name ? 'var(--accent-soft)' : undefined
    }
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: 32
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, c.name), c.club && /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, "Clube"))), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, c.phone), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, c.last), /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      textAlign: 'right',
      fontSize: 13
    }
  }, c.visits), /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      textAlign: 'right',
      fontSize: 13
    }
  }, D.brl(c.spent))))))), /*#__PURE__*/React.createElement(GlassCard, {
    radius: "xl",
    padding: 0,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 96,
      background: 'radial-gradient(300px 140px at 80% 0%, var(--accent-border), transparent 70%), linear-gradient(135deg,var(--hero-from),var(--hero-to))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 20px',
      marginTop: -40,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: sel.name,
    size: 80,
    style: {
      boxShadow: '0 0 0 4px var(--bg-app)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginTop: 6
    }
  }, sel.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, sel.phone), sel.club ? /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    dot: true
  }, "Clube da Escova \xB7 3 de 4 no m\xEAs") : /*#__PURE__*/React.createElement(Badge, null, "Sem assinatura"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      width: '100%',
      marginTop: 12,
      gap: 8
    }
  }, [['Visitas', sel.visits], ['Gasto', D.brl(sel.spent).replace(',00', '')], ['Última', sel.last]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 16
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      width: '100%',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    block: true,
    icon: "ticket-plus"
  }, "Emitir senha"), /*#__PURE__*/React.createElement(DS.IconButton, {
    icon: "message-circle",
    label: "WhatsApp"
  }))))));
}
function ClubeScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    StatCard,
    GlassCard,
    Badge,
    Button,
    Icon
  } = DS;
  const planos = [{
    n: 'Clube 4',
    d: '4 escovas por mês',
    p: 149.9,
    s: 52
  }, {
    n: 'Clube 8',
    d: '8 escovas por mês',
    p: 269.9,
    s: 27,
    hot: true
  }, {
    n: 'Pacote 5',
    d: '5 escovas · validade 60 dias',
    p: 199.9,
    s: 7
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Clube da Escova e pacotes",
    subtitle: "Assinaturas renovam todo dia 5",
    searchPlaceholder: "Buscar assinante\u2026"
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "plus"
  }, "Nova assinatura")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    title: "Assinantes ativas",
    value: "86",
    change: "11,7",
    icon: "crown"
  }), /*#__PURE__*/React.createElement(StatCard, {
    title: "Recorr\xEAncia mensal",
    value: "R$ 12.890",
    change: "9,4",
    icon: "repeat"
  }), /*#__PURE__*/React.createElement(StatCard, {
    title: "Escovas usadas no m\xEAs",
    value: "241 / 392",
    change: "61",
    hint: "de uso",
    icon: "wind"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
      gap: 16
    }
  }, planos.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.n,
    className: 'glass-card glass-card--lift' + (p.hot ? ' glass-card--glow' : ''),
    style: {
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      borderColor: p.hot ? 'var(--accent-border)' : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-display",
    style: {
      fontSize: 22
    }
  }, p.n), p.hot && /*#__PURE__*/React.createElement(Badge, {
    tone: "solid"
  }, "Mais vendido")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, p.d), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 30
    }
  }, D.brl(p.p)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, " /m\xEAs")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, p.s, " clientes"), /*#__PURE__*/React.createElement(Button, {
    variant: p.hot ? 'primary' : 'secondary',
    block: true
  }, "Vender")))));
}
function ComissoesScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    GlassCard,
    BarChart,
    Avatar,
    NavTabs,
    Button
  } = DS;
  const rows = [['Juliana Prado', 142, 9840, 40], ['Carla Mendes', 118, 8910, 40], ['Débora Lins', 126, 7620, 35], ['Bianca Rocha', 97, 6150, 35]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Comiss\xF5es",
    subtitle: "Per\xEDodo de 01 a 30 de setembro",
    searchPlaceholder: null
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "download"
  }, "Exportar"), /*#__PURE__*/React.createElement(Button, {
    icon: "check-check"
  }, "Fechar per\xEDodo")), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(GlassCard, {
    padding: 12
  }, /*#__PURE__*/React.createElement("table", {
    className: "np-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Profissional"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Atend."), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Produ\xE7\xE3o"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "%"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Comiss\xE3o"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0]
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: r[0],
    size: 32
  }), r[0])), /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      textAlign: 'right',
      fontSize: 13
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      textAlign: 'right',
      fontSize: 13
    }
  }, D.brl(r[2])), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right',
      color: 'var(--text-secondary)'
    }
  }, r[3], "%"), /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      textAlign: 'right',
      fontSize: 15,
      color: 'var(--accent-text)'
    }
  }, D.brl(r[2] * r[3] / 100))))))), /*#__PURE__*/React.createElement(GlassCard, {
    title: "Produ\xE7\xE3o por profissional"
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 220,
    highlight: 0,
    data: rows.map(r => ({
      label: r[0].split(' ')[0],
      value: r[2]
    })),
    format: v => D.brl(v).replace(',00', '')
  }))));
}
function RelatoriosScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    GlassCard,
    LineChart,
    BarChart,
    NavTabs,
    Button
  } = DS;
  const [p, setP] = React.useState('mes');
  const serv = [['Escova modelada', 412, 58], ['Escova Clube', 241, 34], ['Corte + escova', 96, 14], ['Hidratação', 88, 12]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Relat\xF3rios",
    subtitle: "Setembro 2026",
    searchPlaceholder: null
  }, /*#__PURE__*/React.createElement(NavTabs, {
    value: p,
    onChange: setP,
    tabs: [{
      id: 'semana',
      label: 'Semana'
    }, {
      id: 'mes',
      label: 'Mês'
    }, {
      id: 'ano',
      label: 'Ano'
    }]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "download"
  }, "PDF")), /*#__PURE__*/React.createElement(GlassCard, {
    title: "Faturamento di\xE1rio",
    subtitle: "R$ 61.940,00 no m\xEAs \xB7 +12% sobre agosto"
  }, /*#__PURE__*/React.createElement(LineChart, {
    height: 200,
    data: [1400, 1900, 1700, 2300, 2600, 3900, 1100, 1800, 2100, 2000, 2500, 2900, 4100, 900, 1700, 2200, 2400, 2600, 3100, 4300, 1000],
    highlight: 19,
    format: v => D.brl(v).replace(',00', '')
  })), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(GlassCard, {
    title: "Atendimentos por dia da semana"
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 200,
    highlight: 5,
    data: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((l, i) => ({
      label: l,
      value: [98, 121, 112, 140, 168, 223][i]
    }))
  })), /*#__PURE__*/React.createElement(GlassCard, {
    title: "Servi\xE7os mais vendidos"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, serv.map(s => /*#__PURE__*/React.createElement("div", {
    key: s[0]
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, s[0]), /*#__PURE__*/React.createElement("span", {
    className: "np-num"
  }, s[1])), /*#__PURE__*/React.createElement("div", {
    className: "np-progress"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: s[2] + '%'
    }
  }))))))));
}
function PermissoesScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf;
  const {
    TopBar,
    GlassCard,
    Checkbox,
    Button
  } = DS;
  const perms = ['Ver faturamento', 'Abrir e fechar caixa', 'Dar desconto', 'Cancelar comanda', 'Editar comissões', 'Gerenciar usuários'];
  const roles = ['Dono', 'Gerente', 'Recepção', 'Profissional'];
  const init = {
    Dono: [1, 1, 1, 1, 1, 1],
    Gerente: [1, 1, 1, 1, 0, 0],
    'Recepção': [0, 1, 1, 0, 0, 0],
    Profissional: [0, 0, 0, 0, 0, 0]
  };
  const [m, setM] = React.useState(init);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Permiss\xF5es",
    subtitle: "O que cada perfil pode fazer",
    searchPlaceholder: null
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "save"
  }, "Salvar altera\xE7\xF5es")), /*#__PURE__*/React.createElement(GlassCard, {
    padding: 12,
    style: {
      maxWidth: 900
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "np-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Permiss\xE3o"), roles.map(r => /*#__PURE__*/React.createElement("th", {
    key: r,
    style: {
      textAlign: 'center'
    }
  }, r)))), /*#__PURE__*/React.createElement("tbody", null, perms.map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: p
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 500
    }
  }, p), roles.map(r => /*#__PURE__*/React.createElement("td", {
    key: r,
    style: {
      textAlign: 'center',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    "aria-label": p + ' — ' + r,
    checked: !!m[r][i],
    disabled: r === 'Dono',
    onChange: () => setM({
      ...m,
      [r]: m[r].map((v, j) => j === i ? v ? 0 : 1 : v)
    })
  })))))))));
}
Object.assign(window, {
  ClientesScreen,
  ClubeScreen,
  ComissoesScreen,
  RelatoriosScreen,
  PermissoesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/screens-gestao.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/screens-operacao.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ComandaScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    CheckoutCard,
    Receipt,
    GlassCard,
    Button,
    Badge
  } = DS;
  const [done, setDone] = React.useState(null);
  const abertas = [{
    n: '#1042',
    c: 'Mariana Souza',
    t: 'A027',
    v: 105,
    s: 'Pronta'
  }, {
    n: '#1041',
    c: 'Tatiane Ramos',
    t: 'A024',
    v: 60,
    s: 'Em atendimento'
  }, {
    n: '#1040',
    c: 'Sônia Prates',
    t: 'A025',
    v: 85,
    s: 'Em atendimento'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Comanda",
    subtitle: "3 comandas abertas",
    searchPlaceholder: "Buscar comanda ou senha\u2026"
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "plus"
  }, "Nova comanda")), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: '300px minmax(0,1fr) 340px',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(GlassCard, {
    title: "Abertas",
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, abertas.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: a.n,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      border: '1px solid ' + (i === 0 ? 'var(--accent-border)' : 'transparent'),
      background: i === 0 ? 'var(--accent-soft)' : 'var(--surface-inset)',
      color: 'inherit',
      fontFamily: 'inherit',
      textAlign: 'left',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 18,
      fontWeight: 900,
      width: 56
    }
  }, a.t), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      fontWeight: 600
    }
  }, a.c), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, a.n, " \xB7 ", a.s)), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 13
    }
  }, D.brl(a.v)))))), /*#__PURE__*/React.createElement(CheckoutCard, _extends({}, D.comanda, {
    defaultReceived: 110,
    onFinish: r => setDone(r)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12
    }
  }, done ? /*#__PURE__*/React.createElement("div", {
    className: "np-fade-up",
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "positive",
    dot: true,
    size: "lg"
  }, "Comanda finalizada"), /*#__PURE__*/React.createElement(Receipt, {
    number: D.comanda.number,
    date: "30/09/2026 14:32",
    client: D.comanda.client,
    ticket: D.comanda.ticket,
    items: D.comanda.items,
    method: {
      dinheiro: 'Dinheiro',
      pix: 'Pix',
      debito: 'Débito',
      credito: 'Crédito',
      clube: 'Clube'
    }[done.method],
    received: done.received,
    change: done.diff
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "printer"
  }, "Imprimir de novo")) : /*#__PURE__*/React.createElement(GlassCard, {
    style: {
      width: '100%',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "O comprovante aparece aqui ao finalizar.")))));
}
function CaixaScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    CashCard,
    GlassCard,
    Button,
    UploadButton,
    Badge,
    Input
  } = DS;
  const movs = [['14:32', 'Comanda #1042 · Mariana', 'Dinheiro', 105], ['14:10', 'Comanda #1039 · Patrícia', 'Pix', 60], ['13:55', 'Sangria para cofre', 'Dinheiro', -300], ['13:20', 'Comanda #1037 · Cláudia', 'Débito', 145], ['12:48', 'Clube · mensalidade Renata', 'Crédito', 149.9]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Caixa",
    subtitle: "Recep\xE7\xE3o \xB7 aberto \xE0s 08:02 por Rafaela",
    searchPlaceholder: null
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "arrow-down-to-line"
  }, "Sangria"), /*#__PURE__*/React.createElement(Button, {
    icon: "lock"
  }, "Fechar caixa")), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(CashCard, {
    openedBy: "Rafaela",
    openedAt: "08:02",
    lines: D.caixa,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      icon: "triangle-alert"
    }, "Registrar falta"), /*#__PURE__*/React.createElement(UploadButton, {
      demo: true,
      label: "Anexar contagem",
      variant: "secondary"
    }))
  }), /*#__PURE__*/React.createElement(GlassCard, {
    title: "Movimenta\xE7\xF5es",
    subtitle: "Hoje",
    action: /*#__PURE__*/React.createElement(Badge, null, "5 de 41")
  }, /*#__PURE__*/React.createElement("table", {
    className: "np-table"
  }, /*#__PURE__*/React.createElement("tbody", null, movs.map((m, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      width: 54
    }
  }, m[0]), /*#__PURE__*/React.createElement("td", null, m[1], /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, m[2])), /*#__PURE__*/React.createElement("td", {
    className: "np-num",
    style: {
      textAlign: 'right',
      fontSize: 14,
      color: m[3] < 0 ? 'var(--danger-text)' : 'var(--text-primary)'
    }
  }, m[3] < 0 ? '− ' + D.brl(-m[3]) : D.brl(m[3])))))))));
}
function PendenciasScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf,
    D = window.NPData;
  const {
    TopBar,
    NavTabs,
    PendingCard
  } = DS;
  const [f, setF] = React.useState('todas');
  const [ok, setOk] = React.useState({});
  const list = D.pendencias.filter(p => f === 'todas' || p.severity === f);
  const cnt = s => D.pendencias.filter(p => p.severity === s).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Pend\xEAncias de fechamento",
    subtitle: "Resolva antes de fechar o dia",
    searchPlaceholder: null
  }), /*#__PURE__*/React.createElement(NavTabs, {
    value: f,
    onChange: setF,
    tabs: [{
      id: 'todas',
      label: 'Todas',
      count: D.pendencias.length
    }, {
      id: 'alta',
      label: 'Alta',
      count: cnt('alta')
    }, {
      id: 'media',
      label: 'Média',
      count: cnt('media')
    }, {
      id: 'baixa',
      label: 'Baixa',
      count: cnt('baixa')
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 820
    }
  }, list.map(p => /*#__PURE__*/React.createElement(PendingCard, _extends({
    key: p.title
  }, p, {
    resolved: !!ok[p.title],
    onAction: () => setOk({
      ...ok,
      [p.title]: true
    })
  })))));
}
Object.assign(window, {
  ComandaScreen,
  CaixaScreen,
  PendenciasScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/screens-operacao.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/screens-overview.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DS = window.NPHairExpressDesignSystem_ba69cf;
const D = window.NPData;
function OverviewScreen({
  go
}) {
  const {
    TopBar,
    NavTabs,
    StatCard,
    GlassCard,
    LineChart,
    CalendarCard,
    TaskList,
    ProfessionalCard,
    Button,
    QueueTicketCard,
    Badge,
    Icon
  } = DS;
  const [p, setP] = React.useState('hoje');
  return /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 320px',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Bom dia, Nilton",
    subtitle: "Ter\xE7a, 30 de setembro \xB7 sal\xE3o aberto desde 08:00"
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "plus",
    onClick: () => go('comanda')
  }, "Nova comanda")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-caps"
  }, "Indicadores do dia"), /*#__PURE__*/React.createElement(NavTabs, {
    value: p,
    onChange: setP,
    tabs: [{
      id: 'hoje',
      label: 'Hoje'
    }, {
      id: 'semana',
      label: 'Semana'
    }, {
      id: 'mes',
      label: 'Mês'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    title: "Faturamento",
    value: p === 'hoje' ? 'R$ 4.280' : p === 'semana' ? 'R$ 16.100' : 'R$ 61.940',
    change: "12,5",
    icon: "dollar-sign"
  }), /*#__PURE__*/React.createElement(StatCard, {
    title: "Atendimentos",
    value: p === 'hoje' ? '38' : p === 'semana' ? '214' : '862',
    change: "8,2",
    icon: "scissors"
  }), /*#__PURE__*/React.createElement(StatCard, {
    title: "Ticket m\xE9dio",
    value: "R$ 112,60",
    change: "2,4",
    trend: "down",
    icon: "receipt"
  }), /*#__PURE__*/React.createElement(StatCard, {
    title: "Na fila agora",
    value: "6 clientes",
    icon: "ticket",
    accent: true
  })), /*#__PURE__*/React.createElement(GlassCard, {
    title: "Faturamento da semana",
    subtitle: "Valores fechados no caixa",
    action: /*#__PURE__*/React.createElement(Badge, {
      tone: "positive",
      dot: true
    }, "S\xE1bado foi o melhor dia"),
    lift: true
  }, /*#__PURE__*/React.createElement(LineChart, {
    height: 190,
    data: D.semana.slice(0, 6),
    labels: D.diasSemana.slice(0, 6),
    highlight: 5,
    format: v => D.brl(v)
  })), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(GlassCard, {
    title: "Metas de hoje",
    subtitle: "Atualiza a cada comanda fechada",
    lift: true
  }, /*#__PURE__*/React.createElement(TaskList, {
    items: [{
      title: 'Escovas do Clube',
      meta: '12 de 20 previstas',
      durationLabel: 'Restante',
      duration: '8',
      progress: 60
    }, {
      title: 'Faturamento do dia',
      meta: 'Meta R$ 5.000',
      durationLabel: 'Falta',
      duration: 'R$ 720',
      progress: 86
    }, {
      title: 'Novos clientes',
      meta: 'Meta 5',
      durationLabel: 'Falta',
      duration: '3',
      progress: 40
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--accent glass-card--lift",
    style: {
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: 'var(--on-accent-overlay)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "crown",
    size: 24
  })), /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 13
    }
  }, "+9 este m\xEAs")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 40,
      lineHeight: 1
    }
  }, "86"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600
    }
  }, "assinantes no Clube da Escova"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-on-accent-2)'
    }
  }, "R$ 12.890,00 em recorr\xEAncia")), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    onClick: () => go('clube'),
    iconRight: "arrow-right"
  }, "Ver Clube")))), /*#__PURE__*/React.createElement("aside", {
    className: "glass-card glass-card--xl",
    style: {
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      alignSelf: 'start',
      position: 'sticky',
      top: 0
    }
  }, /*#__PURE__*/React.createElement(CalendarCard, {
    compact: true,
    year: 2026,
    month: 8,
    selected: 30,
    marks: {
      6: 'positive',
      13: 'positive',
      20: 'positive',
      27: 'positive',
      29: 'danger'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--divider)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Pr\xF3ximas da fila"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      go('fila');
    },
    style: {
      fontSize: 12
    }
  }, "Ver fila")), D.fila.slice(0, 4).map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: f.ticket,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 14,
      background: i === 0 ? 'var(--accent-soft)' : 'var(--surface-inset)',
      border: '1px solid ' + (i === 0 ? 'var(--accent-border)' : 'transparent')
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 20,
      fontWeight: 900,
      width: 64,
      color: i === 0 ? 'var(--accent-display)' : 'var(--text-primary)'
    }
  }, f.ticket), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, f.client), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, f.service, " \xB7 ", f.wait)))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--divider)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Equipe agora"), D.pros.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(DS.Avatar, {
    name: p.name,
    size: 34
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13
    }
  }, p.name.split(' ')[0]), /*#__PURE__*/React.createElement(DS.StatusPill, {
    status: p.status
  })))));
}
function FilaScreen() {
  const {
    TopBar,
    NavTabs,
    QueueTicketCard,
    ProfessionalCard,
    Button,
    GlassCard
  } = DS;
  const [fila, setFila] = React.useState(D.fila);
  const [tab, setTab] = React.useState('fila');
  const callNext = () => setFila(f => {
    const rest = f.slice(1);
    if (rest[0]) rest[0] = {
      ...rest[0],
      status: 'chamada'
    };
    return rest;
  });
  const cur = fila[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    themeToggle: true,
    title: "Fila de atendimento",
    subtitle: fila.length + ' clientes aguardando · espera média 8 min',
    searchPlaceholder: "Buscar senha ou cliente\u2026"
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "ticket-plus",
    variant: "secondary"
  }, "Emitir senha"), /*#__PURE__*/React.createElement(Button, {
    icon: "megaphone",
    onClick: callNext
  }, "Chamar pr\xF3xima")), /*#__PURE__*/React.createElement(NavTabs, {
    variant: "underline",
    value: tab,
    onChange: setTab,
    tabs: [{
      id: 'fila',
      label: 'Aguardando',
      count: fila.length
    }, {
      id: 'at',
      label: 'Em atendimento',
      count: 2
    }, {
      id: 'ok',
      label: 'Atendidas hoje',
      count: 31
    }]
  }), /*#__PURE__*/React.createElement("div", {
    "data-split": true,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 340px',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, cur && /*#__PURE__*/React.createElement(QueueTicketCard, _extends({
    key: cur.ticket
  }, cur, {
    position: 1,
    size: "lg",
    status: "chamada",
    onCall: () => {},
    onSkip: callNext
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
      gap: 16
    }
  }, fila.slice(1).map((f, i) => /*#__PURE__*/React.createElement(QueueTicketCard, _extends({
    key: f.ticket
  }, f, {
    status: "aguardando",
    position: i + 2,
    size: "sm"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-caps"
  }, "Ordem da vez"), D.pros.map(p => /*#__PURE__*/React.createElement(ProfessionalCard, _extends({
    key: p.name
  }, p, {
    onAction: p.status === 'davez' ? callNext : undefined
  }))))));
}
Object.assign(window, {
  OverviewScreen,
  FilaScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/screens-overview.jsx", error: String((e && e.message) || e) }); }

// ui_kits/recepcao/recepcao-screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function RecepcaoFila({
  fila,
  go
}) {
  const {
    Button,
    NavTabs,
    Icon,
    Badge,
    IconButton,
    ThemeToggle
  } = window.NPHairExpressDesignSystem_ba69cf;
  const [t, setT] = React.useState('fila');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "np-caption"
  }, "Ter\xE7a, 30 set"), /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 26
    }
  }, "Ol\xE1, Rafaela")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(ThemeToggle, null), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "Avisos",
    round: true,
    badge: 2
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--xl",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-label",
    style: {
      fontSize: 12
    }
  }, "Na fila"), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 32
    }
  }, fila.length), /*#__PURE__*/React.createElement("div", {
    className: "np-caption"
  }, "espera m\xE9dia 8 min")), /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--xl",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-label",
    style: {
      fontSize: 12
    }
  }, "Livres agora"), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 32,
      color: 'var(--positive-text)'
    }
  }, "1"), /*#__PURE__*/React.createElement("div", {
    className: "np-caption"
  }, "Bianca"))), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    icon: "ticket-plus",
    onClick: () => go('nova')
  }, "Emitir senha"), /*#__PURE__*/React.createElement(NavTabs, {
    value: t,
    onChange: setT,
    tabs: [{
      id: 'fila',
      label: 'Aguardando',
      count: fila.length
    }, {
      id: 'at',
      label: 'Atendendo',
      count: 2
    }],
    style: {
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, (t === 'fila' ? fila : window.NPData.pros.filter(p => p.status === 'atendendo').map(p => ({
    ticket: p.ticket,
    client: p.client,
    service: p.name.split(' ')[0],
    wait: p.elapsed
  }))).map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: f.ticket,
    className: "glass-card glass-card--xl np-fade-up",
    style: {
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      borderColor: i === 0 && t === 'fila' ? 'var(--accent-border)' : undefined
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontSize: 30,
      fontWeight: 900,
      width: 84,
      color: i === 0 && t === 'fila' ? 'var(--accent-display)' : 'var(--text-primary)'
    }
  }, f.ticket), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, f.client), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, f.service, " \xB7 ", f.wait)), i === 0 && t === 'fila' ? /*#__PURE__*/React.createElement(Badge, {
    tone: "solid",
    live: true,
    dot: true
  }, "Chamando") : /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-tertiary)"
  })))));
}
const DS = () => window.NPHairExpressDesignSystem_ba69cf;
function RecepcaoNova({
  onCreate,
  go
}) {
  const {
    Input,
    Button,
    Icon,
    IconButton
  } = DS();
  const servs = ['Escova', 'Escova + babyliss', 'Corte + escova', 'Hidratação', 'Escova · Clube'];
  const [s, setS] = React.useState('Escova');
  const [nome, setNome] = React.useState('');
  const [made, setMade] = React.useState(null);
  if (made) return /*#__PURE__*/React.createElement("div", {
    className: "np-fade-up",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      alignItems: 'stretch',
      textAlign: 'center',
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-caps"
  }, "Senha emitida"), /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--xl glass-card--glow",
    style: {
      padding: 28,
      borderColor: 'var(--accent-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 96,
      fontWeight: 900,
      lineHeight: .95,
      letterSpacing: '-.03em',
      color: 'var(--accent-display)',
      animation: 'np-ticket-in 520ms cubic-bezier(.22,1,.36,1)'
    }
  }, made.ticket), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginTop: 8
    }
  }, made.client), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, made.service, " \xB7 ", made.pos, "\xBA na fila \xB7 cerca de ", made.pos * 6, " min")), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    icon: "printer",
    variant: "secondary"
  }, "Imprimir senha"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    onClick: () => go('fila')
  }, "Voltar para a fila"));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Voltar",
    round: true,
    onClick: () => go('fila')
  }), /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 22
    }
  }, "Emitir senha")), /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--xl",
    style: {
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Cliente",
    icon: "search",
    placeholder: "Nome ou telefone",
    value: nome,
    onChange: e => setNome(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "np-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-field__label"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, servs.map(x => /*#__PURE__*/React.createElement("button", {
    key: x,
    onClick: () => setS(x),
    style: {
      minHeight: 44,
      padding: '0 16px',
      borderRadius: 999,
      border: '1px solid ' + (x === s ? 'transparent' : 'var(--border-strong)'),
      background: x === s ? 'var(--accent)' : 'var(--surface-glass-strong)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'all 200ms'
    }
  }, x)))), /*#__PURE__*/React.createElement("div", {
    className: "np-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-field__label"
  }, "Prefer\xEAncia"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      background: 'var(--surface-inset)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shuffle",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      flex: 1
    }
  }, "Pr\xF3xima da vez"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 18
  })))), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    icon: "ticket-plus",
    onClick: () => {
      const r = onCreate({
        client: nome || 'Cliente sem cadastro',
        service: s
      });
      setMade(r);
    }
  }, "Gerar senha"));
}
function RecepcaoEquipe() {
  const {
    ProfessionalCard
  } = DS();
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 24
    }
  }, "Equipe"), window.NPData.pros.map(p => /*#__PURE__*/React.createElement(ProfessionalCard, _extends({
    key: p.name
  }, p))));
}
function RecepcaoCobrar() {
  const {
    CheckoutCard
  } = DS();
  const D = window.NPData;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 24
    }
  }, "Cobrar"), /*#__PURE__*/React.createElement(CheckoutCard, _extends({}, D.comanda, {
    defaultMethod: "pix"
  })));
}
Object.assign(window, {
  RecepcaoFila,
  RecepcaoNova,
  RecepcaoEquipe,
  RecepcaoCobrar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/recepcao/recepcao-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shared/data.js
try { (() => {
window.NPData = {
  user: {
    name: 'Nilton Prado',
    role: 'Dono',
    subtitle: 'Dono · trocar usuário'
  },
  fila: [{
    ticket: 'A027',
    client: 'Mariana Souza',
    service: 'Escova modelada',
    wait: '12 min',
    status: 'chamada',
    professional: 'Juliana'
  }, {
    ticket: 'A028',
    client: 'Paula Lima',
    service: 'Corte + escova',
    wait: '9 min',
    status: 'aguardando'
  }, {
    ticket: 'C014',
    client: 'Renata Alves',
    service: 'Escova · Clube',
    wait: '7 min',
    status: 'aguardando'
  }, {
    ticket: 'A029',
    client: 'Fernanda Dias',
    service: 'Hidratação',
    wait: '4 min',
    status: 'aguardando'
  }, {
    ticket: 'A030',
    client: 'Larissa Gomes',
    service: 'Escova',
    wait: '2 min',
    status: 'aguardando'
  }, {
    ticket: 'A031',
    client: 'Beatriz Nunes',
    service: 'Escova + babyliss',
    wait: 'agora',
    status: 'aguardando'
  }],
  pros: [{
    name: 'Juliana Prado',
    role: 'Escovista',
    status: 'davez',
    turn: 1,
    today: 7
  }, {
    name: 'Bianca Rocha',
    role: 'Escovista',
    status: 'livre',
    turn: 2,
    today: 4
  }, {
    name: 'Carla Mendes',
    role: 'Cabeleireira',
    status: 'atendendo',
    turn: 3,
    today: 5,
    ticket: 'A024',
    client: 'Tatiane · Escova',
    elapsed: '18:42'
  }, {
    name: 'Débora Lins',
    role: 'Escovista',
    status: 'atendendo',
    turn: 4,
    today: 6,
    ticket: 'A025',
    client: 'Sônia · Corte',
    elapsed: '06:10'
  }],
  comanda: {
    number: '#1042',
    client: 'Mariana Souza',
    ticket: 'A027',
    items: [{
      name: 'Escova modelada',
      pro: 'Juliana',
      price: 60
    }, {
      name: 'Hidratação express',
      pro: 'Juliana',
      price: 45
    }]
  },
  caixa: [{
    label: 'Dinheiro',
    expected: 640,
    counted: 628
  }, {
    label: 'Pix',
    expected: 1820
  }, {
    label: 'Débito',
    expected: 910
  }, {
    label: 'Crédito',
    expected: 1340
  }],
  clientes: [{
    name: 'Mariana Souza',
    phone: '(11) 98123-4410',
    last: 'Hoje',
    visits: 24,
    club: true,
    spent: 1840
  }, {
    name: 'Paula Lima',
    phone: '(11) 99702-1187',
    last: '22/09',
    visits: 8,
    club: false,
    spent: 620
  }, {
    name: 'Renata Alves',
    phone: '(11) 97455-0921',
    last: '19/09',
    visits: 31,
    club: true,
    spent: 2390
  }, {
    name: 'Fernanda Dias',
    phone: '(11) 98840-3376',
    last: '15/09',
    visits: 5,
    club: false,
    spent: 410
  }, {
    name: 'Larissa Gomes',
    phone: '(11) 99311-6684',
    last: '12/09',
    visits: 12,
    club: true,
    spent: 980
  }, {
    name: 'Beatriz Nunes',
    phone: '(11) 98276-5530',
    last: '02/09',
    visits: 3,
    club: false,
    spent: 215
  }],
  pendencias: [{
    severity: 'alta',
    title: 'Falta de R$ 12,00 no caixa',
    description: 'Fechamento de 29/09 não conferiu no dinheiro.',
    owner: 'Rafaela · recepção',
    when: 'Ontem, 19:40',
    value: '− R$ 12,00'
  }, {
    severity: 'media',
    title: 'Comanda #1038 sem forma de pagamento',
    description: 'Aberta às 16:10; a profissional já foi liberada.',
    owner: 'Juliana Prado',
    when: 'Hoje, 16:10'
  }, {
    severity: 'media',
    title: 'Pacote de 5 escovas vence amanhã',
    description: 'Cliente Renata Alves ainda tem 2 escovas.',
    owner: 'Recepção',
    when: 'Vence 01/10'
  }, {
    severity: 'baixa',
    title: '3 clientes sem telefone cadastrado',
    description: 'Atualize no próximo atendimento.',
    owner: 'Recepção',
    when: 'Semana'
  }],
  semana: [1820, 2140, 1960, 2780, 3120, 4280, 0],
  diasSemana: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
};
window.NPData.brl = v => (Number(v) || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/data.js", error: String((e && e.message) || e) }); }

// ui_kits/shared/phone-chrome.jsx
try { (() => {
function StatusBar() {
  const {
    Icon
  } = window.NPHairExpressDesignSystem_ba69cf;
  return /*#__PURE__*/React.createElement("div", {
    className: "phone-status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-num",
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600
    }
  }, "14:32"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 16
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 16
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 18
  })));
}
function TabBar({
  tabs,
  value,
  onChange
}) {
  const {
    Icon
  } = window.NPHairExpressDesignSystem_ba69cf;
  return /*#__PURE__*/React.createElement("nav", {
    className: "phone-tabbar",
    role: "tablist"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    role: "tab",
    "aria-selected": t.id === value,
    className: "phone-tab",
    onClick: () => onChange(t.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: 22
  }), t.label)));
}
Object.assign(window, {
  StatusBar,
  TabBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/phone-chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/terminal/terminal-screens.jsx
try { (() => {
function useTimer(running) {
  const [s, setS] = React.useState(0);
  React.useEffect(() => {
    if (!running) {
      setS(0);
      return;
    }
    const t = setInterval(() => setS(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function TerminalHeader({
  status,
  turn
}) {
  const {
    Avatar,
    StatusPill,
    ThemeToggle
  } = window.NPHairExpressDesignSystem_ba69cf;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Juliana Prado",
    size: 48,
    style: {
      boxShadow: status === 'davez' ? '0 0 0 3px var(--accent)' : status === 'livre' ? '0 0 0 3px var(--positive)' : undefined
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600
    }
  }, "Juliana Prado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, status === 'atendendo' ? 'Em atendimento' : turn + 'º na ordem da vez')), /*#__PURE__*/React.createElement(StatusPill, {
    status: status
  }), /*#__PURE__*/React.createElement(ThemeToggle, null));
}
function AtendimentoFlow() {
  const DS = window.NPHairExpressDesignSystem_ba69cf;
  const {
    Button,
    Icon,
    Badge,
    GlassCard
  } = DS;
  const [st, setSt] = React.useState('livre');
  const [turn, setTurn] = React.useState(2);
  const [extra, setExtra] = React.useState([]);
  const timer = useTimer(st === 'atendendo');
  React.useEffect(() => {
    if (st === 'livre') {
      const t = setTimeout(() => {
        setSt('davez');
        setTurn(1);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [st]);
  const servs = [{
    n: 'Escova modelada',
    v: 60
  }].concat(extra);
  if (st === 'livre') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TerminalHeader, {
    status: "livre",
    turn: turn
  }), /*#__PURE__*/React.createElement(GlassCard, {
    radius: "xl",
    style: {
      textAlign: 'center',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      margin: '0 auto 12px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--positive-soft)',
      color: 'var(--positive-text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "coffee",
    size: 30
  })), /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 24
    }
  }, "Voc\xEA est\xE1 livre"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, "Falta 1 profissional antes de voc\xEA. Fique de olho: o celular vibra quando for a sua vez.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: "pause"
  }, "Pausa"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: "list-ordered"
  }, "Ver fila")));
  if (st === 'davez') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TerminalHeader, {
    status: "davez",
    turn: 1
  }), /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--xl glass-card--glow",
    style: {
      padding: 24,
      borderColor: 'var(--accent-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "np-caps",
    style: {
      color: 'var(--accent-text)'
    }
  }, "\xC9 a sua vez \xB7 pr\xF3xima cliente"), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 104,
      fontWeight: 900,
      lineHeight: .95,
      letterSpacing: '-.03em',
      color: 'var(--accent-display)',
      textShadow: 'var(--accent-text-glow)',
      animation: 'np-ticket-in 520ms cubic-bezier(.22,1,.36,1)'
    }
  }, "A027"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600
    }
  }, "Mariana Souza"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, "Escova modelada"), /*#__PURE__*/React.createElement(Badge, null, "Esperando 12 min"))), /*#__PURE__*/React.createElement(Button, {
    size: "xl",
    block: true,
    icon: "megaphone",
    onClick: () => setSt('atendendo')
  }, "Chamar e iniciar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: "volume-2"
  }, "Repetir"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "ghost",
    icon: "user-x",
    onClick: () => {
      setSt('livre');
      setTurn(4);
    }
  }, "N\xE3o veio")));
  if (st === 'atendendo') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TerminalHeader, {
    status: "atendendo"
  }), /*#__PURE__*/React.createElement(GlassCard, {
    radius: "xl",
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 40,
      fontWeight: 900,
      lineHeight: 1
    }
  }, "A027"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      marginTop: 4
    }
  }, "Mariana Souza")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "np-caps"
  }, "Tempo"), /*#__PURE__*/React.createElement("div", {
    className: "np-num",
    style: {
      fontSize: 30,
      color: 'var(--accent-display)'
    }
  }, timer))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      flexDirection: 'column'
    }
  }, servs.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "np-fade-up",
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderTop: '1px solid var(--divider)',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", null, s.n), /*#__PURE__*/React.createElement("span", {
    className: "np-num"
  }, window.NPData.brl(s.v)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: "droplets",
    onClick: () => setExtra([...extra, {
      n: 'Hidratação express',
      v: 45
    }])
  }, "Hidrata\xE7\xE3o"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: "plus",
    onClick: () => setExtra([...extra, {
      n: 'Babyliss',
      v: 25
    }])
  }, "Babyliss")), /*#__PURE__*/React.createElement(Button, {
    size: "xl",
    block: true,
    variant: "success",
    icon: "check",
    onClick: () => setSt('fim')
  }, "Finalizar atendimento"));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TerminalHeader, {
    status: "livre",
    turn: 4
  }), /*#__PURE__*/React.createElement("div", {
    className: "glass-card glass-card--xl np-fade-up",
    style: {
      padding: 28,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      margin: '0 auto 14px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--positive)',
      color: 'var(--text-on-accent)',
      animation: 'np-pop 420ms cubic-bezier(.34,1.56,.64,1)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 36,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 24
    }
  }, "Atendimento enviado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, "A comanda #1042 foi para a recep\xE7\xE3o. Voc\xEA voltou para o fim da vez (4\xBA).")), /*#__PURE__*/React.createElement(Button, {
    size: "xl",
    block: true,
    variant: "secondary",
    onClick: () => {
      setExtra([]);
      setTurn(2);
      setSt('livre');
    }
  }, "Voltar"));
}
function MeuDia() {
  const {
    StatCard,
    GlassCard,
    BarChart
  } = window.NPHairExpressDesignSystem_ba69cf;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "np-display",
    style: {
      fontSize: 26
    }
  }, "Meu dia"), /*#__PURE__*/React.createElement(StatCard, {
    title: "Atendimentos hoje",
    value: "7",
    change: "16",
    hint: "vs. ter\xE7a passada",
    icon: "scissors"
  }), /*#__PURE__*/React.createElement(StatCard, {
    title: "Comiss\xE3o prevista",
    value: "R$ 312,40",
    change: "9,8",
    icon: "wallet"
  }), /*#__PURE__*/React.createElement(GlassCard, {
    title: "Atendimentos por hora"
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 160,
    highlight: 4,
    data: ['9h', '10h', '11h', '13h', '14h', '15h'].map((l, i) => ({
      label: l,
      value: [1, 2, 1, 1, 2, 0.4][i]
    }))
  })));
}
function Perfil() {
  const {
    GlassCard,
    Avatar,
    Button,
    Badge
  } = window.NPHairExpressDesignSystem_ba69cf;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GlassCard, {
    radius: "xl",
    style: {
      textAlign: 'center',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Juliana Prado",
    size: 88
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      marginTop: 12
    }
  }, "Juliana Prado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "Escovista \xB7 desde 2022"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, "Escova"), /*#__PURE__*/React.createElement(Badge, null, "Babyliss"), /*#__PURE__*/React.createElement(Badge, null, "Hidrata\xE7\xE3o"))), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    variant: "secondary",
    icon: "log-out"
  }, "Sair do terminal"));
}
Object.assign(window, {
  AtendimentoFlow,
  MeuDia,
  Perfil
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/terminal/terminal-screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.LoginSlider = __ds_scope.LoginSlider;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.CountBadge = __ds_scope.CountBadge;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.ThemeToggle = __ds_scope.ThemeToggle;

__ds_ns.UploadButton = __ds_scope.UploadButton;

__ds_ns.CashCard = __ds_scope.CashCard;

__ds_ns.Receipt = __ds_scope.Receipt;

__ds_ns.DiffField = __ds_scope.DiffField;

__ds_ns.CheckoutCard = __ds_scope.CheckoutCard;

__ds_ns.PendingCard = __ds_scope.PendingCard;

__ds_ns.QueueTicketCard = __ds_scope.QueueTicketCard;

__ds_ns.ProfessionalCard = __ds_scope.ProfessionalCard;

__ds_ns.GlassSidebar = __ds_scope.GlassSidebar;

__ds_ns.NavTabs = __ds_scope.NavTabs;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.CalendarCard = __ds_scope.CalendarCard;

__ds_ns.TaskList = __ds_scope.TaskList;

__ds_ns.GlassCard = __ds_scope.GlassCard;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.LineChart = __ds_scope.LineChart;

__ds_ns.BarChart = __ds_scope.BarChart;

})();
