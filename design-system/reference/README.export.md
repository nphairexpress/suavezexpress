# NP Hair Express — Design System ("Sua Vez Express")

Design system do **Sua Vez Express**, o sistema web de gestão do salão **NP Hair Express** (Salto/SP). Cobre a fila de atendimento por senha, comanda/checkout, caixa, clientes, Clube da Escova (assinatura) e pacotes, pendências de fechamento, comissões, relatórios e permissões.

- **Stack de produção:** React + Vite + Tailwind + shadcn/ui + Framer Motion + lucide-react.
- **Quem usa:** a equipe no celular durante o atendimento (recepção e profissionais); o dono no desktop; a TV da recepção mostra a fila.
- **Idioma:** português do Brasil em todos os textos. Valores em R$ (`toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`).
- **Direção visual:** glassmorphism com profundidade sobre fundo escuro desfocado, com um único destaque âmbar.

## Fontes e referências recebidas
Tudo em `uploads/` (imagens; nenhum código, Figma ou repositório foi anexado):
- `codexr_sidebar_glass.jpg`, `codexr_admin_dashboard_v7_glass.jpg`, `codexr_admin_dashboard_v7_claro.jpg`: posts do @code.xr ("Sidebar UI", "Admin Dashboard V7"). **Referência principal**: sidebar de vidro flutuante, glass cards, hover y:-5 e o snippet `StatsCard` (motion.div, `glass-card p-6 rounded-2xl`, `text-white/60`, `text-2xl font-bold`, `text-emerald-400` + `ArrowUpRight`).
- `mindbridge_light_glass_1/2/3.jpg` (Phenomenon Studio): **variante clara**, com painéis brancos translúcidos, cards de 24 px, agenda em colunas e perfil com foto.
- `acervo_sidebar_glass_submenu.png`, `acervo_dashboards_trio.png`, `preview.png` (login deslizante), `preview-dashboard2.png`, `preview-dashboard3.png`: **componentes React já comprados** que serão usados no código. O design system foi construído sobre eles, só recolorindo.
- `logo_np_express.png`, `logo_np_express_fundo_preto.png`: logo oficial.

O código-fonte dos componentes comprados **não** foi enviado. As recriações aqui vêm só das capturas de tela. Quando o código chegar, medidas exatas (paddings, raios, durações) devem ser conferidas e corrigidas.

## Índice
- `styles.css`: ponto de entrada (só `@import`).
- `tokens/`: `fonts.css`, `colors.css` (inclui o tema `[data-theme="light"]`), `typography.css`, `spacing.css`, `effects.css`.
- `styles/`: `base.css` (fundos, `.glass-card`, keyframes) e `components.css` (classes `.np-*` usadas pelos componentes).
- `components/`: primitivos React (ver lista abaixo); cada um com `.jsx`, `.d.ts`, `.prompt.md` e um card `.card.html` por pasta.
- `ui_kits/`: `login/`, `painel/`, `recepcao/`, `terminal/`, `tv/`, mais `shared/` (dados de exemplo e moldura de celular).
- `guidelines/`: cards de fundamentos (cores, tipo, espaçamento, efeitos, marca).
- `assets/`: logos e fundos.
- `_dev/load-ds.js`: carregador de reserva usado só em pré-visualização quando `_ds_bundle.js` ainda não foi compilado (não faz nada se o bundle existir).
- `SKILL.md`: instruções para uso como Agent Skill.

## Componentes
Namespace do bundle: `window.NPHairExpressDesignSystem_ba69cf`.

**core** (`components/core/`)
- `Icon`: ícone Lucide (adição intencional, ver abaixo)
- `ThemeToggle`: interruptor de tema "acender e apagar a luz" (+ `ThemeToggle.init()`, `.apply()`, `.useTheme()`)
- `Button`, `IconButton`
- `UploadButton`: botão de upload com micro-interação (padrão de botão com feedback do acervo)
- `Input`, `Checkbox`
- `Badge`, `CountBadge`, `StatusPill`, `Avatar`

**surfaces** (`components/surfaces/`)
- `GlassCard`, `StatCard` (padrão StatsCard do @code.xr)
- `LineChart`, `BarChart`
- `CalendarCard`, `TaskList` (calendário lateral e lista de tarefas do trio de dashboards)

**navigation** (`components/navigation/`)
- `GlassSidebar`: sidebar de vidro flutuante com submenu e "Recolher"
- `NavTabs`: navigation tabs com indicador deslizante
- `TopBar`: cabeçalho de tela com saudação, busca, interruptor de tema, sino e usuário

