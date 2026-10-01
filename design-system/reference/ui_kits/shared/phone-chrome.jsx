function StatusBar() {
  const { Icon } = window.NPHairExpressDesignSystem_ba69cf;
  return <div className="phone-status"><span className="np-num" style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>14:32</span><span style={{ display: 'flex', gap: 6 }}><Icon name="signal" size={16} /><Icon name="wifi" size={16} /><Icon name="battery-full" size={18} /></span></div>;
}
function TabBar({ tabs, value, onChange }) {
  const { Icon } = window.NPHairExpressDesignSystem_ba69cf;
  return <nav className="phone-tabbar" role="tablist">{tabs.map((t) => <button key={t.id} role="tab" aria-selected={t.id === value} className="phone-tab" onClick={() => onChange(t.id)}><Icon name={t.icon} size={22} />{t.label}</button>)}</nav>;
}
Object.assign(window, { StatusBar, TabBar });
