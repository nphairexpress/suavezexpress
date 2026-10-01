function RecepcaoFila({ fila, go }) {
  const { Button, NavTabs, Icon, Badge, IconButton, ThemeToggle } = window.NPHairExpressDesignSystem_ba69cf;
  const [t, setT] = React.useState('fila');
  return (<>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div><div className="np-caption">Terça, 30 set</div><div className="np-display" style={{ fontSize: 26 }}>Olá, Rafaela</div></div>
      <div style={{ display: 'flex', gap: 8 }}><ThemeToggle /><IconButton icon="bell" label="Avisos" round badge={2} /></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="glass-card glass-card--xl" style={{ padding: 18 }}><div className="np-label" style={{ fontSize: 12 }}>Na fila</div><div className="np-num" style={{ fontSize: 32 }}>{fila.length}</div><div className="np-caption">espera média 8 min</div></div>
      <div className="glass-card glass-card--xl" style={{ padding: 18 }}><div className="np-label" style={{ fontSize: 12 }}>Livres agora</div><div className="np-num" style={{ fontSize: 32, color: 'var(--positive-text)' }}>1</div><div className="np-caption">Bianca</div></div>
    </div>
    <Button size="lg" block icon="ticket-plus" onClick={() => go('nova')}>Emitir senha</Button>
    <NavTabs value={t} onChange={setT} tabs={[{ id: 'fila', label: 'Aguardando', count: fila.length }, { id: 'at', label: 'Atendendo', count: 2 }]} style={{ alignSelf: 'flex-start' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(t === 'fila' ? fila : window.NPData.pros.filter((p) => p.status === 'atendendo').map((p) => ({ ticket: p.ticket, client: p.client, service: p.name.split(' ')[0], wait: p.elapsed }))).map((f, i) => (
        <div key={f.ticket} className="glass-card glass-card--xl np-fade-up" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, borderColor: i === 0 && t === 'fila' ? 'var(--accent-border)' : undefined }}>
          <span className="np-num" style={{ fontSize: 30, fontWeight: 900, width: 84, color: i === 0 && t === 'fila' ? 'var(--accent-display)' : 'var(--text-primary)' }}>{f.ticket}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{f.client}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.service} · {f.wait}</div>
          </div>
          {i === 0 && t === 'fila' ? <Badge tone="solid" live dot>Chamando</Badge> : <Icon name="chevron-right" size={18} color="var(--text-tertiary)" />}
        </div>
      ))}
    </div>
  </>);
}
const DS = () => window.NPHairExpressDesignSystem_ba69cf;

function RecepcaoNova({ onCreate, go }) {
  const { Input, Button, Icon, IconButton } = DS();
  const servs = ['Escova', 'Escova + babyliss', 'Corte + escova', 'Hidratação', 'Escova · Clube'];
  const [s, setS] = React.useState('Escova');
  const [nome, setNome] = React.useState('');
  const [made, setMade] = React.useState(null);
  if (made) return (
    <div className="np-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch', textAlign: 'center', paddingTop: 20 }}>
      <div className="np-caps">Senha emitida</div>
      <div className="glass-card glass-card--xl glass-card--glow" style={{ padding: 28, borderColor: 'var(--accent-border)' }}>
        <div className="np-num" style={{ fontSize: 96, fontWeight: 900, lineHeight: .95, letterSpacing: '-.03em', color: 'var(--accent-display)', animation: 'np-ticket-in 520ms cubic-bezier(.22,1,.36,1)' }}>{made.ticket}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{made.client}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{made.service} · {made.pos}º na fila · cerca de {made.pos * 6} min</div>
      </div>
      <Button size="lg" block icon="printer" variant="secondary">Imprimir senha</Button>
      <Button size="lg" block onClick={() => go('fila')}>Voltar para a fila</Button>
    </div>
  );
  return (<>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <IconButton icon="arrow-left" label="Voltar" round onClick={() => go('fila')} />
      <div className="np-display" style={{ fontSize: 22 }}>Emitir senha</div>
    </div>
    <div className="glass-card glass-card--xl" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="Cliente" icon="search" placeholder="Nome ou telefone" value={nome} onChange={(e) => setNome(e.target.value)} />
      <div className="np-field"><span className="np-field__label">Serviço</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {servs.map((x) => <button key={x} onClick={() => setS(x)} style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid ' + (x === s ? 'transparent' : 'var(--border-strong)'), background: x === s ? 'var(--accent)' : 'var(--surface-glass-strong)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 200ms' }}>{x}</button>)}
        </div>
      </div>
      <div className="np-field"><span className="np-field__label">Preferência</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, background: 'var(--surface-inset)' }}><Icon name="shuffle" size={18} /><span style={{ fontSize: 14, flex: 1 }}>Próxima da vez</span><Icon name="chevron-down" size={18} /></div>
      </div>
    </div>
    <Button size="lg" block icon="ticket-plus" onClick={() => { const r = onCreate({ client: nome || 'Cliente sem cadastro', service: s }); setMade(r); }}>Gerar senha</Button>
  </>);
}

function RecepcaoEquipe() {
  const { ProfessionalCard } = DS();
  return (<>
    <div className="np-display" style={{ fontSize: 24 }}>Equipe</div>
    {window.NPData.pros.map((p) => <ProfessionalCard key={p.name} {...p} />)}
  </>);
}

function RecepcaoCobrar() {
  const { CheckoutCard } = DS();
  const D = window.NPData;
  return (<>
    <div className="np-display" style={{ fontSize: 24 }}>Cobrar</div>
    <CheckoutCard {...D.comanda} defaultMethod="pix" />
  </>);
}
Object.assign(window, { RecepcaoFila, RecepcaoNova, RecepcaoEquipe, RecepcaoCobrar });
