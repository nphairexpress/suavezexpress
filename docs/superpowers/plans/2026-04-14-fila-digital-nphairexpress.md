# Fila Digital NP Hair Express — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a digital queue system to the NP Hair Express fork of sistemanp — customers buy services online, enter the queue, and get WhatsApp/email notifications as their turn approaches.

**Architecture:** New Supabase tables (`queue_entries`, `queue_leads`, `customer_credits`, `queue_settings`) + public routes (no auth) for the customer-facing queue page + admin panel for reception staff. Asaas checkout transparente for payments, Z-API for WhatsApp notifications, Resend for email fallback. Supabase Realtime for live queue updates. Closing a comanda triggers "you're next" notification to the next person in queue.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Realtime + RLS + Edge Functions), Asaas API (checkout transparente), Z-API (WhatsApp), Resend (email), shadcn/ui, TanStack React Query, React Router v6

---

## Task 1: Fork Repository and Initial Setup

**Files:**
- Create: new repository `nphairexpress` (fork of `sistemanp`)

- [ ] **Step 1: Fork the repository**

```bash
cd /Users/pc
cp -r sistemanp nphairexpress
cd nphairexpress
rm -rf .git
git init
git add -A
git commit -m "feat: fork sistemanp for NP Hair Express queue system"
```

- [ ] **Step 2: Update package.json name**

In `/Users/pc/nphairexpress/package.json`, change the `name` field:

```json
{
  "name": "nphairexpress"
}
```

- [ ] **Step 3: Verify the app runs**

```bash
cd /Users/pc/nphairexpress
bun install
bun run dev
```

