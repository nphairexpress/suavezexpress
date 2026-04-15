import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isIgnorableSqlError = (message = "") =>
  message.includes("already exists") || message.includes("duplicate key value violates unique constraint");

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarTag: string | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];

    if (!inSingleQuote && !inDoubleQuote && char === "$") {
      const dollarMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);

      if (dollarMatch) {
        const tag = dollarMatch[0];

        if (dollarTag === tag) {
          dollarTag = null;
        } else if (!dollarTag) {
          dollarTag = tag;
        }

        current += tag;
        index += tag.length - 1;
        continue;
      }
    }

    if (!dollarTag && !inDoubleQuote && char === "'") {
      if (inSingleQuote && sql[index + 1] === "'") {
        current += "''";
        index += 1;
        continue;
      }

      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (!dollarTag && !inSingleQuote && char === '"') {
      if (inDoubleQuote && sql[index + 1] === '"') {
        current += '""';
        index += 1;
        continue;
      }

      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote && !dollarTag) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trailingStatement = current.trim();
  if (trailingStatement) {
    statements.push(trailingStatement);
  }

  return statements;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let client: any = null;

  try {
    const { supabaseUrl, dbPassword, schemaSql } = await req.json();

    if (!supabaseUrl || !dbPassword || !schemaSql) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: supabaseUrl, dbPassword, schemaSql" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hostname = new URL(supabaseUrl).hostname;
    if (!hostname.endsWith(".supabase.co")) {
      return new Response(
        JSON.stringify({ error: "Invalid Supabase URL format. Expected: https://xxxxx.supabase.co" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectRef = hostname.split(".")[0];
    const dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;

    const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    client = new Client(dbUrl);
    await client.connect();

    const statements = splitSqlStatements(schemaSql);
    let executed = 0;
    let skipped = 0;

    for (const statement of statements) {
      try {
        await client.queryArray(statement);
        executed += 1;
      } catch (sqlError: any) {
        const message = sqlError?.message || "Unknown SQL error";

        if (isIgnorableSqlError(message)) {
          skipped += 1;
          continue;
        }

        const statementPreview = statement.replace(/\s+/g, " ").slice(0, 200);
        throw new Error(`${message} | SQL: ${statementPreview}`);
      }
    }

    await client.queryArray("NOTIFY pgrst, 'reload schema'");
    await delay(1000);

    const verification = await client.queryArray("SELECT to_regclass('public.salons')");
    if (!verification.rows[0]?.[0]) {
      throw new Error("Tabela public.salons não foi criada corretamente.");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Schema criado com sucesso!", executed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Setup schema error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Erro interno ao configurar o schema" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        // noop
      }
    }
  }
});
