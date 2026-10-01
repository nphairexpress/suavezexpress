function ClientesScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, GlassCard, Badge, Avatar, Button, Icon } = DS;
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(D.clientes[0]);
  const list = D.clientes.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Clientes" subtitle="1.284 cadastradas" searchPlaceholder="Nome ou telefone…" onSearch={setQ}><Button icon="user-plus">Nova cliente</Button></TopBar>
      <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }}>
        <GlassCard padding={12}>
          <table className="np-table">
            <thead><tr><th>Cliente</th><th>Telefone</th><th>Última visita</th><th style={{ textAlign: 'right' }}>Visitas</th><th style={{ textAlign: 'right' }}>Gasto total</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.name} onClick={() => setSel(c)} style={{ cursor: 'pointer', background: sel.name === c.name ? 'var(--accent-soft)' : undefined }}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={c.name} size={32} /><span style={{ fontWeight: 500 }}>{c.name}</span>{c.club && <Badge tone="accent">Clube</Badge>}</div></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.last}</td>
                  <td className="np-num" style={{ textAlign: 'right', fontSize: 13 }}>{c.visits}</td>
                  <td className="np-num" style={{ textAlign: 'right', fontSize: 13 }}>{D.brl(c.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
        <GlassCard radius="xl" padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ height: 96, background: 'radial-gradient(300px 140px at 80% 0%, var(--accent-border), transparent 70%), linear-gradient(135deg,var(--hero-from),var(--hero-to))' }} />
          <div style={{ padding: '0 20px 20px', marginTop: -40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <Avatar name={sel.name} size={80} style={{ boxShadow: '0 0 0 4px var(--bg-app)' }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>{sel.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sel.phone}</div>
            {sel.club ? <Badge tone="accent" dot>Clube da Escova · 3 de 4 no mês</Badge> : <Badge>Sem assinatura</Badge>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', marginTop: 12, gap: 8 }}>
              {[['Visitas', sel.visits], ['Gasto', D.brl(sel.spent).replace(',00', '')], ['Última', sel.last]].map(([l, v]) => <div key={l}><div className="np-num" style={{ fontSize: 16 }}>{v}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{l}</div></div>)}
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 12 }}>
              <Button block icon="ticket-plus">Emitir senha</Button>
              <DS.IconButton icon="message-circle" label="WhatsApp" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ClubeScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, StatCard, GlassCard, Badge, Button, Icon } = DS;
  const planos = [{ n: 'Clube 4', d: '4 escovas por mês', p: 149.9, s: 52 }, { n: 'Clube 8', d: '8 escovas por mês', p: 269.9, s: 27, hot: true }, { n: 'Pacote 5', d: '5 escovas · validade 60 dias', p: 199.9, s: 7 }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Clube da Escova e pacotes" subtitle="Assinaturas renovam todo dia 5" searchPlaceholder="Buscar assinante…"><Button icon="plus">Nova assinatura</Button></TopBar>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <StatCard title="Assinantes ativas" value="86" change="11,7" icon="crown" />
        <StatCard title="Recorrência mensal" value="R$ 12.890" change="9,4" icon="repeat" />
        <StatCard title="Escovas usadas no mês" value="241 / 392" change="61" hint="de uso" icon="wind" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        {planos.map((p) => (
          <div key={p.n} className={'glass-card glass-card--lift' + (p.hot ? ' glass-card--glow' : '')} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, borderColor: p.hot ? 'var(--accent-border)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="np-display" style={{ fontSize: 22 }}>{p.n}</span>{p.hot && <Badge tone="solid">Mais vendido</Badge>}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.d}</div>
            <div><span className="np-num" style={{ fontSize: 30 }}>{D.brl(p.p)}</span><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}> /mês</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.s} clientes</div>
            <Button variant={p.hot ? 'primary' : 'secondary'} block>Vender</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComissoesScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, GlassCard, BarChart, Avatar, NavTabs, Button } = DS;
  const rows = [['Juliana Prado', 142, 9840, 40], ['Carla Mendes', 118, 8910, 40], ['Débora Lins', 126, 7620, 35], ['Bianca Rocha', 97, 6150, 35]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Comissões" subtitle="Período de 01 a 30 de setembro" searchPlaceholder={null}><Button variant="secondary" icon="download">Exportar</Button><Button icon="check-check">Fechar período</Button></TopBar>
      <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        <GlassCard padding={12}>
          <table className="np-table">
            <thead><tr><th>Profissional</th><th style={{ textAlign: 'right' }}>Atend.</th><th style={{ textAlign: 'right' }}>Produção</th><th style={{ textAlign: 'right' }}>%</th><th style={{ textAlign: 'right' }}>Comissão</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r[0]}><td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={r[0]} size={32} />{r[0]}</div></td><td className="np-num" style={{ textAlign: 'right', fontSize: 13 }}>{r[1]}</td><td className="np-num" style={{ textAlign: 'right', fontSize: 13 }}>{D.brl(r[2])}</td><td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{r[3]}%</td><td className="np-num" style={{ textAlign: 'right', fontSize: 15, color: 'var(--accent-text)' }}>{D.brl(r[2] * r[3] / 100)}</td></tr>
            ))}</tbody>
          </table>
        </GlassCard>
        <GlassCard title="Produção por profissional">
          <BarChart height={220} highlight={0} data={rows.map((r) => ({ label: r[0].split(' ')[0], value: r[2] }))} format={(v) => D.brl(v).replace(',00', '')} />
        </GlassCard>
      </div>
    </div>
  );
}

function RelatoriosScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf, D = window.NPData;
  const { TopBar, GlassCard, LineChart, BarChart, NavTabs, Button } = DS;
  const [p, setP] = React.useState('mes');
  const serv = [['Escova modelada', 412, 58], ['Escova Clube', 241, 34], ['Corte + escova', 96, 14], ['Hidratação', 88, 12]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Relatórios" subtitle="Setembro 2026" searchPlaceholder={null}><NavTabs value={p} onChange={setP} tabs={[{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }, { id: 'ano', label: 'Ano' }]} /><Button variant="secondary" icon="download">PDF</Button></TopBar>
      <GlassCard title="Faturamento diário" subtitle="R$ 61.940,00 no mês · +12% sobre agosto">
        <LineChart height={200} data={[1400, 1900, 1700, 2300, 2600, 3900, 1100, 1800, 2100, 2000, 2500, 2900, 4100, 900, 1700, 2200, 2400, 2600, 3100, 4300, 1000]} highlight={19} format={(v) => D.brl(v).replace(',00', '')} />
      </GlassCard>
      <div data-split style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
        <GlassCard title="Atendimentos por dia da semana"><BarChart height={200} highlight={5} data={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((l, i) => ({ label: l, value: [98, 121, 112, 140, 168, 223][i] }))} /></GlassCard>
        <GlassCard title="Serviços mais vendidos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {serv.map((s) => <div key={s[0]}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>{s[0]}</span><span className="np-num">{s[1]}</span></div><div className="np-progress"><span style={{ width: s[2] + '%' }} /></div></div>)}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function PermissoesScreen() {
  const DS = window.NPHairExpressDesignSystem_ba69cf;
  const { TopBar, GlassCard, Checkbox, Button } = DS;
  const perms = ['Ver faturamento', 'Abrir e fechar caixa', 'Dar desconto', 'Cancelar comanda', 'Editar comissões', 'Gerenciar usuários'];
  const roles = ['Dono', 'Gerente', 'Recepção', 'Profissional'];
  const init = { Dono: [1, 1, 1, 1, 1, 1], Gerente: [1, 1, 1, 1, 0, 0], 'Recepção': [0, 1, 1, 0, 0, 0], Profissional: [0, 0, 0, 0, 0, 0] };
  const [m, setM] = React.useState(init);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TopBar themeToggle title="Permissões" subtitle="O que cada perfil pode fazer" searchPlaceholder={null}><Button icon="save">Salvar alterações</Button></TopBar>
      <GlassCard padding={12} style={{ maxWidth: 900 }}>
        <table className="np-table">
          <thead><tr><th>Permissão</th>{roles.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}</tr></thead>
          <tbody>{perms.map((p, i) => (
            <tr key={p}><td style={{ fontWeight: 500 }}>{p}</td>{roles.map((r) => (
              <td key={r} style={{ textAlign: 'center', padding: 4 }}><Checkbox aria-label={p + ' — ' + r} checked={!!m[r][i]} disabled={r === 'Dono'} onChange={() => setM({ ...m, [r]: m[r].map((v, j) => (j === i ? (v ? 0 : 1) : v)) })} /></td>
            ))}</tr>
          ))}</tbody>
        </table>
      </GlassCard>
    </div>
  );
}

Object.assign(window, { ClientesScreen, ClubeScreen, ComissoesScreen, RelatoriosScreen, PermissoesScreen });