Expected: App starts on localhost, existing features work.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: rename package to nphairexpress"
```

---

## Task 2: Database Schema — Queue Tables

**Files:**
- Create: `supabase/migrations/20260414_queue_tables.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Queue entries: main queue table
CREATE TYPE queue_status AS ENUM ('waiting', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show');
CREATE TYPE queue_source AS ENUM ('online', 'walk_in');
CREATE TYPE queue_payment_status AS ENUM ('pending', 'confirmed', 'refunded', 'credit');

CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id),
  customer_id UUID REFERENCES clients(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id UUID NOT NULL REFERENCES services(id),
  status queue_status NOT NULL DEFAULT 'waiting',
  source queue_source NOT NULL DEFAULT 'online',
  position INTEGER NOT NULL,
  payment_id TEXT,
  payment_status queue_payment_status DEFAULT 'pending',
  notify_minutes_before INTEGER DEFAULT 40,
  notify_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notify_next_sent BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_time TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  assigned_professional_id UUID REFERENCES professionals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Queue leads: "notify me when queue is shorter"
CREATE TABLE queue_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  max_queue_size INTEGER NOT NULL DEFAULT 3,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer credits from no-shows
CREATE TABLE customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id),
  customer_id UUID REFERENCES clients(id),
  customer_phone TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  origin_queue_entry_id UUID REFERENCES queue_entries(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Queue settings per salon
CREATE TABLE queue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL UNIQUE REFERENCES salons(id),
  inflation_factor DECIMAL(3,2) NOT NULL DEFAULT 1.70,
  credit_validity_days INTEGER NOT NULL DEFAULT 30,
  notify_options JSONB NOT NULL DEFAULT '[20, 40, 60, 90]',
  reception_email TEXT,
  zapi_instance_id TEXT,
  zapi_token TEXT,
  asaas_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_queue_entries_salon_status ON queue_entries(salon_id, status);
CREATE INDEX idx_queue_entries_position ON queue_entries(salon_id, position);
CREATE INDEX idx_queue_leads_salon ON queue_leads(salon_id, notified);
CREATE INDEX idx_customer_credits_phone ON customer_credits(customer_phone, used, expires_at);

-- RLS Policies
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access to their salon
CREATE POLICY "queue_entries_salon" ON queue_entries
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "queue_leads_salon" ON queue_leads
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "customer_credits_salon" ON customer_credits
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "queue_settings_salon" ON queue_settings
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

-- Anonymous users: read queue count only, insert entries and leads
CREATE POLICY "queue_entries_anon_read" ON queue_entries
  FOR SELECT USING (TRUE);

CREATE POLICY "queue_entries_anon_insert" ON queue_entries
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "queue_leads_anon_insert" ON queue_leads
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "queue_settings_anon_read" ON queue_settings
  FOR SELECT USING (TRUE);
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/pc/nphairexpress
# Apply via Supabase dashboard SQL editor or CLI
# Copy the SQL and execute in the NP Hair Express Supabase project
```

Expected: All 4 tables created with RLS policies and indexes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260414_queue_tables.sql
git commit -m "feat: add queue_entries, queue_leads, customer_credits, queue_settings tables"
```

---

## Task 3: TypeScript Types for Queue

**Files:**
- Create: `src/types/queue.ts`

- [ ] **Step 1: Create the types file**

```typescript
export type QueueStatus = "waiting" | "checked_in" | "in_service" | "completed" | "cancelled" | "no_show";
export type QueueSource = "online" | "walk_in";
export type QueuePaymentStatus = "pending" | "confirmed" | "refunded" | "credit";

export interface QueueEntry {
  id: string;
  salon_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_id: string;
  status: QueueStatus;
  source: QueueSource;
  position: number;
  payment_id: string | null;
  payment_status: QueuePaymentStatus;
  notify_minutes_before: number;
  notify_sent: boolean;
  notify_next_sent: boolean;
  estimated_time: string | null;
  checked_in_at: string | null;
  assigned_professional_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  service?: { id: string; name: string; price: number; duration_minutes: number };
  professional?: { id: string; name: string };
}

export interface QueueEntryInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_id: string;
  source: QueueSource;
  notify_minutes_before?: number;
  payment_id?: string;
}

export interface QueueLead {
  id: string;
  salon_id: string;
  name: string;
  phone: string;
  max_queue_size: number;
  notified: boolean;
  created_at: string;
}

export interface QueueLeadInput {
  name: string;
  phone: string;
  max_queue_size: number;
}

export interface CustomerCredit {
  id: string;
  salon_id: string;
  customer_id: string | null;
  customer_phone: string;
  amount: number;
  origin_queue_entry_id: string | null;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface QueueSettings {
  id: string;
  salon_id: string;
  inflation_factor: number;
  credit_validity_days: number;
  notify_options: number[];
  reception_email: string | null;
  zapi_instance_id: string | null;
  zapi_token: string | null;
  asaas_api_key: string | null;
}

export interface QueueStats {
  totalInQueue: number;
  inflatedCount: number;
  estimatedMinutes: number;
  activeProfessionals: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/queue.ts
git commit -m "feat: add TypeScript types for queue system"
```

---

## Task 4: Hook — useQueueSettings

**Files:**
- Create: `src/hooks/useQueueSettings.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { QueueSettings } from "@/types/queue";

const SALON_ID_NP = "YOUR_NP_HAIR_SALON_ID"; // Will be set after fork setup

export function useQueueSettings() {
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const effectiveSalonId = salonId || SALON_ID_NP;

  const query = useQuery({
    queryKey: ["queue_settings", effectiveSalonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_settings")
        .select("*")
        .eq("salon_id", effectiveSalonId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Return defaults if no settings row exists yet
        return {
          id: "",
          salon_id: effectiveSalonId,
          inflation_factor: 1.7,
          credit_validity_days: 30,
          notify_options: [20, 40, 60, 90],
          reception_email: null,
          zapi_instance_id: null,
          zapi_token: null,
          asaas_api_key: null,
        } as QueueSettings;
      }

      return data as QueueSettings;
    },
    enabled: !!effectiveSalonId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: Partial<QueueSettings>) => {
      const { data, error } = await supabase
        .from("queue_settings")
        .upsert(
          { ...input, salon_id: effectiveSalonId },
          { onConflict: "salon_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_settings", effectiveSalonId] });
      toast({ title: "Configurações da fila salvas!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar configurações", description: error.message, variant: "destructive" });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useQueueSettings.ts
git commit -m "feat: add useQueueSettings hook"
```

---

## Task 5: Hook — useQueue (core queue management)

**Files:**
- Create: `src/hooks/useQueue.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { QueueEntry, QueueEntryInput, QueueStats } from "@/types/queue";

const SALON_ID_NP = "YOUR_NP_HAIR_SALON_ID";

export function useQueue() {
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const effectiveSalonId = salonId || SALON_ID_NP;

  // Fetch active queue entries (not completed/cancelled/no_show)
  const query = useQuery({
    queryKey: ["queue", effectiveSalonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_entries")
        .select(`
          *,
          service:services(id, name, price, duration_minutes),
          professional:professionals(id, name)
        `)
        .eq("salon_id", effectiveSalonId)
        .in("status", ["waiting", "checked_in", "in_service"])
        .order("position", { ascending: true });

      if (error) throw error;
      return data as QueueEntry[];
    },
    enabled: !!effectiveSalonId,
  });

  // Get next available position
  const getNextPosition = async (): Promise<number> => {
    const { data } = await supabase
      .from("queue_entries")
      .select("position")
      .eq("salon_id", effectiveSalonId)
      .in("status", ["waiting", "checked_in", "in_service"])
      .order("position", { ascending: false })
      .limit(1);

    return (data && data.length > 0) ? data[0].position + 1 : 1;
  };

  // Add to queue (used by both online purchase and walk-in)
  const addToQueueMutation = useMutation({
    mutationFn: async (input: QueueEntryInput) => {
      const position = await getNextPosition();

      const { data, error } = await supabase
        .from("queue_entries")
        .insert({
          salon_id: effectiveSalonId,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_email: input.customer_email || null,
          service_id: input.service_id,
          source: input.source,
          position,
          notify_minutes_before: input.notify_minutes_before || 40,
          payment_id: input.payment_id || null,
          payment_status: input.source === "walk_in" ? "confirmed" : "pending",
          status: input.source === "walk_in" ? "checked_in" : "waiting",
          checked_in_at: input.source === "walk_in" ? new Date().toISOString() : null,
        })
        .select(`
          *,
          service:services(id, name, price, duration_minutes)
        `)
        .single();

      if (error) throw error;
      return data as QueueEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar na fila", description: error.message, variant: "destructive" });
    },
  });

  // Check-in (online client arrived)
  const checkInMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("queue_entries")
        .update({
          status: "checked_in",
          checked_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
      toast({ title: "Check-in realizado!" });
    },
  });

  // Assign professional (moves to in_service)
  const assignProfessionalMutation = useMutation({
    mutationFn: async ({ entryId, professionalId }: { entryId: string; professionalId: string }) => {
      const { error } = await supabase
        .from("queue_entries")
        .update({
          assigned_professional_id: professionalId,
          status: "in_service",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;
      return { entryId, professionalId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
      toast({ title: "Profissional atribuído!" });
    },
  });

  // Complete (after comanda closed)
  const completeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("queue_entries")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
    },
  });

  // Skip (move to end of queue)
  const skipMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const nextPos = await getNextPosition();
      const { error } = await supabase
        .from("queue_entries")
        .update({
          position: nextPos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
      toast({ title: "Cliente pulada na fila" });
    },
  });

  // Remove (cancel + generate credit if online)
  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // Get entry details first
      const { data: entry } = await supabase
        .from("queue_entries")
        .select("*, service:services(price)")
        .eq("id", entryId)
        .single();

      if (!entry) throw new Error("Entrada não encontrada");

      // If online and paid, create credit
      if (entry.source === "online" && entry.payment_status === "confirmed") {
        const { data: settings } = await supabase
          .from("queue_settings")
          .select("credit_validity_days")
          .eq("salon_id", effectiveSalonId)
          .single();

        const validityDays = settings?.credit_validity_days || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + validityDays);

        await supabase.from("customer_credits").insert({
          salon_id: effectiveSalonId,
          customer_id: entry.customer_id,
          customer_phone: entry.customer_phone,
          amount: entry.service?.price || 0,
          origin_queue_entry_id: entryId,
          expires_at: expiresAt.toISOString(),
        });
      }

      // Mark as no_show or cancelled
      const newStatus = entry.source === "online" ? "no_show" : "cancelled";
      const { error } = await supabase
        .from("queue_entries")
        .update({
          status: newStatus,
          payment_status: entry.source === "online" ? "credit" : entry.payment_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
      toast({ title: "Cliente removida da fila" });
    },
  });

  // Reorder (drag and drop)
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("queue_entries")
          .update({ position: index + 1, updated_at: new Date().toISOString() })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
    },
  });

  // Calculate queue stats
  const entries = query.data || [];
  const activeEntries = entries.filter((e) => ["waiting", "checked_in"].includes(e.status));
  const inServiceCount = entries.filter((e) => e.status === "in_service").length;

  const totalMinutes = activeEntries.reduce(
    (sum, e) => sum + (e.service?.duration_minutes || 45),
    0
  );
  const activeProfessionals = Math.max(inServiceCount, 1);
  const estimatedMinutes = Math.ceil(totalMinutes / activeProfessionals);

  const stats: QueueStats = {
    totalInQueue: activeEntries.length,
    inflatedCount: 0, // Calculated in component using settings.inflation_factor
    estimatedMinutes,
    activeProfessionals,
  };

  return {
    entries,
    activeEntries,
    stats,
    isLoading: query.isLoading,
    addToQueue: addToQueueMutation.mutateAsync,
    isAdding: addToQueueMutation.isPending,
    checkIn: checkInMutation.mutate,
    assignProfessional: assignProfessionalMutation.mutateAsync,
    complete: completeMutation.mutate,
    skip: skipMutation.mutate,
    remove: removeMutation.mutate,
    reorder: reorderMutation.mutate,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useQueue.ts
git commit -m "feat: add useQueue hook with full queue management"
```

---

## Task 6: Hook — useQueueLeads

**Files:**
- Create: `src/hooks/useQueueLeads.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { QueueLead, QueueLeadInput } from "@/types/queue";

const SALON_ID_NP = "YOUR_NP_HAIR_SALON_ID";

export function useQueueLeads() {
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const effectiveSalonId = salonId || SALON_ID_NP;

  const query = useQuery({
    queryKey: ["queue_leads", effectiveSalonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_leads")
        .select("*")
        .eq("salon_id", effectiveSalonId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as QueueLead[];
    },
    enabled: !!effectiveSalonId,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (input: QueueLeadInput) => {
      const { data, error } = await supabase
        .from("queue_leads")
        .insert({
          salon_id: effectiveSalonId,
          name: input.name,
          phone: input.phone,
          max_queue_size: input.max_queue_size,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QueueLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_leads", effectiveSalonId] });
    },
  });

  const markNotifiedMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("queue_leads")
        .update({ notified: true })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_leads", effectiveSalonId] });
      toast({ title: "Lead notificada!" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("queue_leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_leads", effectiveSalonId] });
    },
  });

  const pendingLeads = (query.data || []).filter((l) => !l.notified);
  const notifiedLeads = (query.data || []).filter((l) => l.notified);

  return {
    leads: query.data || [],
    pendingLeads,
    notifiedLeads,
    isLoading: query.isLoading,
    addLead: addLeadMutation.mutateAsync,
    markNotified: markNotifiedMutation.mutate,
    deleteLead: deleteLeadMutation.mutate,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useQueueLeads.ts
git commit -m "feat: add useQueueLeads hook"
```

---

## Task 7: Hook — useQueueRealtime

**Files:**
- Create: `src/hooks/useQueueRealtime.ts`

- [ ] **Step 1: Create the Realtime subscription hook**

```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";

const SALON_ID_NP = "YOUR_NP_HAIR_SALON_ID";

export function useQueueRealtime(salonId?: string) {
  const queryClient = useQueryClient();
  const effectiveSalonId = salonId || SALON_ID_NP;

  useEffect(() => {
    if (!effectiveSalonId) return;

    const channel = supabase
      .channel(`queue_${effectiveSalonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `salon_id=eq.${effectiveSalonId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["queue", effectiveSalonId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_leads",
          filter: `salon_id=eq.${effectiveSalonId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["queue_leads", effectiveSalonId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveSalonId, queryClient]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useQueueRealtime.ts
git commit -m "feat: add useQueueRealtime hook for live queue updates"
```

---

## Task 8: Notification Service — Z-API + Resend

**Files:**
- Create: `src/lib/queueNotifications.ts`

- [ ] **Step 1: Create the notification service**

```typescript
import { supabase } from "@/lib/dynamicSupabaseClient";
import { sendEmail } from "@/lib/sendEmail";

interface NotifyParams {
  phone: string;
  email?: string | null;
  message: string;
  salonId: string;
  emailSubject?: string;
  emailBody?: string;
}

async function getZapiCredentials(salonId: string) {
  const { data } = await supabase
    .from("queue_settings")
    .select("zapi_instance_id, zapi_token")
    .eq("salon_id", salonId)
    .single();

  return data;
}

async function sendWhatsApp(phone: string, message: string, salonId: string): Promise<boolean> {
  const creds = await getZapiCredentials(salonId);
  if (!creds?.zapi_instance_id || !creds?.zapi_token) {
    console.warn("Z-API not configured, skipping WhatsApp");
    return false;
  }

  // Format phone: remove non-digits, ensure country code
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${creds.zapi_instance_id}/token/${creds.zapi_token}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("WhatsApp send failed:", error);
    return false;
  }
}

export async function notifyClient({ phone, email, message, salonId, emailSubject, emailBody }: NotifyParams) {
  // Try WhatsApp first
  const whatsappSent = await sendWhatsApp(phone, message, salonId);

  // Send email as fallback (or alongside for important notifications)
  if (email && emailSubject) {
    try {
      await sendEmail({
        type: "campaign",
        salon_id: salonId,
        to_email: email,
        to_name: "",
        subject: emailSubject,
        body: emailBody || message,
      });
    } catch (error) {
      console.error("Email send failed:", error);
    }
  }

  return whatsappSent;
}

export async function notifyQueueEntry(
  salonId: string,
  entry: { customer_phone: string; customer_email: string | null; customer_name: string },
  type: "entered" | "advance" | "next" | "skipped" | "credit",
  extra?: { position?: number; estimatedTime?: string; creditAmount?: number; trackingUrl?: string }
) {
  const messages: Record<string, { whatsapp: string; emailSubject: string; emailBody: string }> = {
    entered: {
      whatsapp: `Oi ${entry.customer_name}! Voce entrou na fila do NP Hair Express. Posicao: ${extra?.position}a. Acompanhe aqui: ${extra?.trackingUrl}`,
      emailSubject: "Voce entrou na fila - NP Hair Express",
      emailBody: `Oi ${entry.customer_name}! Voce esta na posicao ${extra?.position} da fila. Acompanhe em tempo real: ${extra?.trackingUrl}`,
    },
    advance: {
      whatsapp: `${entry.customer_name}, faltam aproximadamente ${extra?.estimatedTime} minutos pro seu atendimento no NP Hair. Venha se preparando!`,
      emailSubject: "Sua vez esta chegando - NP Hair Express",
      emailBody: `Faltam aproximadamente ${extra?.estimatedTime} minutos para o seu atendimento.`,
    },
    next: {
      whatsapp: `${entry.customer_name}, voce e a proxima! Chegue ao NP Hair Express nos proximos 15 minutos.`,
      emailSubject: "Voce e a proxima! - NP Hair Express",
      emailBody: `Sua vez chegou! Por favor, chegue ao NP Hair Express nos proximos 15 minutos.`,
    },
    skipped: {
      whatsapp: `${entry.customer_name}, passamos a proxima da fila. Voce ainda esta na lista, avise quando chegar!`,
      emailSubject: "",
      emailBody: "",
    },
    credit: {
      whatsapp: `${entry.customer_name}, voce recebeu um credito de R$${extra?.creditAmount?.toFixed(2)} valido por 30 dias no NP Hair Express. Volte quando quiser!`,
      emailSubject: "Credito disponivel - NP Hair Express",
      emailBody: `Voce recebeu um credito de R$${extra?.creditAmount?.toFixed(2)} valido por 30 dias. Volte quando quiser!`,
    },
  };

  const msg = messages[type];
  if (!msg) return;

  const sendEmailForTypes = ["entered", "next", "credit"];

  await notifyClient({
    phone: entry.customer_phone,
    email: sendEmailForTypes.includes(type) ? entry.customer_email : null,
    message: msg.whatsapp,
    salonId,
    emailSubject: msg.emailSubject || undefined,
    emailBody: msg.emailBody || undefined,
  });
}

export async function notifyLead(
  salonId: string,
  lead: { phone: string; name: string },
  currentQueueSize: number,
  queueUrl: string
) {
  await notifyClient({
    phone: lead.phone,
    message: `${lead.name}, a fila do NP Hair ta rapidinha agora! So ${currentQueueSize} pessoa(s). Quer entrar? ${queueUrl}`,
    salonId,
  });
}

export async function notifyReception(salonId: string, subject: string, body: string) {
  const { data: settings } = await supabase
    .from("queue_settings")
    .select("reception_email")
    .eq("salon_id", salonId)
    .single();

  if (settings?.reception_email) {
    await sendEmail({
      type: "campaign",
      salon_id: salonId,
      to_email: settings.reception_email,
      to_name: "Recepcao",
      subject,
      body,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queueNotifications.ts
git commit -m "feat: add queue notification service (Z-API + Resend)"
```

---

## Task 9: Asaas Checkout Transparente Integration

**Files:**
- Create: `src/lib/asaas.ts`
- Create: `src/components/queue/AsaasCheckout.tsx`

- [ ] **Step 1: Create the Asaas API client**

```typescript
import { supabase } from "@/lib/dynamicSupabaseClient";

const ASAAS_BASE_URL = "https://api.asaas.com/v3";

async function getAsaasKey(salonId: string): Promise<string | null> {
  const { data } = await supabase
    .from("queue_settings")
    .select("asaas_api_key")
    .eq("salon_id", salonId)
    .single();

  return data?.asaas_api_key || null;
}

export interface AsaasPaymentInput {
  customerName: string;
  customerCpfCnpj: string;
  customerPhone: string;
  customerEmail?: string;
  value: number;
  description: string;
  externalReference: string; // queue_entry_id
}

export interface AsaasPaymentResponse {
  id: string;
  status: string;
  invoiceUrl: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
}

export async function createAsaasPayment(
  salonId: string,
  input: AsaasPaymentInput
): Promise<AsaasPaymentResponse> {
  const apiKey = await getAsaasKey(salonId);
  if (!apiKey) throw new Error("Asaas API key not configured");

  // Step 1: Create or find customer
  const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify({
      name: input.customerName,
      cpfCnpj: input.customerCpfCnpj,
      phone: input.customerPhone,
      email: input.customerEmail,
    }),
  });

  const customer = await customerRes.json();
  const customerId = customer.id || customer.errors?.[0]?.description?.match(/cus_\w+/)?.[0];

  if (!customerId) throw new Error("Falha ao criar cliente no Asaas");

  // Step 2: Create PIX payment
  const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: input.value,
      description: input.description,
      externalReference: input.externalReference,
      dueDate: new Date().toISOString().split("T")[0],
    }),
  });

  const payment = await paymentRes.json();
  if (payment.errors) throw new Error(payment.errors[0]?.description || "Erro no pagamento");

  // Step 3: Get PIX QR code
  const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
    headers: { access_token: apiKey },
  });

  const pixData = await pixRes.json();

  return {
    id: payment.id,
    status: payment.status,
    invoiceUrl: payment.invoiceUrl,
    pixQrCode: pixData.success !== false ? pixData : undefined,
  };
}