**auth** (`components/auth/`)
- `LoginSlider`: login deslizante com foto (estrutura do componente comprado)

**domain / salão** (`components/domain/`)
- `QueueTicketCard`: cartão da fila com SENHA gigante
- `ProfessionalCard`: status "Da vez" / "Livre" / "Atendendo"
- `CheckoutCard` + `DiffField`: comanda com formas de pagamento e campo "Diferença"
- `CashCard`: caixa com falta em vermelho
- `Receipt`: cupom de comprovante
- `PendingCard`: pendência por gravidade

### Adições intencionais
- `Icon`: wrapper do Lucide via CDN, porque os componentes não podem importar `lucide-react` aqui.
- `TopBar`, `CountBadge`, `StatusPill`, `Avatar`, `DiffField`: peças repetidas nas referências e nos componentes obrigatórios, extraídas para não duplicar código.
- Componentes de domínio (fila, comanda, caixa, cupom, pendência, profissional): pedidos no briefing; não existem no acervo.

## UI kits
- `ui_kits/login/`: tela de login (LoginSlider). "Entrar" leva ao painel.
- `ui_kits/painel/`: painel desktop do dono com Visão geral, Fila, Comanda, Caixa, Clientes, Clube, Pendências, Comissões, Relatórios e Permissões.
- `ui_kits/recepcao/`: recepção no celular (fila, emitir senha, equipe, cobrar).

Todos os kits funcionam nos dois temas e compartilham a escolha salva em `np-theme`.
- `ui_kits/terminal/`: terminal da profissional, escuro, com botões de 48 a 64 px (livre → da vez → atendendo → finalizado).
- `ui_kits/tv/`: TV da fila em 1920×1080, com a senha chamada em 280 px e troca a cada 6 s.

---

## TEMAS: CLARO × ESCURO

O sistema inteiro funciona nos dois temas com **os mesmos tokens semânticos**. Só muda o atributo no elemento raiz:

- `<html data-theme="dark">` (padrão): vidro escuro sobre fundo grafite desfocado, texto branco 100/60/50.
- `<html data-theme="light">`: variante MindBridge, com painéis brancos translúcidos sobre gradiente névoa + foto clara e texto grafite `#17120F` 100/68/60.

Regras:
1. **Componentes não usam cor fixa.** Fundo, vidro, borda, texto, sombra, brilho, sidebar, abas, avatar, gráficos e cupom vêm de variáveis (`--bg-app`, `--surface-glass`, `--border-glass`, `--text-primary/secondary/tertiary`, `--shadow-*`, `--accent-*`, `--sidebar-*`, `--tabs-*`, `--avatar-*`, `--chart-*`, `--receipt-*`). Os tokens brutos `--np-*` existem só para definir os semânticos.
2. **Âmbar `#F09000` é a única cor de ação nos dois temas** (botão primário, item ativo, aba ativa, contagens). O texto sobre âmbar é sempre `--text-on-accent` (preto).
3. **Texto âmbar** muda de tom para manter AA: `--accent-text` (texto pequeno) = `#F7A100` no escuro e `#9A5A00` no claro; `--accent-display` (senhas e números ≥ 24 px) = `#F7A100` / `#B86A00`. O brilho da senha (`--accent-text-glow`) some no claro.
4. **Logo só em fundo escuro.** No tema claro o logo fica numa cápsula preta (`.np-logo-chip`). O painel da foto do login força `data-theme="dark"` no próprio elemento e continua escuro nos dois temas.
5. **Persistência:** `localStorage["np-theme"]`. Na primeira visita, `prefers-color-scheme`. Chame `ThemeToggle.init()` antes do primeiro render para não piscar.
6. **Onde fica o interruptor:** `TopBar themeToggle` e `GlassSidebar themeToggle="collapsed"` (aparece na barra de ícones). Login: pílula no canto. Recepção e terminal: no cabeçalho. TV: ao lado do relógio. Rótulo acessível "Acender a luz" (escuro → claro, ícone sol) / "Apagar a luz" (claro → escuro, ícone lua).
7. **Contraste AA nos dois temas:** texto terciário a 50 % no escuro e 60 % no claro; vermelho e verde de texto ficam mais escuros no claro (`#B91C1C`, `#15803D`); o vermelho sólido com texto branco usa `#DC2626`.
8. Escopo aninhado: qualquer elemento pode forçar `data-theme="dark"` ou `"light"` para uma ilha (ex.: painel da foto).

