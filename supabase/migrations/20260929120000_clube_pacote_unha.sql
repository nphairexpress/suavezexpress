-- 29/09/2026 — Pacote de Unha (R$237/mês = 4 mãos + 2 pés) entra no Clube.
-- Plano 'unha_4m2p' e origem de ciclo 'pacote_unha': a escova do Clube (trigger e RPCs da fila)
-- só consome ciclos de origem asaas_pagamento/asaas_assinatura_backfill/legado_manual, então
-- assinante de unha NÃO ganha escova. Aplicada via Management API em 29/09/2026 (este arquivo versiona).
-- Dados (assinante Gabriela Fernanda Molle, ciclo 26/09→26/10, comanda 1264 zerada, caixa de 26/09 fechado)
-- foram lançados na mesma transação e não são repetidos aqui.
alter table clube_assinantes drop constraint clube_assinantes_plano_check;
alter table clube_assinantes add constraint clube_assinantes_plano_check check (plano = any (array['4x_curto_medio','4x_longo','8x_curto_medio','8x_longo','unha_4m2p']));
alter table clube_creditos drop constraint clube_creditos_origem_chk;
alter table clube_creditos add constraint clube_creditos_origem_chk check (origem = any (array['asaas_pagamento','asaas_assinatura_backfill','legado_manual','legado_manual_bloqueado','legado','pacote_unha']));