export async function getAsaasPaymentStatus(salonId: string, paymentId: string): Promise<string> {
  const apiKey = await getAsaasKey(salonId);
  if (!apiKey) throw new Error("Asaas API key not configured");

  const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
    headers: { access_token: apiKey },
  });

  const data = await res.json();
  return data.status; // PENDING, RECEIVED, CONFIRMED, etc.
}
```

- [ ] **Step 2: Create the checkout component**

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAsaasPayment, getAsaasPaymentStatus } from "@/lib/asaas";
import type { AsaasPaymentResponse } from "@/lib/asaas";

interface AsaasCheckoutProps {
  salonId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  servicePrice: number;
  queueEntryId: string;
  onPaymentConfirmed: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function AsaasCheckout({
  salonId,
  customerName,
  customerPhone,
  customerEmail,
  serviceName,
  servicePrice,
  queueEntryId,
  onPaymentConfirmed,
  onError,
}: AsaasCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<AsaasPaymentResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Create payment on mount
  useEffect(() => {
    async function initPayment() {
      try {
        const result = await createAsaasPayment(salonId, {
          customerName,
          customerCpfCnpj: "",
          customerPhone,
          customerEmail,
          value: servicePrice,
          description: `NP Hair Express - ${serviceName}`,
          externalReference: queueEntryId,
        });
        setPayment(result);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Erro ao criar pagamento");
      } finally {
        setLoading(false);
      }
    }
    initPayment();
  }, []);

  // Poll for payment confirmation every 5 seconds
  useEffect(() => {
    if (!payment?.id || confirmed) return;

    const interval = setInterval(async () => {
      try {
        const status = await getAsaasPaymentStatus(salonId, payment.id);
        if (status === "RECEIVED" || status === "CONFIRMED") {
          setConfirmed(true);
          onPaymentConfirmed(payment.id);
          clearInterval(interval);
        }
      } catch {
        // Silently retry
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [payment?.id, confirmed]);

  const handleCopyPix = () => {
    if (payment?.pixQrCode?.payload) {
      navigator.clipboard.writeText(payment.pixQrCode.payload);
      setCopied(true);
      toast({ title: "Codigo PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Gerando pagamento...</p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="text-lg font-semibold">Pagamento confirmado!</p>
      </div>
    );
  }

  if (!payment?.pixQrCode) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Erro ao gerar QR Code PIX.</p>
        <p className="text-sm text-muted-foreground mt-2">Tente novamente em alguns instantes.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <p className="text-lg font-semibold">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(servicePrice)}
        </p>
        <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o codigo PIX</p>

        <img
          src={`data:image/png;base64,${payment.pixQrCode.encodedImage}`}
          alt="QR Code PIX"
          className="w-56 h-56"
        />

        <Button variant="outline" onClick={handleCopyPix} className="w-full">
          {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copiado!" : "Copiar codigo PIX"}
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Aguardando pagamento...
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/asaas.ts src/components/queue/AsaasCheckout.tsx
git commit -m "feat: add Asaas checkout transparente integration with PIX QR code"
```