## CONTENT FUNDAMENTALS

**Voz:** direta, calorosa, de balcão de salão. A interface fala com a pessoa como uma colega da recepção falaria. Frases curtas, verbos no imperativo nos botões, sem jargão técnico.

- **Pessoa:** "você" para a usuária ("É a sua vez", "Você está livre"). O sistema não fala em primeira pessoa.
- **Saudações:** pelo primeiro nome e pela hora do dia: "Bom dia, Nilton", "Olá, Rafaela", "Olá, equipe!".
- **Botões:** verbo + objeto, com a primeira letra maiúscula e o resto minúsculo: "Nova comanda", "Chamar próxima", "Emitir senha", "Finalizar e imprimir", "Registrar falta", "Fechar caixa". Nada de CAIXA ALTA em botões.
- **Caixa alta** só em rótulos de seção pequenos e espaçados (MENU, GESTÃO, GERAL, SENHA · 1º NA FILA, COMANDA #1042).
- **Status curtos e fixos:** "Da vez", "Livre", "Atendendo", "Em pausa", "Aguardando", "Chamando agora", "Aberto", "Fechado", "Resolvida".
- **Números:** sempre formatados pt-BR: `R$ 1.280,50`, `30/09/2026 14:32`, `12 min`, `18:42` (cronômetro), `7º na fila`. Senhas: letra + 3 dígitos (`A027`; `C014` para Clube).
- **Dinheiro e erro:** falta é dita claramente: "Falta no caixa − R$ 12,00", "Diferença · falta". Troco: "Diferença · troco". Use "−" (sinal de menos) e não hífen.
- **Mensagens de apoio:** explicam o próximo passo: "A comanda #1042 foi para a recepção. Você voltou para o fim da vez (4º)."
- **Slogan da marca:** "Beleza pra quem não para!" (no logo, no rodapé da TV e no cupom).
- **Emoji:** não usamos. As referências usam 👋/🙌, mas aqui o tom vem do texto e dos ícones Lucide.

## VISUAL FOUNDATIONS

**Cores.** Base preta quente `#17120F`, com neutros grafite (`#0D0A08` a `#453D38`). **Âmbar `#F09000`** é a única cor de ação (botão primário, item ativo, aba ativa, contagens, gráficos, brilhos); `#F7A100` no hover e `#D67F00` no press. Verde `#22C55E` para positivo e "Livre"; vermelho `#EF4444` para alerta e falta de caixa. Nada de creme, bege ou dourado. Onde as referências usam vermelho/laranja/roxo/azul como destaque, usamos o âmbar. Texto sobre âmbar é sempre preto (branco não passa AA).

**Tipografia.** Montserrat 800/900 em títulos, números grandes e senhas (tracking −2 a −4 %). Poppins 400/500/600 no resto. `font-variant-numeric: tabular-nums` em todo o app. Sem serifa. A escala vai de 11 a 48 px na interface, e as senhas usam 48 / 88 / 140 / 280 px.

**Hierarquia por opacidade.** Texto sobre vidro: valor 100 %, rótulo 60 %, legenda 50 % no escuro; 100 / 68 / 60 % de grafite no claro. A referência usa 40 % na legenda; subimos para garantir AA nos dois temas.

**Fundos.** Foto escura desfocada em grafite (`assets/bg-graphite.jpg`, ondas em `bg-waves-portrait.jpg` no celular), coberta por um gradiente preto e **um ou dois brilhos radiais âmbar** nos cantos. Nada de gradiente agressivo em tela cheia. No tema claro: névoa `#EEEEF0` + a mesma foto clareada + um brilho âmbar suave.

**Vidro.** `.glass-card`: fundo `rgba(30,25,22,.55)`, `backdrop-filter: blur(20px) saturate(140%)`, borda 1 px branca a 10 %, sombra `0 8px 32px rgba(0,0,0,.35)` e realce interno `inset 0 1px 0 rgba(255,255,255,.08)`. Variantes: `--strong` (78 %, modais/TV), `--glow` (brilho âmbar, para "Da vez" e senha chamada) e `--accent` (âmbar sólido, no máximo um por tela). No tema claro o vidro é branco a 62 % com borda branca a 85 %.

**Cartões.** Raio 16 px (`rounded-2xl`), padding 24 px. Painéis grandes, a sidebar e o tema claro usam 24 px. Sem borda lateral colorida: a gravidade aparece em ícone sólido + etiqueta + brilho.

**Raios.** 8 · 12 (botões, campos) · 16 (cards) · 24 (sidebar, painéis) · 28 (login) · 32 · pílula.

**Sombras.** Externas suaves e escuras; o brilho âmbar `0 8px 24px rgba(240,144,0,.35)` só aparece em elementos âmbar ou "da vez". O alerta de caixa ganha um brilho vermelho de 18 %.

**Navegação lateral.** Sidebar flutuante, solta 16 px das bordas, 280 px aberta e 84 px recolhida. Item ativo em **bloco âmbar sólido** com texto preto. Seções com rótulo em caixa alta espaçada, separadores com brilho no centro e contagens em pílula âmbar. Submenu expande com `grid-template-rows` (420 ms).

**Movimento.** `ease-out cubic-bezier(.22,1,.36,1)` em 240 ms como padrão; mola `cubic-bezier(.34,1.56,.64,1)` em 420 ms para indicadores de abas e "pop" de confirmação. Cartões sobem 5 px no hover (padrão `whileHover={{ y: -5 }}`). Telas entram com fade + 8 px para cima. A senha chamada entra com escala 0,85 → 1 e desfoque 8 → 0. Pontos "ao vivo" pulsam (1,6 s). `prefers-reduced-motion` desliga tudo.

**Estados.** Hover: vidro um pouco mais claro (inset 6 % → 10 %), primário sobe 1 px com sombra âmbar. Press: `scale(.97)` em botões e `.94` em ícones. Foco: anel âmbar de 2 px com offset 2. Desabilitado: 45 % de opacidade.

**Toque.** Mínimo de 44 px em tudo. Terminal da profissional com 48 / 52 / 64 px. Na TV os textos têm 24 px ou mais.

**Transparência e blur.** Só em superfícies sobre o fundo fotográfico (cards, sidebar, abas, barra inferior do celular). Dentro de um card, os campos usam preenchimento branco a 6 %, sem blur novo.

**Imagens.** Tons frios a neutros, dessaturadas, escuras, com grão natural da foto. A cor vem só do brilho âmbar.

**Exceção:** o cupom (`Receipt`) é papel branco com borda serrilhada, o único elemento opaco claro no tema escuro.

## ICONOGRAPHY

- **Sistema:** [Lucide](https://lucide.dev), o mesmo `lucide-react` do código de produção e das referências (`ShoppingBag`, `Users`, `DollarSign`, `ArrowUpRight`). Aqui ele vem via CDN (`lucide@0.460.0` UMD) e é carregado pelo componente `Icon` sob demanda.
- **Estilo:** traço 2 px, cantos arredondados, `currentColor`. Tamanhos: 14 a 16 inline, 18 a 20 em botões e na nav, 22 a 24 em cards/quadrado de ícone, 30 a 40 no terminal/TV.
- **Ícones frequentes:** `layout-dashboard`, `ticket`, `ticket-plus`, `shopping-bag`, `users`, `crown` (Clube), `percent`, `chart-no-axes-column`, `shield-check`, `scissors`, `megaphone`, `banknote`, `qr-code` (Pix), `credit-card`, `wallet`, `triangle-alert`, `octagon-alert`, `circle-check`, `bell`, `search`, `log-out`.
- **Quadrado de ícone** do StatCard: 48 px, raio 14, gradiente âmbar 400→600, ícone preto.
- **Sem emoji, sem ícones em PNG, sem fonte de ícones própria.** Unicode só para "·", "º" e "−".
- **Logo:** `assets/logo-np-express.png` (com slogan) e `assets/logo-np-express-wordmark.png` (sem slogan), ambos PNG transparentes extraídos do original preto. **Usar só em fundo escuro.** Em fundo claro (cupom), escrever "NP HAIR EXPRESS" em Montserrat 900. Originais em `assets/logo-np-express-original.png` e `assets/logo-np-express-fundo-preto.png`.

## Pendências / substituições
- **Fontes:** Montserrat e Poppins vêm do Google Fonts (CDN); não recebemos arquivos `.ttf/.woff2`.
- **Foto do salão:** não recebemos. Os fundos são as fotos das referências (montanhas do acervo, ondas 3D do @code.xr) dessaturadas para grafite.
- Login social ("Or sign in with") do componente original foi omitido.
