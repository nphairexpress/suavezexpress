-- 29/09/2026 — plano 'esmaltacao_4x' (assinante só de esmaltação, R$148) aceito em clube_assinantes;
-- o webhook passa a reconhecer R$237/148 (auditoria F-13/R-03). Aplicada via Management API.
-- Reversão: recriar o check sem 'esmaltacao_4x' (nenhuma linha usa ainda).
alter table clube_assinantes drop constraint clube_assinantes_plano_check;
alter table clube_assinantes add constraint clube_assinantes_plano_check check (plano = any (array['4x_curto_medio','4x_longo','8x_curto_medio','8x_longo','unha_4m2p','esmaltacao_4x']));
