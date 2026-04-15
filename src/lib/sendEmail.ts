import { supabase } from "@/lib/dynamicSupabaseClient";

interface SendEmailParams {
  type: "cashback" | "expiring" | "birthday" | "welcome" | "campaign" | "return_reminder" | "appointment_created" | "appointment_confirmation" | "appointment_reminder" | "appointment_update" | "appointment_cancellation";
  salon_id: string;
  to_email: string;
  to_name: string;
  client_id?: string;
  variables?: Record<string, string>;
  campaign_id?: string;
  subject?: string;
  body?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: params,
  });
  if (error) throw error;
  return data;
}
