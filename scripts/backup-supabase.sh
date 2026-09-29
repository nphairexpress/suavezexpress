#!/bin/bash
# Backup manual do Supabase do Sua Vez Express (plano free: sem backup nativo).
# Exporta todas as tabelas public em JSON + definições vivas (funções, policies, triggers, índices,
# grants, colunas) pela Management API, empacota e manda pra VPS substituindo o anterior.
# Uso: scripts/backup-supabase.sh [rotulo]   (ex.: etapa1-pre)
# Credenciais: ~/.config/credentials/suavez_supabase.env (nunca no repo).
set -euo pipefail
REF=ewxiaxsmohxuabcmxuyc
ROTULO="${1:-manual}"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOCAL_BASE="$HOME/Vault/02 - Clientes/NP Hair Express/backups"
DIR="$LOCAL_BASE/$STAMP-$ROTULO"
VPS=root@72.60.6.168
VPS_DIR=/root/backups/suavez

set -a; source "$HOME/.config/credentials/suavez_supabase.env"; set +a
[ -n "${SUPABASE_PAT_SUAVEZ:-}" ] || { echo "PAT ausente"; exit 1; }

Q() { curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT_SUAVEZ" -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"query":sys.argv[1]}))' "$1")"; }

mkdir -p "$DIR/tabelas" "$DIR/schema"

# 1) dados: uma linha JSON por tabela
TABELAS=$(Q "select tablename from pg_tables where schemaname='public' order by 1" | python3 -c "import json,sys;print(' '.join(r['tablename'] for r in json.load(sys.stdin)))")
for t in $TABELAS; do
  Q "select coalesce(json_agg(t), '[]'::json) as rows from public.\"$t\" t" \
    | python3 -c "import json,sys;d=json.load(sys.stdin);json.dump(d[0]['rows'],open(sys.argv[1],'w'),ensure_ascii=False)" "$DIR/tabelas/$t.json"
done

# 2) schema vivo (o que as migrations não garantem: schema_migrations está vazia)
Q "select 'create schema if not exists public;' as ddl union all select pg_get_functiondef(p.oid) || E';\n' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p')" \
  | python3 -c "import json,sys;open(sys.argv[1],'w').write('\n'.join(r['ddl'] for r in json.load(sys.stdin)))" "$DIR/schema/funcoes.sql"
Q "select format('create policy %I on %s as %s for %s to %s using (%s) with check (%s);', polname, polrelid::regclass, case when polpermissive then 'permissive' else 'restrictive' end, case polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end, array_to_string(polroles::regrole[]::text[], ','), coalesce(pg_get_expr(polqual,polrelid),'true'), coalesce(pg_get_expr(polwithcheck,polrelid),'true')) as ddl from pg_policy order by polrelid::regclass::text, polname" \
  | python3 -c "import json,sys;open(sys.argv[1],'w').write('\n'.join(r['ddl'] for r in json.load(sys.stdin)))" "$DIR/schema/policies.sql"
Q "select pg_get_triggerdef(oid) || ';' as ddl from pg_trigger where not tgisinternal order by tgrelid::regclass::text, tgname" \
  | python3 -c "import json,sys;open(sys.argv[1],'w').write('\n'.join(r['ddl'] for r in json.load(sys.stdin)))" "$DIR/schema/triggers.sql"
Q "select indexdef || ';' as ddl from pg_indexes where schemaname='public' order by tablename, indexname" \
  | python3 -c "import json,sys;open(sys.argv[1],'w').write('\n'.join(r['ddl'] for r in json.load(sys.stdin)))" "$DIR/schema/indices.sql"
Q "select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' order by table_name, ordinal_position" \
  | python3 -c "import json,sys;json.dump(json.load(sys.stdin),open(sys.argv[1],'w'),ensure_ascii=False,indent=0)" "$DIR/schema/colunas.json"
Q "select conrelid::regclass::text as tabela, conname, pg_get_constraintdef(oid) as def from pg_constraint where connamespace='public'::regnamespace order by 1,2" \
  | python3 -c "import json,sys;json.dump(json.load(sys.stdin),open(sys.argv[1],'w'),ensure_ascii=False,indent=0)" "$DIR/schema/constraints.json"
Q "select grantee, table_name, string_agg(privilege_type, ',') as privs from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by 1,2 order by 2,1" \
  | python3 -c "import json,sys;json.dump(json.load(sys.stdin),open(sys.argv[1],'w'),ensure_ascii=False,indent=0)" "$DIR/schema/grants.json"

# 3) conferência: contagem por tabela vs linhas exportadas
Q "select relname, n_live_tup from pg_stat_user_tables where schemaname='public' order by 1" \
  | python3 -c "
import json,sys,os
d=json.load(sys.stdin); base=sys.argv[1]; dif=[]
for r in d:
    f=os.path.join(base,'tabelas',r['relname']+'.json')
    n=len(json.load(open(f))) if os.path.exists(f) else -1
    if abs(n-r['n_live_tup'])>max(3,0.05*r['n_live_tup']): dif.append((r['relname'],r['n_live_tup'],n))
print('tabelas:',len(d),'| divergentes (estimativa vs export):',dif)" "$DIR"

# 4) empacota e envia pra VPS (novo substitui o antigo; o anterior fica em anterior/)
( cd "$LOCAL_BASE" && tar -czf "$STAMP-$ROTULO.tgz" "$STAMP-$ROTULO" )
ssh -o BatchMode=yes "$VPS" "mkdir -p $VPS_DIR && rm -rf $VPS_DIR/anterior && ( [ -d $VPS_DIR/latest ] && mv $VPS_DIR/latest $VPS_DIR/anterior || true ) && mkdir -p $VPS_DIR/latest"
scp -q "$LOCAL_BASE/$STAMP-$ROTULO.tgz" "$VPS:$VPS_DIR/latest/"
ssh -o BatchMode=yes "$VPS" "cd $VPS_DIR/latest && tar -xzf *.tgz && ls"
echo "backup ok: $DIR  ->  $VPS:$VPS_DIR/latest/"
