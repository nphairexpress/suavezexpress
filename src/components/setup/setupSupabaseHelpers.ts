// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createExternalAdminClient = (url: string, serviceRoleKey: string) =>
  createClient(url.trim(), serviceRoleKey.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

export const isMissingSchemaError = (error: { message?: string | null; code?: string | null } | null | undefined) =>
  Boolean(
    error &&
      (error.code === "PGRST204" ||
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("relation") ||
        error.message?.includes("Could not find"))
  );

export async function checkExternalSchema(url: string, serviceRoleKey: string) {
  const client = createExternalAdminClient(url, serviceRoleKey);
  const { error } = await client.from("salons").select("id", { count: "exact", head: true });

  if (!error) {
    return { status: "success" as const };
  }

  if (isMissingSchemaError(error)) {
    return { status: "no_schema" as const, error };
  }

  throw error;
}

export async function waitForExternalSchema(
  url: string,
  serviceRoleKey: string,
  attempts = 8,
  delayMs = 1500
) {
  let lastMissingSchemaError: { message?: string | null; code?: string | null } | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await checkExternalSchema(url, serviceRoleKey);

    if (result.status === "success") {
      return result;
    }

    lastMissingSchemaError = result.error;

    if (attempt < attempts) {
      await delay(delayMs);
    }
  }

  return { status: "no_schema" as const, error: lastMissingSchemaError };
}
