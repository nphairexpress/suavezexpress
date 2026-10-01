window.NPData = {
  user: { name: 'Nilton Prado', role: 'Dono', subtitle: 'Dono · trocar usuário' },
  fila: [
    { ticket: 'A027', client: 'Mariana Souza', service: 'Escova modelada', wait: '12 min', status: 'chamada', professional: 'Juliana' },
    { ticket: 'A028', client: 'Paula Lima', service: 'Corte + escova', wait: '9 min', status: 'aguardando' },
    { ticket: 'C014', client: 'Renata Alves', service: 'Escova · Clube', wait: '7 min', status: 'aguardando' },
    { ticket: 'A029', client: 'Fernanda Dias', service: 'Hidratação', wait: '4 min', status: 'aguardando' },
    { ticket: 'A030', client: 'Larissa Gomes', service: 'Escova', wait: '2 min', status: 'aguardando' },
    { ticket: 'A031', client: 'Beatriz Nunes', service: 'Escova + babyliss', wait: 'agora', status: 'aguardando' },
  ],
  pros: [
    { name: 'Juliana Prado', role: 'Escovista', status: 'davez', turn: 1, today: 7 },
    { name: 'Bianca Rocha', role: 'Escovista', status: 'livre', turn: 2, today: 4 },
    { name: 'Carla Mendes', role: 'Cabeleireira', status: 'atendendo', turn: 3, today: 5, ticket: 'A024', client: 'Tatiane · Escova', elapsed: '18:42' },
    { name: 'Débora Lins', role: 'Escovista', status: 'atendendo', turn: 4, today: 6, ticket: 'A025', client: 'Sônia · Corte', elapsed: '06:10' },
  ],
  comanda: { number: '#1042', client: 'Mariana Souza', ticket: 'A027', items: [{ name: 'Escova modelada', pro: 'Juliana', price: 60 }, { name: 'Hidratação express', pro: 'Juliana', price: 45 }] },
  caixa: [{ label: 'Dinheiro', expected: 640, counted: 628 }, { label: 'Pix', expected: 1820 }, { label: 'Débito', expected: 910 }, { label: 'Crédito', expected: 1340 }],
  clientes: [
    { name: 'Mariana Souza', phone: '(11) 98123-4410', last: 'Hoje', visits: 24, club: true, spent: 1840 },
    { name: 'Paula Lima', phone: '(11) 99702-1187', last: '22/09', visits: 8, club: false, spent: 620 },
    { name: 'Renata Alves', phone: '(11) 97455-0921', last: '19/09', visits: 31, club: true, spent: 2390 },
    { name: 'Fernanda Dias', phone: '(11) 98840-3376', last: '15/09', visits: 5, club: false, spent: 410 },
    { name: 'Larissa Gomes', phone: '(11) 99311-6684', last: '12/09', visits: 12, club: true, spent: 980 },
    { name: 'Beatriz Nunes', phone: '(11) 98276-5530', last: '02/09', visits: 3, club: false, spent: 215 },
  ],
  pendencias: [
    { severity: 'alta', title: 'Falta de R$ 12,00 no caixa', description: 'Fechamento de 29/09 não conferiu no dinheiro.', owner: 'Rafaela · recepção', when: 'Ontem, 19:40', value: '− R$ 12,00' },
    { severity: 'media', title: 'Comanda #1038 sem forma de pagamento', description: 'Aberta às 16:10; a profissional já foi liberada.', owner: 'Juliana Prado', when: 'Hoje, 16:10' },
    { severity: 'media', title: 'Pacote de 5 escovas vence amanhã', description: 'Cliente Renata Alves ainda tem 2 escovas.', owner: 'Recepção', when: 'Vence 01/10' },
    { severity: 'baixa', title: '3 clientes sem telefone cadastrado', description: 'Atualize no próximo atendimento.', owner: 'Recepção', when: 'Semana' },
  ],
  semana: [1820, 2140, 1960, 2780, 3120, 4280, 0],
  diasSemana: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
};
window.NPData.brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
