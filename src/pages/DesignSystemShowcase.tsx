import * as React from "react";
import {
  AppShell,
  Avatar,
  Badge,
  BarChart,
  Button,
  CalendarCard,
  CashCard,
  CheckoutCard,
  Checkbox,
  CountBadge,
  DiffField,
  EmptyState,
  GlassCard,
  GlassSidebar,
  IconButton,
  Input,
  LineChart,
  LoginSlider,
  NavTabs,
  NpThemeProvider,
  PageHeader,
  PasswordInput,
  PendingCard,
  ProfessionalCard,
  QueueTicketCard,
  Receipt,
  RecordsTable,
  StatCard,
  StatusPill,
  Tag,
  TaskList,
  ThemeToggle,
  TopBar,
  UploadButton,
  brl,
  npAssets,
  type NpTheme,
  type RecordsColumn,
  type SidebarSection,
  type TaskItem,
} from "@design-system";

/*
 * Vitrine do design system (/design-system). Rota lazy, fora do menu, sem gate nesta branch
 * (o headless precisa abrir sem login). Renderiza a biblioteca inteira; o interruptor sol/lua
 * troca o tema da página toda e ?theme=light|dark força o tema inicial (prova visual).
 * O ThemeProvider envolve SÓ esta rota: ao sair, o <html> do app volta como estava.
 */

const NAV: SidebarSection[] = [
  {
    title: "Menu",
    items: [
      { id: "visao", label: "Visão geral", icon: "layout-dashboard" },
      { id: "fila", label: "Fila", icon: "ticket", badge: 6 },
      {
        id: "vendas",
        label: "Vendas",
        icon: "shopping-bag",
        children: [
          { id: "comanda", label: "Comanda", badge: 3 },
          { id: "caixa", label: "Caixa" },
          { id: "pendencias", label: "Pendências", badge: 4, badgeTone: "danger" },
        ],
      },
      { id: "clientes", label: "Clientes", icon: "users" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { id: "clube", label: "Clube da Escova", icon: "crown" },
      { id: "comissoes", label: "Comissões", icon: "percent" },
      { id: "relatorios", label: "Relatórios", icon: "chart-no-axes-column" },
    ],
  },
  { title: "Geral", items: [{ id: "ds", label: "Design system", icon: "shield-check" }] },
];

const SWATCHES: { name: string; v: string }[] = [
  { name: "Preto NP", v: "--np-black" },
  { name: "Âmbar 600 · press", v: "--np-amber-600" },
  { name: "Âmbar 500 · ação", v: "--np-amber-500" },
  { name: "Âmbar 400 · hover", v: "--np-amber-400" },
  { name: "Verde · livre", v: "--np-green-500" },
  { name: "Vermelho · alerta", v: "--np-red-500" },
];

const SEMANTIC: { name: string; v: string }[] = [
  { name: "Fundo", v: "--np-bg-app" },
  { name: "Vidro", v: "--np-surface-glass" },
  { name: "Inset", v: "--np-surface-inset" },
  { name: "Texto", v: "--np-text-primary" },
  { name: "Texto 2", v: "--np-text-secondary" },
  { name: "Âmbar texto", v: "--np-accent-text" },
];

type Cliente = { id: string; nome: string; tags: { l: string; t: "accent" | "positive" | "danger" | "neutral" }[]; ultima: string; dias: number; gasto: number };
const CLIENTES: Cliente[] = [
  { id: "1", nome: "Juliana Prado", tags: [{ l: "Clube", t: "accent" }, { l: "Escova", t: "neutral" }], ultima: "Hoje, 10:12", dias: 0, gasto: 1280.5 },
  { id: "2", nome: "Rafaela Mendes", tags: [{ l: "Progressiva", t: "positive" }], ultima: "Há 9 dias", dias: 9, gasto: 640 },
  { id: "3", nome: "Camila Souza", tags: [{ l: "Débito pendente", t: "danger" }], ultima: "Há 32 dias", dias: 32, gasto: 210 },
  { id: "4", nome: "Beatriz Lima", tags: [{ l: "Clube", t: "accent" }, { l: "Mecha", t: "neutral" }], ultima: "Há 3 dias", dias: 3, gasto: 2340 },
  { id: "5", nome: "Ana Paula Reis", tags: [{ l: "Manicure", t: "neutral" }], ultima: "Há 15 dias", dias: 15, gasto: 395 },
];

const COLS: RecordsColumn<Cliente>[] = [
  { key: "tags", header: "Etiquetas", icon: "tag", render: (r) => r.tags.map((t) => <Tag key={t.l} label={t.l} tone={t.t} />) },
  { key: "ultima", header: "Última visita", icon: "clock", sortValue: (r) => r.dias, render: (r) => <span className={r.dias > 30 ? "np-text-tertiary" : undefined}>{r.ultima}</span> },
  {
    key: "gasto",
    header: "Gasto no ano",
    icon: "wallet",
    align: "right",
    sortValue: (r) => r.gasto,
    render: (r) => <span className="np-num">{brl(r.gasto)}</span>,
    footer: (rows) => <span className="np-num">{brl(rows.reduce((s, r) => s + r.gasto, 0))}</span>,
  },
];

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="ds-section">
      <div className="np-caps">{eyebrow}</div>
      <h2 className="np-display ds-section__title">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="ds-row-wrap">
      {label && <div className="np-caption ds-row-label">{label}</div>}
      <div className="ds-row">{children}</div>
    </div>
  );
}

