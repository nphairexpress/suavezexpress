function ComandaScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, CheckoutCard, Receipt, GlassCard, Button, Badge } = DS;
  const [done, setDone] = React.useState(null);
  const abertas = [{ n: '#1042', c: 'Mariana Souza', t: 'A027', v: 105, s: 'Pronta' }, { n: '#1041', c: 'Tatiane Ramos', t: 'A024', v: 60, s: 'Em atendimento' }, { n: '#1040', c: 'Sônia Prates', t: 'A025', v: 85, s: 'Em atendimento' }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Comanda" subtitle="3 comandas abertas" searchPlaceholder="Buscar comanda ou senha…"><Button icon="plus">Nova comanda</Button></TopBar>
      <div data-split style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr) 340px', gap: 16, alignItems: 'start' }}>
        <GlassCard title="Abertas" padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {abertas.map((a, i) => (
              <button key={a.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, border: '1px solid ' + (i === 0 ? 'var(--accent-border)' : 'transparent'), background: i === 0 ? 'var(--accent-soft)' : 'var(--surface-inset)', color: 'inherit', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                <span className="np-num" style={{ fontSize: 18, fontWeight: 900, width: 56 }}>{a.t}</span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{a.c}</span><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{a.n} · {a.s}</span></span>
                <span className="np-num" style={{ fontSize: 13 }}>{D.brl(a.v)}</span>
              </button>
            ))}
          </div>
        </GlassCard>
        <CheckoutCard {...D.comanda} defaultReceived={110} onFinish={(r) => setDone(r)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {done ? (
            <div className="np-fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Badge tone="positive" dot size="lg">Comanda finalizada</Badge>
              <Receipt number={D.comanda.number} date="30/09/2026 14:32" client={D.comanda.client} ticket={D.comanda.ticket} items={D.comanda.items} method={{ dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', clube: 'Clube' }[done.method]} received={done.received} change={done.diff} />
              <Button variant="secondary" icon="printer">Imprimir de novo</Button>
            </div>
          ) : (
            <GlassCard style={{ width: '100%', textAlign: 'center' }}><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>O comprovante aparece aqui ao finalizar.</div></GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function CaixaScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, CashCard, GlassCard, Button, UploadButton, Badge, Input } = DS;
  const movs = [['14:32', 'Comanda #1042 · Mariana', 'Dinheiro', 105], ['14:10', 'Comanda #1039 · Patrícia', 'Pix', 60], ['13:55', 'Sangria para cofre', 'Dinheiro', -300], ['13:20', 'Comanda #1037 · Cláudia', 'Débito', 145], ['12:48', 'Clube · mensalidade Renata', 'Crédito', 149.9]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Caixa" subtitle="Recepção · aberto às 08:02 por Rafaela" searchPlaceholder={null}>
        <Button variant="secondary" icon="arrow-down-to-line">Sangria</Button>
        <Button icon="lock">Fechar caixa</Button>
      </TopBar>
      <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        <CashCard openedBy="Rafaela" openedAt="08:02" lines={D.caixa} footer={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="danger" icon="triangle-alert">Registrar falta</Button>
            <UploadButton demo label="Anexar contagem" variant="secondary" />
          </div>} />
        <GlassCard title="Movimentações" subtitle="Hoje" action={<Badge>5 de 41</Badge>}>
          <table className="np-table">
            <tbody>
              {movs.map((m, i) => (
                <tr key={i}>
                  <td className="np-num" style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 54 }}>{m[0]}</td>
                  <td>{m[1]}<div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m[2]}</div></td>
                  <td className="np-num" style={{ textAlign: 'right', fontSize: 14, color: m[3] < 0 ? 'var(--danger-text)' : 'var(--text-primary)' }}>{m[3] < 0 ? '− ' + D.brl(-m[3]) : D.brl(m[3])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </div>
  );
}

function PendenciasScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, NavTabs, PendingCard } = DS;
  const [f, setF] = React.useState('todas');
  const [ok, setOk] = React.useState({});
  const list = D.pendencias.filter((p) => f === 'todas' || p.severity === f);
  const cnt = (s) => D.pendencias.filter((p) => p.severity === s).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Pendências de fechamento" subtitle="Resolva antes de fechar o dia" searchPlaceholder={null} />
      <NavTabs value={f} onChange={setF} tabs={[{ id: 'todas', label: 'Todas', count: D.pendencias.length }, { id: 'alta', label: 'Alta', count: cnt('alta') }, { id: 'media', label: 'Média', count: cnt('media') }, { id: 'baixa', label: 'Baixa', count: cnt('baixa') }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 820 }}>
        {list.map((p) => <PendingCard key={p.title} {...p} resolved={!!ok[p.title]} onAction={() => setOk({ ...ok, [p.title]: true })} />)}
      </div>
    </div>
  );
}

Object.assign(window, { ComandaScreen, CaixaScreen, PendenciasScreen });
