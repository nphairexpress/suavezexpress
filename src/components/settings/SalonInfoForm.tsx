import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Upload, X } from "lucide-react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export function SalonInfoForm() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    trade_name: "",
    logo_url: "",
    cnpj: "",
    state_registration: "",
    city_registration: "",
    address: "",
    phone: "",
    email: "",
  });

  const { data: salon, isLoading } = useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("id", salonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!salonId,
  });

  useEffect(() => {
    if (salon) {
      setForm({
        name: salon.name || "",
        trade_name: (salon as any).trade_name || "",
        logo_url: salon.logo_url || "",
        cnpj: (salon as any).cnpj || "",
        state_registration: (salon as any).state_registration || "",
        city_registration: (salon as any).city_registration || "",
        address: salon.address || "",
        phone: salon.phone || "",
        email: salon.email || "",
      });
    }
  }, [salon]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !salonId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `salon-logos/${salonId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setForm(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: "Logo enviado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao enviar logo", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!salonId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("salons")
        .update({
          name: form.name,
          trade_name: form.trade_name,
          logo_url: form.logo_url || null,
          cnpj: form.cnpj || null,
          state_registration: form.state_registration || null,
          city_registration: form.city_registration || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
        } as any)
        .eq("id", salonId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["salon"] });
      toast({ title: "Dados do salão salvos com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo do Estabelecimento</CardTitle>
          <CardDescription>O logo aparecerá no cabeçalho do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 rounded-xl">
              <AvatarImage src={form.logo_url || undefined} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                {form.name?.charAt(0)?.toUpperCase() || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent cursor-pointer text-sm font-medium"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Enviando..." : "Enviar Logo"}
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={isUploading}
              />
              {form.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive gap-1"
                  onClick={() => setForm(prev => ({ ...prev, logo_url: "" }))}
                >
                  <X className="h-3 w-3" /> Remover
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP. Máximo 5MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salon Data */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Salão</CardTitle>
          <CardDescription>Informações básicas do estabelecimento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Social (Razão Social)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome social do estabelecimento"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input
                value={form.trade_name}
                onChange={(e) => setForm(prev => ({ ...prev, trade_name: e.target.value }))}
                placeholder="Nome fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => setForm(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Inscrição Estadual</Label>
              <Input
                value={form.state_registration}
                onChange={(e) => setForm(prev => ({ ...prev, state_registration: e.target.value }))}
                placeholder="Inscrição estadual"
              />
            </div>
            <div className="space-y-2">
              <Label>Inscrição Municipal</Label>
              <Input
                value={form.city_registration}
                onChange={(e) => setForm(prev => ({ ...prev, city_registration: e.target.value }))}
                placeholder="Inscrição municipal"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@salao.com"
                type="email"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Endereço completo"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Salvando..." : "Salvar Dados"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