---

## Task 10: Public Page — Queue Landing (`/fila`)

**Files:**
- Create: `src/pages/FilaPublica.tsx`

- [ ] **Step 1: Create the public queue page**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Clock, Bell } from "lucide-react";
import { useQueue } from "@/hooks/useQueue";
import { useQueueSettings } from "@/hooks/useQueueSettings";
import { useQueueLeads } from "@/hooks/useQueueLeads";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import { useToast } from "@/hooks/use-toast";

export default function FilaPublica() {
  const navigate = useNavigate();
  const { stats } = useQueue();
  const { settings } = useQueueSettings();
  const { addLead } = useQueueLeads();
  const { toast } = useToast();
  useQueueRealtime();

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadMaxQueue, setLeadMaxQueue] = useState("3");

  // Inflated count for visitors
  const inflationFactor = settings?.inflation_factor || 1.7;
  const displayCount = stats.totalInQueue === 0
    ? 0
    : Math.ceil(stats.totalInQueue * inflationFactor);
  const displayMinutes = stats.totalInQueue === 0
    ? 0
    : Math.ceil(stats.estimatedMinutes * inflationFactor);

  const handleLeadSubmit = async () => {
    if (!leadName.trim() || !leadPhone.trim()) {
      toast({ title: "Preencha nome e WhatsApp", variant: "destructive" });
      return;
    }

    try {
      await addLead({
        name: leadName.trim(),
        phone: leadPhone.trim(),
        max_queue_size: parseInt(leadMaxQueue),
      });
      toast({ title: "Pronto! Vamos te avisar quando a fila diminuir." });
      setLeadModalOpen(false);
      setLeadName("");
      setLeadPhone("");
    } catch {
      toast({ title: "Erro ao cadastrar. Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">NP Hair Express</h1>
        <p className="text-zinc-400 mt-1">Salao sem agendamento</p>
      </div>

      {/* Queue Status Card */}
      <Card className="w-full max-w-sm mb-6">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-3xl font-bold">{displayCount}</span>
            <span className="text-muted-foreground">
              {displayCount === 1 ? "pessoa na fila" : "pessoas na fila"}
            </span>
          </div>

          {displayCount > 0 && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Tempo estimado: ~{displayMinutes} min</span>
            </div>
          )}

          {displayCount === 0 && (
            <p className="text-green-500 font-medium">Fila vazia! Atendimento imediato.</p>
          )}
        </CardContent>
      </Card>

      {/* CTA Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          className="w-full h-14 text-lg"
          onClick={() => navigate("/fila/comprar")}
        >
          Quero ser atendida
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setLeadModalOpen(true)}
        >
          <Bell className="h-4 w-4 mr-2" />
          Me avisa quando a fila diminuir
        </Button>
      </div>

      {/* Lead Capture Modal */}
      <Dialog open={leadModalOpen} onOpenChange={setLeadModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Receber aviso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Seu nome"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
            </div>

            <div>
              <Label>WhatsApp</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
              />
            </div>

            <div>
              <Label>Me avisa quando tiver menos de</Label>
              <Select value={leadMaxQueue} onValueChange={setLeadMaxQueue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 pessoas</SelectItem>
                  <SelectItem value="3">3 pessoas</SelectItem>
                  <SelectItem value="5">5 pessoas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLeadSubmit}>Quero ser avisada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FilaPublica.tsx
git commit -m "feat: add public queue landing page with lead capture"
```

---

## Task 11: Public Page — Purchase Flow (`/fila/comprar`)

**Files:**
- Create: `src/pages/FilaComprar.tsx`

- [ ] **Step 1: Create the purchase flow page**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useQueue } from "@/hooks/useQueue";
import { useQueueSettings } from "@/hooks/useQueueSettings";
import { useToast } from "@/hooks/use-toast";
import { AsaasCheckout } from "@/components/queue/AsaasCheckout";
import { notifyQueueEntry, notifyReception } from "@/lib/queueNotifications";

const SALON_ID_NP = "YOUR_NP_HAIR_SALON_ID";
const SITE_URL = "https://nphairexpress.vercel.app"; // Update after deploy

type Step = "service" | "data" | "payment" | "confirmation";

export default function FilaComprar() {
  const navigate = useNavigate();
  const { services } = useServices();
  const { addToQueue, activeEntries } = useQueue();
  const { settings } = useQueueSettings();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("service");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notifyMinutes, setNotifyMinutes] = useState("40");
  const [queueEntryId, setQueueEntryId] = useState<string>("");
  const [queuePosition, setQueuePosition] = useState(0);

  const activeServices = (services || []).filter((s) => s.is_active);
  const selectedService = activeServices.find((s) => s.id === selectedServiceId);
  const notifyOptions = settings?.notify_options || [20, 40, 60, 90];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setStep("data");
  };

  const handleDataSubmit = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast({ title: "Preencha nome e WhatsApp", variant: "destructive" });
      return;
    }

    try {
      // Create queue entry with pending payment
      const entry = await addToQueue({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        service_id: selectedServiceId,
        source: "online",
        notify_minutes_before: parseInt(notifyMinutes),
      });

      setQueueEntryId(entry.id);
      setQueuePosition(entry.position);
      setStep("payment");
    } catch {
      toast({ title: "Erro ao entrar na fila", variant: "destructive" });
    }
  };

  const handlePaymentConfirmed = async (paymentId: string) => {
    // Update queue entry with payment info
    const { supabase } = await import("@/lib/dynamicSupabaseClient");
    await supabase
      .from("queue_entries")
      .update({
        payment_id: paymentId,
        payment_status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueEntryId);

    // Send notifications
    const trackingUrl = `${SITE_URL}/fila/acompanhar/${queueEntryId}`;

    await notifyQueueEntry(SALON_ID_NP, {
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      customer_name: customerName,
    }, "entered", {
      position: queuePosition,
      trackingUrl,
    });

    await notifyReception(
      SALON_ID_NP,
      "Nova cliente na fila!",
      `${customerName} comprou ${selectedService?.name} e entrou na fila (posicao ${queuePosition}).`
    );

    setStep("confirmation");
  };

  const fmt = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-4">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => {
            if (step === "service") navigate("/fila");
            else if (step === "data") setStep("service");
          }}>
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <h1 className="text-xl font-bold text-white">
            {step === "service" && "Escolha o servico"}
            {step === "data" && "Seus dados"}
            {step === "payment" && "Pagamento"}
            {step === "confirmation" && "Confirmado!"}
          </h1>
        </div>

        {/* Step: Service Selection */}
        {step === "service" && (
          <div className="space-y-3">
            {activeServices.map((service) => (
              <Card
                key={service.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleServiceSelect(service.id)}
              >
                <CardContent className="flex justify-between items-center py-4">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                  </div>
                  <p className="font-semibold text-primary">{fmt(service.price)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step: Customer Data */}
        {step === "data" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedService?.name} — {fmt(selectedService?.price || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  placeholder="Seu nome completo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <Label>WhatsApp</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div>
                <Label>E-mail (opcional)</Label>
                <Input
                  placeholder="seu@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>Me avise com antecedencia de</Label>
                <Select value={notifyMinutes} onValueChange={setNotifyMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notifyOptions.map((min) => (
                      <SelectItem key={min} value={String(min)}>
                        {min} minutos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleDataSubmit}>
                Ir para pagamento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Payment */}
        {step === "payment" && selectedService && (
          <AsaasCheckout
            salonId={SALON_ID_NP}
            customerName={customerName}
            customerPhone={customerPhone}
            customerEmail={customerEmail || undefined}
            serviceName={selectedService.name}
            servicePrice={selectedService.price}
            queueEntryId={queueEntryId}
            onPaymentConfirmed={handlePaymentConfirmed}
            onError={(err) => toast({ title: err, variant: "destructive" })}
          />
        )}

        {/* Step: Confirmation */}
        {step === "confirmation" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">Voce entrou na fila!</h2>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-primary">{queuePosition}a posicao</p>
                <p className="text-muted-foreground">
                  Tempo estimado: ~{Math.ceil(
                    (activeEntries.slice(0, queuePosition - 1)
                      .reduce((sum, e) => sum + (e.service?.duration_minutes || 45), 0)
                    ) / Math.max(activeEntries.filter(e => e.status === "in_service").length, 1)
                  )} min
                </p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Voce recebera um aviso no WhatsApp {notifyMinutes} minutos antes do seu atendimento.
              </p>
              <Button
                className="w-full"
                onClick={() => navigate(`/fila/acompanhar/${queueEntryId}`)}
              >
                Acompanhar minha posicao
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FilaComprar.tsx
git commit -m "feat: add purchase flow page with service selection and Asaas payment"
```

---

## Task 12: Public Page — Tracking (`/fila/acompanhar/:id`)

**Files:**
- Create: `src/pages/FilaAcompanhar.tsx`

- [ ] **Step 1: Create the tracking page**

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Clock, Users, AlertTriangle } from "lucide-react";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import type { QueueEntry } from "@/types/queue";

const SALON_ID_NP = "YOUR_NP_HAIR_SALON_ID";

const statusLabels: Record<string, { label: string; color: string }> = {
  waiting: { label: "Aguardando", color: "bg-blue-500" },
  checked_in: { label: "Check-in feito", color: "bg-green-500" },
  in_service: { label: "Em atendimento", color: "bg-orange-500" },
  completed: { label: "Concluido", color: "bg-gray-500" },
  cancelled: { label: "Cancelado", color: "bg-red-500" },
  no_show: { label: "Nao compareceu", color: "bg-red-500" },
};

export default function FilaAcompanhar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  useQueueRealtime();

  // Fetch this specific entry
  const { data: entry, isLoading, refetch } = useQuery({
    queryKey: ["queue_entry", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_entries")
        .select(`
          *,
          service:services(id, name, price, duration_minutes)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as QueueEntry;
    },
    enabled: !!id,
  });

  // Fetch position (how many active entries are ahead)
  const { data: aheadCount } = useQuery({
    queryKey: ["queue_ahead", id, entry?.position],
    queryFn: async () => {
      if (!entry) return 0;
      const { count } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", SALON_ID_NP)
        .in("status", ["waiting", "checked_in", "in_service"])
        .lt("position", entry.position);

      return count || 0;
    },
    enabled: !!entry && ["waiting", "checked_in"].includes(entry.status),
    refetchInterval: 30000,
  });

  // Fetch estimated time
  const { data: estimatedMinutes } = useQuery({
    queryKey: ["queue_estimate", id, aheadCount],
    queryFn: async () => {
      if (!entry || aheadCount === undefined) return 0;
      const { data: ahead } = await supabase
        .from("queue_entries")
        .select("service:services(duration_minutes)")
        .eq("salon_id", SALON_ID_NP)
        .in("status", ["waiting", "checked_in", "in_service"])
        .lt("position", entry.position);

      const totalMin = (ahead || []).reduce(
        (sum, e: any) => sum + (e.service?.duration_minutes || 45), 0
      );

      const { count: inServiceCount } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", SALON_ID_NP)
        .eq("status", "in_service");

      return Math.ceil(totalMin / Math.max(inServiceCount || 1, 1));
    },
    enabled: !!entry && aheadCount !== undefined,
  });

  const handleCancel = async () => {
    if (!id) return;

    const { data: settings } = await supabase
      .from("queue_settings")
      .select("credit_validity_days")
      .eq("salon_id", SALON_ID_NP)
      .single();

    const validityDays = settings?.credit_validity_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Create credit
    if (entry?.payment_status === "confirmed" && entry.service) {
      await supabase.from("customer_credits").insert({
        salon_id: SALON_ID_NP,
        customer_phone: entry.customer_phone,
        amount: entry.service.price,
        origin_queue_entry_id: id,
        expires_at: expiresAt.toISOString(),
      });
    }

    // Cancel entry
    await supabase
      .from("queue_entries")
      .update({
        status: "cancelled",
        payment_status: entry?.payment_status === "confirmed" ? "credit" : entry?.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setCancelDialogOpen(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex flex-col items-center justify-center p-4 text-white">
        <p>Entrada nao encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/fila")}>
          Voltar
        </Button>
      </div>
    );
  }

  const status = statusLabels[entry.status] || statusLabels.waiting;
  const isActive = ["waiting", "checked_in"].includes(entry.status);
  const isNext = aheadCount === 0 && isActive;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex flex-col items-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-white text-center mb-6">NP Hair Express</h1>

        <Card className="mb-4">
          <CardContent className="pt-6 text-center space-y-4">
            {/* Status Badge */}
            <Badge className={`${status.color} text-white`}>
              {status.label}
            </Badge>

            {/* Position */}
            {isActive && (
              <div>
                {isNext ? (
                  <p className="text-2xl font-bold text-green-500">Voce e a proxima!</p>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-bold">{aheadCount}</span>
                      <span className="text-muted-foreground">
                        {aheadCount === 1 ? "pessoa na frente" : "pessoas na frente"}
                      </span>
                    </div>
                    {estimatedMinutes !== undefined && estimatedMinutes > 0 && (
                      <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>~{estimatedMinutes} minutos</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {entry.status === "in_service" && (
              <p className="text-xl font-bold text-orange-500">Voce esta sendo atendida!</p>
            )}

            {entry.status === "completed" && (
              <p className="text-lg text-muted-foreground">Atendimento concluido. Obrigada por vir!</p>
            )}

            {(entry.status === "cancelled" || entry.status === "no_show") && (
              <p className="text-lg text-muted-foreground">
                Voce recebeu um credito valido por 30 dias.
              </p>
            )}

            {/* Service Info */}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Servico</p>
              <p className="font-medium">{entry.service?.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          {isActive && (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setCancelDialogOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Desistir da fila
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desistir da fila?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Voce recebera um credito de{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(entry.service?.price || 0)}{" "}
            valido por 30 dias.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Sim, desistir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FilaAcompanhar.tsx
git commit -m "feat: add public queue tracking page with real-time position"
```

---

## Task 13: Admin Page — Queue Management Panel

**Files:**
- Create: `src/pages/Fila.tsx`
- Create: `src/components/queue/QueueCard.tsx`
- Create: `src/components/queue/AddWalkInModal.tsx`
- Create: `src/components/queue/AssignProfessionalModal.tsx`

- [ ] **Step 1: Create QueueCard component**

```tsx
// src/components/queue/QueueCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, CheckCircle, UserPlus, SkipForward, X, Clock } from "lucide-react";
import type { QueueEntry } from "@/types/queue";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueueCardProps {
  entry: QueueEntry;
  onCheckIn: () => void;
  onAssignProfessional: () => void;
  onSkip: () => void;
  onRemove: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-blue-100 text-blue-800" },
  checked_in: { label: "Presente", className: "bg-green-100 text-green-800" },
  in_service: { label: "Em atendimento", className: "bg-orange-100 text-orange-800" },
};

export function QueueCard({ entry, onCheckIn, onAssignProfessional, onSkip, onRemove }: QueueCardProps) {
  const status = statusConfig[entry.status] || statusConfig.waiting;
  const timeInQueue = formatDistanceToNow(new Date(entry.created_at), { locale: ptBR, addSuffix: false });

  return (
    <Card className="mb-2">
      <CardContent className="flex items-center gap-3 py-3">
        {/* Drag Handle */}
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />

        {/* Position */}
        <span className="text-lg font-bold w-8 text-center shrink-0">{entry.position}</span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{entry.customer_name}</span>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <Badge variant="outline">
              {entry.source === "online" ? "Online" : "Presencial"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{entry.service?.name}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeInQueue}
            </span>
            {entry.professional && (
              <span className="font-medium text-foreground">
                {entry.professional.name}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {entry.status === "waiting" && entry.source === "online" && (
            <Button variant="ghost" size="icon" title="Check-in" onClick={onCheckIn}>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {(entry.status === "checked_in" || (entry.status === "waiting" && entry.source === "walk_in")) && (
            <Button variant="ghost" size="icon" title="Atribuir profissional" onClick={onAssignProfessional}>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          {entry.status !== "in_service" && (
            <Button variant="ghost" size="icon" title="Pular" onClick={onSkip}>
              <SkipForward className="h-4 w-4 text-orange-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Remover" onClick={onRemove}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create AddWalkInModal**

```tsx
// src/components/queue/AddWalkInModal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServices } from "@/hooks/useServices";
import { useToast } from "@/hooks/use-toast";

interface AddWalkInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { customer_name: string; customer_phone: string; service_id: string }) => void;
}

export function AddWalkInModal({ open, onClose, onSubmit }: AddWalkInModalProps) {
  const { services } = useServices();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");

  const activeServices = (services || []).filter((s) => s.is_active);

  const handleSubmit = () => {
    if (!name.trim() || !serviceId) {
      toast({ title: "Preencha nome e servico", variant: "destructive" });
      return;
    }
    onSubmit({
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      service_id: serviceId,
    });
    setName("");
    setPhone("");
    setServiceId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar cliente presencial</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da cliente" />
          </div>
          <div>
            <Label>WhatsApp (opcional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>Servico</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {activeServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Adicionar na fila</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create AssignProfessionalModal**

```tsx
// src/components/queue/AssignProfessionalModal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useProfessionals } from "@/hooks/useProfessionals";

interface AssignProfessionalModalProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  serviceName: string;
  onAssign: (professionalId: string) => void;
}

export function AssignProfessionalModal({
  open,
  onClose,
  customerName,
  serviceName,
  onAssign,
}: AssignProfessionalModalProps) {
  const { professionals } = useProfessionals();
  const [selectedId, setSelectedId] = useState("");

  const activeProfessionals = (professionals || []).filter((p) => p.is_active);

  const handleAssign = () => {
    if (!selectedId) return;
    onAssign(selectedId);
    setSelectedId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir profissional</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {customerName} — {serviceName}
        </p>
        <div>
          <Label>Profissional</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {activeProfessionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!selectedId}>
            Atribuir e abrir comanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create the admin Fila page**

```tsx
// src/pages/Fila.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayoutNew from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Clock, UserCheck, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueue } from "@/hooks/useQueue";
import { useQueueLeads } from "@/hooks/useQueueLeads";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import { useComandas } from "@/hooks/useComandas";
import { useToast } from "@/hooks/use-toast";
import { QueueCard } from "@/components/queue/QueueCard";
import { AddWalkInModal } from "@/components/queue/AddWalkInModal";
import { AssignProfessionalModal } from "@/components/queue/AssignProfessionalModal";
import { notifyQueueEntry, notifyLead, notifyReception } from "@/lib/queueNotifications";
import type { QueueEntry } from "@/types/queue";

const SITE_URL = "https://nphairexpress.vercel.app";

export default function Fila() {
  const { salonId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    entries,
    activeEntries,
    stats,
    addToQueue,
    checkIn,
    assignProfessional,
    complete,
    skip,
    remove,
  } = useQueue();
  const { pendingLeads, notifiedLeads, markNotified } = useQueueLeads();
  const { createComanda } = useComandas();
  useQueueRealtime(salonId || undefined);

  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);

  // Play sound when new online entry arrives
  const [prevCount, setPrevCount] = useState(entries.length);
  useEffect(() => {
    if (entries.length > prevCount) {
      const newEntry = entries.find((e) => e.source === "online" && e.status === "waiting");
      if (newEntry) {
        // Browser notification sound
        try { new Audio("/notification.mp3").play(); } catch {}
      }
    }
    setPrevCount(entries.length);
  }, [entries.length]);

  const handleAddWalkIn = async (data: { customer_name: string; customer_phone: string; service_id: string }) => {
    try {
      await addToQueue({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        service_id: data.service_id,
        source: "walk_in",
      });
      toast({ title: "Cliente adicionada na fila!" });
    } catch {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleAssignProfessional = async (professionalId: string) => {
    if (!selectedEntry || !salonId) return;

    try {
      // 1. Assign in queue
      await assignProfessional({
        entryId: selectedEntry.id,
        professionalId,
      });

      // 2. Create comanda automatically
      createComanda({
        client_id: selectedEntry.customer_id,
        professional_id: professionalId,
      });

      toast({ title: "Profissional atribuido e comanda aberta!" });
    } catch {
      toast({ title: "Erro ao atribuir", variant: "destructive" });
    }
  };

  const handleCheckIn = (entry: QueueEntry) => {
    checkIn(entry.id);
  };

  const handleSkip = (entry: QueueEntry) => {
    skip(entry.id);
    if (entry.source === "online" && entry.customer_phone) {
      notifyQueueEntry(salonId!, entry, "skipped");
    }
  };

  const handleRemove = (entry: QueueEntry) => {
    remove(entry.id);
    if (entry.source === "online" && entry.payment_status === "confirmed") {
      notifyQueueEntry(salonId!, entry, "credit", {
        creditAmount: entry.service?.price,
      });
    }
  };

  const handleNotifyLead = async (lead: { id: string; phone: string; name: string }) => {
    if (!salonId) return;
    await notifyLead(salonId, lead, stats.totalInQueue, `${SITE_URL}/fila`);
    markNotified(lead.id);
  };

  const inServiceEntries = entries.filter((e) => e.status === "in_service");
  const waitingEntries = entries.filter((e) => ["waiting", "checked_in"].includes(e.status));

  return (
    <AppLayoutNew>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fila de Atendimento</h1>
          <Button onClick={() => setWalkInModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar presencial
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold">{stats.totalInQueue}</p>
              <p className="text-xs text-muted-foreground">Na fila</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="text-2xl font-bold">~{stats.estimatedMinutes} min</p>
              <p className="text-xs text-muted-foreground">Tempo estimado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <UserCheck className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold">{inServiceEntries.length}</p>
              <p className="text-xs text-muted-foreground">Em atendimento</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Queue + Leads */}
        <Tabs defaultValue="fila">
          <TabsList>
            <TabsTrigger value="fila">
              Fila ({waitingEntries.length})
            </TabsTrigger>
            <TabsTrigger value="atendimento">
              Em atendimento ({inServiceEntries.length})
            </TabsTrigger>
            <TabsTrigger value="leads">
              Leads
              {pendingLeads.length > 0 && (
                <Badge className="ml-2 bg-red-500">{pendingLeads.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="fila">
            {waitingEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Fila vazia</p>
            ) : (
              waitingEntries.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  onCheckIn={() => handleCheckIn(entry)}
                  onAssignProfessional={() => {
                    setSelectedEntry(entry);
                    setAssignModalOpen(true);
                  }}
                  onSkip={() => handleSkip(entry)}
                  onRemove={() => handleRemove(entry)}
                />
              ))
            )}
          </TabsContent>

          {/* In Service Tab */}
          <TabsContent value="atendimento">
            {inServiceEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum atendimento em andamento</p>
            ) : (
              inServiceEntries.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  onCheckIn={() => {}}
                  onAssignProfessional={() => {}}
                  onSkip={() => {}}
                  onRemove={() => handleRemove(entry)}
                />
              ))
            )}
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            {pendingLeads.length === 0 && notifiedLeads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lead</p>
            ) : (
              <div className="space-y-2">
                {pendingLeads.map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.phone} · Quer fila &lt; {lead.max_queue_size}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleNotifyLead(lead)}>
                        <Bell className="h-4 w-4 mr-1" />
                        Notificar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {notifiedLeads.map((lead) => (
                  <Card key={lead.id} className="opacity-60">
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      </div>
                      <Badge variant="outline">Notificada</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddWalkInModal
        open={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        onSubmit={handleAddWalkIn}
      />

      {selectedEntry && (
        <AssignProfessionalModal
          open={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedEntry(null);
          }}
          customerName={selectedEntry.customer_name}
          serviceName={selectedEntry.service?.name || ""}
          onAssign={handleAssignProfessional}
        />
      )}
    </AppLayoutNew>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Fila.tsx src/components/queue/QueueCard.tsx src/components/queue/AddWalkInModal.tsx src/components/queue/AssignProfessionalModal.tsx
git commit -m "feat: add admin queue management panel with cards, modals, and leads tab"
```

---

## Task 14: Queue Settings Section

**Files:**
- Create: `src/components/settings/QueueSettingsSection.tsx`
- Modify: `src/pages/Configuracoes.tsx` (add new tab)

- [ ] **Step 1: Create the settings component**

```tsx
// src/components/settings/QueueSettingsSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQueueSettings } from "@/hooks/useQueueSettings";

export function QueueSettingsSection() {
  const { settings, isLoading, updateSettings, isSaving } = useQueueSettings();

  const [inflationFactor, setInflationFactor] = useState("1.70");
  const [creditDays, setCreditDays] = useState("30");
  const [notifyOptions, setNotifyOptions] = useState("20, 40, 60, 90");
  const [receptionEmail, setReceptionEmail] = useState("");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [asaasApiKey, setAsaasApiKey] = useState("");

  useEffect(() => {
    if (settings) {
      setInflationFactor(String(settings.inflation_factor));
      setCreditDays(String(settings.credit_validity_days));
      setNotifyOptions(settings.notify_options.join(", "));
      setReceptionEmail(settings.reception_email || "");
      setZapiInstanceId(settings.zapi_instance_id || "");
      setZapiToken(settings.zapi_token || "");
      setAsaasApiKey(settings.asaas_api_key || "");
    }
  }, [settings]);

  const handleSave = () => {
    const parsedOptions = notifyOptions
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    updateSettings({
      inflation_factor: parseFloat(inflationFactor) || 1.7,
      credit_validity_days: parseInt(creditDays) || 30,
      notify_options: parsedOptions.length > 0 ? parsedOptions : [20, 40, 60, 90],
      reception_email: receptionEmail || null,
      zapi_instance_id: zapiInstanceId || null,
      zapi_token: zapiToken || null,
      asaas_api_key: asaasApiKey || null,
    });
  };

  if (isLoading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle>Fila Digital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Fator de inflacao da fila (para visitantes)</Label>
            <Input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={inflationFactor}
              onChange={(e) => setInflationFactor(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ex: 1.7 = fila real de 3 mostra 5 para visitantes
            </p>
          </div>

          <div>
            <Label>Validade do credito (dias)</Label>
            <Input
              type="number"
              min="1"
              value={creditDays}
              onChange={(e) => setCreditDays(e.target.value)}
            />
          </div>

          <div>
            <Label>Opcoes de antecedencia (minutos, separados por virgula)</Label>
            <Input
              value={notifyOptions}
              onChange={(e) => setNotifyOptions(e.target.value)}
              placeholder="20, 40, 60, 90"
            />
          </div>

          <div>
            <Label>E-mail da recepcao (para alertas de leads)</Label>
            <Input
              type="email"
              value={receptionEmail}
              onChange={(e) => setReceptionEmail(e.target.value)}
              placeholder="recepcao@nphairexpress.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integracoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Asaas API Key</Label>
            <Input
              type="password"
              value={asaasApiKey}
              onChange={(e) => setAsaasApiKey(e.target.value)}
              placeholder="$aact_..."
            />
          </div>

          <div>
            <Label>Z-API Instance ID</Label>
            <Input
              value={zapiInstanceId}
              onChange={(e) => setZapiInstanceId(e.target.value)}
              placeholder="Instance ID"
            />
          </div>

          <div>
            <Label>Z-API Token</Label>
            <Input
              type="password"
              value={zapiToken}
              onChange={(e) => setZapiToken(e.target.value)}
              placeholder="Token"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Salvando..." : "Salvar configuracoes da fila"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add the tab to Configuracoes.tsx**

In `/Users/pc/nphairexpress/src/pages/Configuracoes.tsx`, add a new tab for queue settings.

Add import at the top:
```typescript
import { QueueSettingsSection } from "@/components/settings/QueueSettingsSection";
```

Add in the TabsList (after the last existing TabsTrigger):
```tsx
<TabsTrigger value="fila">Fila Digital</TabsTrigger>
```

Add the TabsContent (after the last existing TabsContent):
```tsx
<TabsContent value="fila">
  <QueueSettingsSection />
</TabsContent>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/QueueSettingsSection.tsx src/pages/Configuracoes.tsx
git commit -m "feat: add queue settings section in admin config"
```

---

## Task 15: Routing — Public + Admin Routes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`

- [ ] **Step 1: Add routes in App.tsx**

Add imports at the top of `App.tsx`:
```typescript
import FilaPublica from "@/pages/FilaPublica";
import FilaComprar from "@/pages/FilaComprar";
import FilaAcompanhar from "@/pages/FilaAcompanhar";
import Fila from "@/pages/Fila";
```

Add public routes (OUTSIDE the ProtectedRoute wrapper, before the catch-all):
```tsx
<Route path="/fila" element={<FilaPublica />} />
<Route path="/fila/comprar" element={<FilaComprar />} />
<Route path="/fila/acompanhar/:id" element={<FilaAcompanhar />} />
```

Add admin route (INSIDE the ProtectedRoute wrapper, with the other admin routes):
```tsx
<Route path="/fila-admin" element={<ProtectedRoute><Fila /></ProtectedRoute>} />
```

- [ ] **Step 2: Add sidebar menu item in AppSidebar.tsx**

Add import:
```typescript
import { ListOrdered } from "lucide-react";
```

Add to the "Operacao" nav group (after Comandas):
```typescript
{
  title: "Fila",
  url: "/fila-admin",
  icon: ListOrdered,
},
```

- [ ] **Step 3: Verify routes work**

```bash
cd /Users/pc/nphairexpress
bun run dev
```

Test:
- `http://localhost:5173/fila` → public queue page (no login required)
- `http://localhost:5173/fila/comprar` → purchase flow (no login required)
- `http://localhost:5173/fila-admin` → admin panel (login required)
- Sidebar shows "Fila" item under "Operacao"

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/AppSidebar.tsx
git commit -m "feat: add public queue routes and admin queue route with sidebar"
```

---

## Task 16: Comanda Close → Next Client Notification

**Files:**
- Modify: `src/hooks/useComandas.ts` (add trigger after closing comanda)

- [ ] **Step 1: Add notification trigger to comanda close**

In the existing `useComandas.ts`, find the mutation that closes/marks a comanda as paid (where `is_paid` is set to `true` or `closed_at` is set). After the successful close, add:

```typescript
import { supabase } from "@/lib/dynamicSupabaseClient";
import { notifyQueueEntry } from "@/lib/queueNotifications";

// Inside the onSuccess of the close comanda mutation:
// Check if there's a queue entry for this professional and notify next
async function triggerNextInQueue(salonId: string, professionalId: string | null) {
  if (!professionalId || !salonId) return;

  // Mark current queue entry as completed
  const { data: currentEntry } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("salon_id", salonId)
    .eq("assigned_professional_id", professionalId)
    .eq("status", "in_service")
    .maybeSingle();

  if (currentEntry) {
    await supabase
      .from("queue_entries")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", currentEntry.id);
  }

  // Find next in queue (checked_in first, then waiting walk_ins)
  const { data: nextEntries } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("salon_id", salonId)
    .in("status", ["checked_in", "waiting"])
    .order("position", { ascending: true })
    .limit(3);

  if (!nextEntries || nextEntries.length === 0) return;

  // Prefer checked_in over waiting
  const next = nextEntries.find((e) => e.status === "checked_in") || nextEntries[0];

  if (next && !next.notify_next_sent) {
    await notifyQueueEntry(salonId, next, "next");
    await supabase
      .from("queue_entries")
      .update({ notify_next_sent: true, updated_at: new Date().toISOString() })
      .eq("id", next.id);
  }
}
```

Add call to `triggerNextInQueue(salonId, professionalId)` in the `onSuccess` callback of the comanda close mutation.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useComandas.ts
git commit -m "feat: trigger 'you are next' notification when comanda is closed"
```

---

## Task 17: Advance Notification Check (Periodic)

**Files:**
- Create: `src/hooks/useQueueNotificationCheck.ts`

- [ ] **Step 1: Create periodic notification checker**

This hook runs on the admin Fila page and checks every 60 seconds if any client needs their advance notification.

```typescript
import { useEffect } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { notifyQueueEntry, notifyLead } from "@/lib/queueNotifications";

const SITE_URL = "https://nphairexpress.vercel.app";

export function useQueueNotificationCheck() {
  const { salonId } = useAuth();

  useEffect(() => {
    if (!salonId) return;

    const check = async () => {
      // 1. Check advance notifications
      const { data: entries } = await supabase
        .from("queue_entries")
        .select(`
          *,
          service:services(duration_minutes)
        `)
        .eq("salon_id", salonId)
        .in("status", ["waiting", "checked_in"])
        .eq("notify_sent", false);

      if (entries) {
        // Get active professionals count
        const { count: inServiceCount } = await supabase
          .from("queue_entries")
          .select("id", { count: "exact", head: true })
          .eq("salon_id", salonId)
          .eq("status", "in_service");

        const professionals = Math.max(inServiceCount || 1, 1);

        for (const entry of entries) {
          // Calculate estimated minutes until this entry
          const { data: ahead } = await supabase
            .from("queue_entries")
            .select("service:services(duration_minutes)")
            .eq("salon_id", salonId)
            .in("status", ["waiting", "checked_in", "in_service"])
            .lt("position", entry.position);

          const totalMinAhead = (ahead || []).reduce(
            (sum, e: any) => sum + (e.service?.duration_minutes || 45), 0
          );
          const estimatedMin = Math.ceil(totalMinAhead / professionals);

          if (estimatedMin <= entry.notify_minutes_before) {
            await notifyQueueEntry(salonId, entry, "advance", {
              estimatedTime: String(estimatedMin),
            });

            await supabase
              .from("queue_entries")
              .update({ notify_sent: true, updated_at: new Date().toISOString() })
              .eq("id", entry.id);
          }
        }
      }

      // 2. Check leads to auto-notify
      const { count: queueSize } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .in("status", ["waiting", "checked_in"]);

      const { data: leads } = await supabase
        .from("queue_leads")
        .select("*")
        .eq("salon_id", salonId)
        .eq("notified", false);

      if (leads && queueSize !== null) {
        for (const lead of leads) {
          if (queueSize <= lead.max_queue_size) {
            await notifyLead(salonId, lead, queueSize, `${SITE_URL}/fila`);
            await supabase
              .from("queue_leads")
              .update({ notified: true })
              .eq("id", lead.id);
          }
        }
      }
    };

    // Run immediately, then every 60 seconds
    check();
    const interval = setInterval(check, 60000);

    return () => clearInterval(interval);
  }, [salonId]);
}
```

- [ ] **Step 2: Add to admin Fila page**

In `src/pages/Fila.tsx`, add:

```typescript
import { useQueueNotificationCheck } from "@/hooks/useQueueNotificationCheck";
```

And call it inside the component:
```typescript
useQueueNotificationCheck();
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useQueueNotificationCheck.ts src/pages/Fila.tsx
git commit -m "feat: add periodic notification check for advance alerts and lead notifications"
```

---

## Task 18: Add Notification Sound Asset

**Files:**
- Create: `public/notification.mp3`

- [ ] **Step 1: Add a notification sound**

Download or create a simple notification chime sound and place it at `public/notification.mp3`. A short, pleasant chime for when a new online client enters the queue.

You can use a free sound from a royalty-free source or generate a simple beep:

```bash
cd /Users/pc/nphairexpress
# Use ffmpeg to generate a simple notification tone
ffmpeg -f lavfi -i "sine=frequency=880:duration=0.3" -af "afade=t=out:st=0.1:d=0.2" public/notification.mp3 2>/dev/null || echo "Add notification.mp3 manually"
```

- [ ] **Step 2: Commit**

```bash
git add public/notification.mp3
git commit -m "feat: add notification sound for new queue entries"
```

---

## Task 19: Final Integration Test

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/pc/nphairexpress
bun run dev
```

- [ ] **Step 2: Test public flow**

1. Go to `http://localhost:5173/fila` — verify queue status shows
2. Click "Quero ser atendida" — verify service list loads
3. Select a service, fill in data, verify payment step shows
4. Click "Me avisa quando a fila diminuir" — verify lead modal works

- [ ] **Step 3: Test admin flow**

1. Log in and go to `/fila-admin`
2. Click "Adicionar presencial" — verify walk-in modal works
3. Verify the entry appears in the queue list
4. Test check-in, assign professional, skip, and remove buttons
5. Go to Configuracoes → tab "Fila Digital" — verify settings form

- [ ] **Step 4: Test real-time updates**

1. Open `/fila` in one browser tab and `/fila-admin` in another
2. Add a walk-in in the admin panel
3. Verify the public page updates the count in real time

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes"
```
