const DS = window.NPHairExpressDesignSystem_ba69cf;
const D = window.NPData;

function OverviewScreen({ go }) {
  const { TopBar, NavTabs, StatCard, GlassCard, LineChart, CalendarCard, TaskList, ProfessionalCard, Button, QueueTicketCard, Badge, Icon } = DS;
  const [p, setP] = React.useState('hoje');
  return (
    <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <TopBar themeToggle title="Bom dia, Nilton" subtitle="Terça, 30 de setembro · salão aberto desde 08:00">
          <Button icon="plus" onClick={() => go('comanda')}>Nova comanda</Button>
        </TopBar>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="np-caps">Indicadores do dia</span>
          <NavTabs value={p} onChange={setP} tabs={[{ id: 'hoje', label: 'Hoje' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
          <StatCard title="Faturamento" value={p === 'hoje' ? 'R$ 4.280' : p === 'semana' ? 'R$ 16.100' : 'R$ 61.940'} change="12,5" icon="dollar-sign" />
          <StatCard title="Atendimentos" value={p === 'hoje' ? '38' : p === 'semana' ? '214' : '862'} change="8,2" icon="scissors" />
          <StatCard title="Ticket médio" value="R$ 112,60" change="2,4" trend="down" icon="receipt" />
          <StatCard title="Na fila agora" value="6 clientes" icon="ticket" accent />
        </div>
        <GlassCard title="Faturamento da semana" subtitle="Valores fechados no caixa" action={<Badge tone="positive" dot>Sábado foi o melhor dia</Badge>} lift>
          <LineChart height={190} data={D.semana.slice(0, 6)} labels={D.diasSemana.slice(0, 6)} highlight={5} format={(v) => D.brl(v)} />
        </GlassCard>
        <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 16 }}>
          <GlassCard title="Metas de hoje" subtitle="Atualiza a cada comanda fechada" lift>
            <TaskList items={[
              { title: 'Escovas do Clube', meta: '12 de 20 previstas', durationLabel: 'Restante', duration: '8', progress: 60 },
              { title: 'Faturamento do dia', meta: 'Meta R$ 5.000', durationLabel: 'Falta', duration: 'R$ 720', progress: 86 },
              { title: 'Novos clientes', meta: 'Meta 5', durationLabel: 'Falta', duration: '3', progress: 40 },
            ]} />
          </GlassCard>
          <div className="glass-card glass-card--accent glass-card--lift" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--on-accent-overlay)', display: 'grid', placeItems: 'center' }}><Icon name="crown" size={24} /></div>
              <span className="np-num" style={{ fontSize: 13 }}>+9 este mês</span>
            </div>
            <div>
              <div className="np-num" style={{ fontSize: 40, lineHeight: 1 }}>86</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>assinantes no Clube da Escova</div>
              <div style={{ fontSize: 13, color: 'var(--text-on-accent-2)' }}>R$ 12.890,00 em recorrência</div>
            </div>
            <Button variant="dark" onClick={() => go('clube')} iconRight="arrow-right">Ver Clube</Button>
          </div>
        </div>
      </div>
      <aside className="glass-card glass-card--xl" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, alignSelf: 'start', position: 'sticky', top: 0 }}>
        <CalendarCard compact year={2026} month={8} selected={30} marks={{ 6: 'positive', 13: 'positive', 20: 'positive', 27: 'positive', 29: 'danger' }} />
        <div style={{ height: 1, background: 'var(--divider)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Próximas da fila</span>
          <a href="#" onClick={(e) => { e.preventDefault(); go('fila'); }} style={{ fontSize: 12 }}>Ver fila</a>
        </div>
        {D.fila.slice(0, 4).map((f, i) => (
          <div key={f.ticket} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, background: i === 0 ? 'var(--accent-soft)' : 'var(--surface-inset)', border: '1px solid ' + (i === 0 ? 'var(--accent-border)' : 'transparent') }}>
            <span className="np-num" style={{ fontSize: 20, fontWeight: 900, width: 64, color: i === 0 ? 'var(--accent-display)' : 'var(--text-primary)' }}>{f.ticket}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.client}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{f.service} · {f.wait}</div>
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: 'var(--divider)' }} />
        <span style={{ fontWeight: 600 }}>Equipe agora</span>
        {D.pros.map((p) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DS.Avatar name={p.name} size={34} />
            <span style={{ flex: 1, fontSize: 13 }}>{p.name.split(' ')[0]}</span>
            <DS.StatusPill status={p.status} />
          </div>
        ))}
      </aside>
    </div>
  );
}

function FilaScreen() {
  const { TopBar, NavTabs, QueueTicketCard, ProfessionalCard, Button, GlassCard } = DS;
  const [fila, setFila] = React.useState(D.fila);
  const [tab, setTab] = React.useState('fila');
  const callNext = () => setFila((f) => { const rest = f.slice(1); if (rest[0]) rest[0] = { ...rest[0], status: 'chamada' }; return rest; });
  const cur = fila[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Fila de atendimento" subtitle={fila.length + ' clientes aguardando · espera média 8 min'} searchPlaceholder="Buscar senha ou cliente…">
        <Button icon="ticket-plus" variant="secondary">Emitir senha</Button>
        <Button icon="megaphone" onClick={callNext}>Chamar próxima</Button>
      </TopBar>
      <NavTabs variant="underline" value={tab} onChange={setTab} tabs={[{ id: 'fila', label: 'Aguardando', count: fila.length }, { id: 'at', label: 'Em atendimento', count: 2 }, { id: 'ok', label: 'Atendidas hoje', count: 31 }]} />
      <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cur && <QueueTicketCard key={cur.ticket} {...cur} position={1} size="lg" status="chamada" onCall={() => {}} onSkip={callNext} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {fila.slice(1).map((f, i) => <QueueTicketCard key={f.ticket} {...f} status="aguardando" position={i + 2} size="sm" />)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="np-caps">Ordem da vez</span>
          {D.pros.map((p) => <ProfessionalCard key={p.name} {...p} onAction={p.status === 'davez' ? callNext : undefined} />)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewScreen, FilaScreen });