function Showcase() {
  const [active, setActive] = React.useState("ds");
  const [tab, setTab] = React.useState("fundamentos");
  const [tasks, setTasks] = React.useState<TaskItem[]>([
    { title: "Conferir caixa de ontem", meta: "Recepção · Max", duration: "15 min", progress: 100, done: true },
    { title: "Repor estoque de queratina", meta: "Estoque", duration: "30 min", progress: 40 },
    { title: "Fechar comissões de setembro", meta: "Financeiro", duration: "1 h", progress: 65 },
  ]);
  const go = (id: string) => {
    setTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppShell
      screenKey="ds"
      sidebar={{ logoSrc: npAssets.logoWordmark, user: { name: "Nilton", subtitle: "Dono · trocar usuário" }, notifications: 3, themeToggle: "switch", sections: NAV, footer: [{ id: "sair", label: "Sair", icon: "log-out" }], activeId: active, onSelect: setActive }}
      topBar={{ title: "Bom dia, Nilton", subtitle: "Vitrine do design system · os dois temas", themeToggle: true, notifications: 4, user: { name: "Nilton", role: "Dono" } }}
    >
      <PageHeader
        eyebrow="Biblioteca"
        title="Sua Vez Express · design system"
        description="Vidro sobre fundo desfocado, âmbar como única cor de ação, Montserrat nos títulos e números, Poppins no texto. Use o interruptor sol/lua para acender e apagar a luz."
        actions={
          <>
            <ThemeToggle variant="pill" />
            <Button icon="plus">Nova comanda</Button>
          </>
        }
      >
        <NavTabs
          aria-label="Seções da vitrine"
          value={tab}
          onChange={go}
          tabs={[
            { id: "fundamentos", label: "Fundamentos", icon: "layout-dashboard" },
            { id: "core", label: "Componentes", icon: "settings" },
            { id: "superficies", label: "Superfícies", icon: "chart-no-axes-column" },
            { id: "salao", label: "Salão", icon: "scissors", count: 7 },
            { id: "navegacao", label: "Navegação", icon: "menu" },
            { id: "acesso", label: "Acesso", icon: "shield-check" },
            { id: "dados", label: "Tabela", icon: "users", dot: true },
          ]}
        />
      </PageHeader>

      <div className="ds-stats">
        <StatCard title="Faturamento do dia" value="R$ 4.280,00" change="12,5" icon="banknote" hint="vs. ontem" />
        <StatCard title="Atendimentos" value="38" change="8" icon="scissors" />
        <StatCard title="Ticket médio" value="R$ 112,60" change="3,1" trend="down" icon="wallet" />
        <StatCard title="Senha chamada" value="A027" icon="megaphone" accent />
      </div>

      <Section id="fundamentos" eyebrow="Fundamentos" title="Cores, tipografia e vidro">
        <div className="ds-grid-2">
          <GlassCard title="Marca" subtitle="Âmbar é a única cor de ação">
            <div className="ds-swatches">
              {SWATCHES.map((s) => (
                <div key={s.v} className="ds-swatch">
                  <i style={{ background: `var(${s.v})` }} />
                  <b>{s.name}</b>
                  <code>{s.v}</code>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard title="Semânticos do tema" subtitle="Mudam sozinhos com data-theme">
            <div className="ds-swatches">
              {SEMANTIC.map((s) => (
                <div key={s.v} className="ds-swatch">
                  <i style={{ background: `var(${s.v})` }} />
                  <b>{s.name}</b>
                  <code>{s.v}</code>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard title="Tipografia" subtitle="Montserrat 800/900 · Poppins 400/500/600">
            <div className="np-display ds-type-xl">Beleza pra quem não para!</div>
            <div className="np-num ds-type-ticket">A027</div>
            <p className="np-label">Corpo em Poppins 14 px. Valores sempre em pt-BR: {brl(1280.5)} · 30/09/2026 14:32 · 7º na fila.</p>
            <div className="np-caps">Rótulo de seção · caixa alta espaçada</div>
          </GlassCard>
          <div className="ds-glass-stack">
            <GlassCard padding={18} lift>
              <b>Vidro padrão</b> <span className="np-caption">blur 20 px · sobe 5 px no hover</span>
            </GlassCard>
            <GlassCard padding={18} tone="strong">
              <b>Vidro forte</b> <span className="np-caption">modais e TV</span>
            </GlassCard>
            <GlassCard padding={18} glow>
              <b>Brilho âmbar</b> <span className="np-caption">"Da vez" e senha chamada</span>
            </GlassCard>
            <GlassCard padding={18} tone="accent">
              <b>Âmbar sólido</b> <span>no máximo um por tela</span>
            </GlassCard>
            <GlassCard padding={18} selected>
              <b>Selecionado</b> <span className="np-caption">borda e anel âmbar</span>
            </GlassCard>
          </div>
        </div>
      </Section>

      <Section id="core" eyebrow="Componentes" title="Botões, campos e status">
        <GlassCard radius="xl">
          <Row label="Variantes">
            <Button icon="plus">Nova comanda</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">Ver tudo</Button>
            <Button variant="danger" icon="triangle-alert">
              Registrar falta
            </Button>
            <Button variant="success" icon="check">
              Confirmar
            </Button>
            <Button variant="dark">Escuro</Button>
          </Row>
          <Row label="Tamanhos e estados">
            <Button size="sm">Pequeno 36</Button>
            <Button>Médio 44</Button>
            <Button size="lg" icon="megaphone">
              Chamar 52
            </Button>
            <Button size="xl">Terminal 64</Button>
            <Button loading>Salvando</Button>
            <Button disabled>Desativado</Button>
          </Row>
          <Row label="Botões de ícone e interruptores de tema">
            <IconButton icon="bell" label="Notificações" badge={4} round />
            <IconButton icon="settings" label="Ajustes" />
            <IconButton icon="plus" label="Adicionar" variant="accent" />
            <IconButton icon="ellipsis" label="Mais" variant="ghost" />
            <IconButton icon="calendar" label="Filtrar por data" selected />
            <IconButton icon="search" label="Buscar" disabled />
            <ThemeToggle />
            <ThemeToggle variant="pill" size="sm" />
          </Row>
          <Row label="Upload (acervo @code.xr)">
            <UploadButton demo fileName="Comprovante Pix.pdf" />
            <UploadButton state="uploading" progress={62} fileName="Nota.pdf" />
            <UploadButton state="done" fileName="Nota.pdf" />
            <UploadButton fileName="Arquivo grande.pdf" error="Arquivo acima de 5 MB" />
          </Row>
          <div className="ds-grid-3">
            <Input label="Cliente" placeholder="Nome ou telefone" icon="user-round" />
            <Input label="Dinheiro recebido" prefix="R$" variant="money" defaultValue="150,00" />
            <PasswordInput label="Senha" defaultValue="1234" error="Senha incorreta" />
            <Input label="Busca" placeholder="Buscar…" icon="search" variant={["pill", "caps"]} />
            <Input label="Desativado" placeholder="Sem permissão" disabled hint="Peça ao gerente" />
            <div className="ds-checks">
              <Checkbox label="Lembrar de mim" defaultChecked />
              <Checkbox label="Parcial" mixed />
              <Checkbox label="Desativado" disabled />
            </div>
          </div>
          <Row label="Status">
            <StatusPill status="davez" />
            <StatusPill status="livre" />
            <StatusPill status="atendendo" />
            <StatusPill status="pausa" />
            <StatusPill status="ausente" />
            <Badge tone="danger" dot>
              Falta R$ 12,00
            </Badge>
            <Badge tone="accent" size="lg">
              Clube
            </Badge>
            <CountBadge count={7} />
            <CountBadge count={2} tone="danger" />
            <Avatar name="Juliana Prado" />
            <Avatar name="Rafaela Mendes" size={52} />
          </Row>
          <Row label="Tema (cartões do acervo 554)">
            <ThemeToggle variant="cards" style={{ width: "min(420px, 100%)" }} />
          </Row>
        </GlassCard>
      </Section>

      <Section id="superficies" eyebrow="Superfícies" title="Gráficos, agenda e tarefas">
        <div className="ds-grid-2">
          <GlassCard title="Faturamento da semana" subtitle="Setembro" action={<NavTabs variant="underline" tabs={[{ id: "s", label: "Semana" }, { id: "m", label: "Mês" }]} />}>
            <LineChart data={[1800, 2400, 2100, 3200, 2900, 4280, 3600]} labels={["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]} highlight={5} format={(v) => brl(v)} />
          </GlassCard>
          <GlassCard title="Atendimentos por profissional">
            <BarChart
              data={[
                { label: "Ana", value: 12 },
                { label: "Bia", value: 18 },
                { label: "Cris", value: 9 },
                { label: "Dani", value: 22 },
                { label: "Eli", value: 14 },
              ]}
              highlight={3}
            />
          </GlassCard>
          <GlassCard title="Agenda" radius="xl">
            <CalendarCard marks={{ 12: "positive", 18: "danger", 24: "accent" }} selected={30} disabledDays={[7]} />
          </GlassCard>
          <GlassCard title="Tarefas do fechamento" subtitle="Clique para marcar como feita">
            <TaskList items={tasks} onToggle={(i) => setTasks((ts) => ts.map((t, j) => (j === i ? { ...t, done: !t.done, progress: t.done ? t.progress : 100 } : t)))} />
          </GlassCard>
          <GlassCard title="Carregando" loading />
          <GlassCard title="Sem dados">
            <TaskList items={[]} />
          </GlassCard>
        </div>
      </Section>

      <Section id="salao" eyebrow="Salão" title="Fila, comanda, caixa e pendências">
        <div className="ds-grid-3">
          <QueueTicketCard ticket="A027" client="Juliana Prado" service="Escova" professional="Bia" wait="12 min" position={1} status="chamada" onCall={() => {}} onSkip={() => {}} />
          <QueueTicketCard ticket="A028" client="Rafaela Mendes" service="Progressiva" wait="18 min" position={2} onCall={() => {}} onSkip={() => {}} />
          <QueueTicketCard ticket="C014" client="Camila Souza" service="Escova · Clube" size="sm" status="atendimento" professional="Dani" />
          <ProfessionalCard name="Bia Santos" role="Escovista" status="davez" turn={1} today={6} onAction={() => {}} />
          <ProfessionalCard name="Dani Rocha" role="Cabeleireira" status="atendendo" ticket="C014" client="Camila Souza" elapsed="18:42" turn={3} today={4} onAction={() => {}} />
          <ProfessionalCard name="Eli Costa" role="Manicure" status="livre" turn={2} today={5} onAction={() => {}} />
        </div>
        <div className="ds-grid-3 ds-mt">
          <CheckoutCard number="#1042" client="Juliana Prado" ticket="A027" items={[{ name: "Escova modelada", pro: "Bia", price: 70 }, { name: "Hidratação", pro: "Bia", price: 45 }]} discount={5} defaultReceived={100} />
          <div className="ds-col">
            <CashCard openedBy="Max" openedAt="08:02" lines={[{ label: "Dinheiro", expected: 412, counted: 400 }, { label: "Pix", expected: 1980.5 }, { label: "Débito", expected: 860 }]} />
            <CashCard title="Caixa conferido" status="fechado" openedBy="Max" lines={[{ label: "Dinheiro", expected: 300 }, { label: "Pix", expected: 1200 }]} />
          </div>
          <div className="ds-col">
            <DiffField value={12.5} />
            <DiffField value={-12} />
            <DiffField value={0} />
            <Receipt number="#1042" date="30/09/2026 14:32" client="Juliana Prado" ticket="A027" items={[{ name: "Escova modelada", pro: "Bia", price: 70 }, { name: "Hidratação", pro: "Bia", price: 45 }]} discount={5} method="Dinheiro" received={120} change={10} />
          </div>
        </div>
        <div className="ds-grid-2 ds-mt">
          <PendingCard severity="alta" title="Falta de R$ 12,00 no caixa de ontem" description="Dinheiro contado menor que o esperado no fechamento." owner="Max" when="Ontem, 19:40" value="− R$ 12,00" onAction={() => {}} />
          <PendingCard severity="media" title="Comanda #1038 sem forma de pagamento" owner="Recepção" when="Hoje, 11:05" onAction={() => {}} />
          <PendingCard severity="baixa" title="Cliente sem telefone cadastrado" when="Hoje" onAction={() => {}} />
          <PendingCard severity="alta" title="Estorno conferido" resolved when="Ontem" />
        </div>
      </Section>

      <Section id="navegacao" eyebrow="Navegação" title="Sidebar, abas e cabeçalho">
        <div className="ds-nav-demo">
          <GlassSidebar collapsed sections={NAV} activeId="fila" notifications={2} themeToggle="collapsed" style={{ height: 560 }} />
          <div className="ds-col ds-grow">
            <GlassCard>
              <TopBar title="Fila" subtitle="6 na espera · média 14 min" notifications={0} themeToggle searchPlaceholder="Buscar senha ou cliente…">
                <Button icon="ticket-plus">Emitir senha</Button>
              </TopBar>
            </GlassCard>
            <Row label="Abas em pílula · sublinhado">
              <NavTabs tabs={[{ id: "a", label: "Aguardando", count: 6 }, { id: "b", label: "Atendendo", count: 3 }, { id: "c", label: "Finalizados" }, { id: "d", label: "Arquivados", disabled: true }]} />
              <NavTabs variant="underline" tabs={[{ id: "a", label: "Hoje" }, { id: "b", label: "Semana" }, { id: "c", label: "Mês" }]} />
            </Row>
            <Row label="Barra inferior do celular (acervo navigation tabs)">
              <NavTabs
                variant="dock"
                tabs={[
                  { id: "fila", label: "Fila", icon: "ticket" },
                  { id: "busca", label: "Buscar", icon: "search" },
                  { id: "nova", label: "Senha", icon: "ticket-plus" },
                  { id: "avisos", label: "Avisos", icon: "bell", dot: true },
                  { id: "perfil", label: "Perfil", icon: "user-round" },
                ]}
              />
            </Row>
          </div>
        </div>
      </Section>

      <Section id="acesso" eyebrow="Acesso" title="Login deslizante">
        <div className="ds-login">
          <LoginSlider logoSrc={npAssets.logo} photoSrc={npAssets.bgGraphite} />
        </div>
      </Section>

      <Section id="dados" eyebrow="Dados" title="Tabela de registros">
        <RecordsTable rows={CLIENTES} columns={COLS} getRowId={(r) => r.id} primary={{ header: "Cliente", sortValue: (r) => r.nome, render: (r) => (<><Avatar name={r.nome} size={28} /><b>{r.nome}</b></>), footer: (rows) => <span><b className="np-num">{rows.length}</b> clientes</span> }} />
        <div className="ds-grid-2 ds-mt">
          <RecordsTable rows={[] as Cliente[]} columns={COLS} getRowId={(r) => r.id} primary={{ header: "Cliente", render: (r) => r.nome }} emptyTitle="Nenhuma cliente encontrada" emptyDescription="Ajuste a busca ou cadastre uma nova cliente." />
          <RecordsTable rows={CLIENTES} columns={COLS} getRowId={(r) => r.id} primary={{ header: "Cliente", render: (r) => r.nome }} loading />
        </div>
      </Section>

      <Section id="ilhas" eyebrow="Temas" title="Os dois temas lado a lado">
        <div className="ds-grid-2">
          {(["dark", "light"] as NpTheme[]).map((t) => (
            <div key={t} data-theme={t} className="np-app np-bg ds-island">
              <div className="np-caps">{t === "dark" ? "Luz apagada · escuro (padrão)" : "Luz acesa · claro"}</div>
              <StatCard title="Faturamento do dia" value="R$ 4.280,00" change="12,5" icon="banknote" />
              <div className="ds-row">
                <Button icon="megaphone">Chamar próxima</Button>
                <Button variant="secondary">Pular</Button>
                <StatusPill status="davez" />
                <StatusPill status="livre" />
              </div>
              <EmptyState title="Fila vazia" description="Quando alguém tirar senha, ela aparece aqui." icon="ticket" />
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}

const VITRINE_CSS = `
.ds-section{display:flex;flex-direction:column;gap:12px;margin-top:40px}
.ds-section__title{margin:0 0 8px;font-size:var(--np-fs-2xl)}
.ds-row-wrap{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.ds-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.ds-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
.ds-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px;align-items:start;margin-bottom:18px}
.ds-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px}
.ds-col{display:flex;flex-direction:column;gap:12px}
.ds-grow{flex:1;min-width:0}
.ds-mt{margin-top:16px}
.ds-checks{display:flex;flex-direction:column;justify-content:flex-end}
.ds-swatches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ds-swatch{display:flex;flex-direction:column;gap:4px;min-width:0}
.ds-swatch i{display:block;height:48px;border-radius:var(--np-radius-md);border:1px solid var(--np-border-strong)}
.ds-swatch b{font-size:var(--np-fs-xs);font-weight:var(--np-fw-semibold)}
.ds-swatch code{font-size:var(--np-fs-2xs);color:var(--np-text-tertiary);overflow:hidden;text-overflow:ellipsis}
.ds-type-xl{font-size:var(--np-fs-4xl);font-weight:900}
.ds-type-ticket{font-size:var(--np-fs-ticket-sm);font-weight:900;color:var(--np-accent-display);text-shadow:var(--np-accent-text-glow)}
.ds-glass-stack{display:flex;flex-direction:column;gap:12px}
.ds-nav-demo{display:flex;gap:16px;align-items:flex-start}
.ds-login{display:flex;justify-content:center}
.ds-island{display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:var(--np-radius-xl);border:1px solid var(--np-border-glass);color:var(--np-text-primary)}
`;

export default function DesignSystemShowcase() {
  const forced = React.useMemo(() => {
    const t = new URLSearchParams(window.location.search).get("theme");
    return t === "light" || t === "dark" ? (t as NpTheme) : undefined;
  }, []);
  React.useEffect(() => {
    const prev = document.title;
    document.title = "Design system · Sua Vez Express";
    return () => {
      document.title = prev;
    };
  }, []);
  return (
    <NpThemeProvider forcedInitialTheme={forced}>
      <style>{VITRINE_CSS}</style>
      <Showcase />
    </NpThemeProvider>
  );
}
