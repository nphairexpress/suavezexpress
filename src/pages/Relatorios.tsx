// @ts-nocheck
import { useState, useMemo, lazy, Suspense } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Sensitive } from "@/components/common/SensitiveData";
import { PageHeader, StatCard, GlassCard, Badge as NpBadge, EmptyState } from "@design-system";
import { CHART_COLORS, CHART_GRID, CHART_TICK, CHART_TOOLTIP } from "@/components/reports/ReportKit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, DollarSign, Users, TrendingUp, ShoppingBag, Loader2,
  BarChart3, PieChart, Mail, FileText, UserCog, Scissors, CreditCard, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { EmailReportsTab } from "@/components/reports/EmailReportsTab";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts";

// Report components
import { Report0004 } from "@/components/reports/Report0004";
import { Report0008 } from "@/components/reports/Report0008";
import { Report0010 } from "@/components/reports/Report0010";
import { Report0015 } from "@/components/reports/Report0015";
import { Report0020 } from "@/components/reports/Report0020";
import { Report0021 } from "@/components/reports/Report0021";
import { Report0024 } from "@/components/reports/Report0024";
import { Report0028 } from "@/components/reports/Report0028";
import { useSalonPermissions } from "@/hooks/useSalonPermissions";
import { Report1128 } from "@/components/reports/Report1128";
import { Report0033 } from "@/components/reports/Report0033";
import { Report0085 } from "@/components/reports/Report0085";
import { Report0175 } from "@/components/reports/Report0175";
import { Report0180 } from "@/components/reports/Report0180";
import { Report0281 } from "@/components/reports/Report0281";

type DateRange = { from: Date; to: Date };

const PRESET_RANGES = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Últimos 7 dias", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
];

const COLORS = CHART_COLORS;

// Report catalog
// Relatório que lista comissão por profissional (restrito a comissao.ver_todas).
const COMMISSION_REPORT_ID = "0028";

const REPORT_CATEGORIES = [
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    reports: [
      { id: "0004", label: "Lista de dados cadastrais de clientes", needsDate: false },
      { id: "0008", label: "Clientes que fizeram um serviço específico", needsDate: true },
      { id: "0010", label: "Clientes com celulares duplicados", needsDate: false },
      { id: "0015", label: "Clientes por perfil de compra", needsDate: true, hasChart: true },
      { id: "0020", label: "Clientes com retorno atrasado", needsDate: false },
    ],
  },
  {
    id: "profissionais",
    label: "Profissionais",
    icon: UserCog,
    reports: [
      { id: "0021", label: "Faturamento e ticket médio por profissional", needsDate: true, hasChart: true },
      { id: "0024", label: "Serviços por profissional", needsDate: true, hasChart: true },
      { id: "0028", label: "Comissões pagas no período", needsDate: true },
      { id: "1128", label: "Vendas por categoria de um profissional", needsDate: true, hasChart: true },
    ],
  },
  {
    id: "servicos",
    label: "Serviços",
    icon: Scissors,
    reports: [
      { id: "0033", label: "Tabela de preços dos serviços", needsDate: false },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    reports: [
      { id: "0085", label: "Evolução do faturamento mensal", needsDate: false, hasChart: true },
      { id: "0175", label: "Faturamento de serviço por profissional", needsDate: true },
      { id: "0180", label: "Serviços e produtos vendidos no período", needsDate: true },
      { id: "0281", label: "Entradas por forma de pagamento", needsDate: true, hasChart: true },
    ],
  },
];

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Star } from "lucide-react";

// Full report descriptions
const REPORT_DESCRIPTIONS: Record<string, string> = {
  "0004": "Exibir os dados: e-mail, telefone, celular e aniversário; de todos os clientes",
  "0008": "Exibir todos os clientes atendidos no período exibindo informações cadastrais e dados complementares de visitas ao estabelecimento",
  "0010": "Exibir todos os clientes que possuam o mesmo número de celular cadastrado em comum",
  "0015": "Exibir o perfil de compras dos clientes. O período serve para filtrar os clientes que estiveram no estabelecimento, mas é analisado todo o histórico do cliente para determinar qual o perfil de compra dele",
  "0020": "Exibir clientes que fizeram algum serviço que tinha \"dias para retorno\" cadastrado, passaram-se os dias e não retornaram e calcular em quantos dias de atraso cada cliente está",
  "0021": "Exibir qual é o faturamento total, a quantidade de comandas geradas e o ticket médio gerado por cada profissional no período definido",
  "0024": "Exibir todos os serviços com a categoria, a quantidade realizada, o faturamento total por serviço e valores médios, filtrados por profissional no período",
  "0028": "Exibir todas as comissões pagas no período com datas de pagamento, valores pagos e formas de pagamento",
  "1128": "Exibir as categorias dos serviços vendidos, faturamentos totais, quantidades vendidas e % de faturamento por profissional selecionado no período",
  "0033": "Exibir todos os serviços do estabelecimento, suas categorias e os seus respectivos valores",
  "0085": "Exibir a evolução do faturamento mensal do estabelecimento e os tickets médios dos serviços vendidos aos clientes",
  "0175": "Exibir os faturamentos brutos para o estabelecimento e para os profissionais no período definido",
  "0180": "Exibir todas as vendas de serviços e produtos no período definido",
  "0281": "Exibir as formas de pagamento e os respectivos faturamentos que entraram para o caixa, além do faturamento total segmentado",
};

function ReportSelector({ onSelect }: { onSelect: (reportId: string) => void }) {
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  // 0028 lista a comissão de todas as profissionais: só para quem tem comissao.ver_todas.
  const { pode, isLoading: loadingPermissions } = useSalonPermissions();
  const canViewAllCommissions = !loadingPermissions && pode("comissao.ver_todas");

  const allReports = useMemo(() => {
    const reports: { id: string; label: string; category: string; categoryIcon: any; needsDate: boolean; hasChart?: boolean }[] = [];
    REPORT_CATEGORIES.forEach(cat => {
      cat.reports.forEach(r => {
        if (r.id === COMMISSION_REPORT_ID && !canViewAllCommissions) return;
        reports.push({ ...r, category: cat.label, categoryIcon: cat.icon });
      });
    });
    return reports;
  }, [canViewAllCommissions]);

  const filteredReports = useMemo(() => {
    return allReports.filter(r => {
      const matchesCategory = filterCategory === "todos" || r.category === REPORT_CATEGORIES.find(c => c.id === filterCategory)?.label;
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || r.label.toLowerCase().includes(query) || r.id.includes(query) || (REPORT_DESCRIPTIONS[r.id] || "").toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [allReports, filterCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterCategory === "todos" ? "default" : "outline"}
            size="sm"
            className="h-10"
            onClick={() => setFilterCategory("todos")}
          >
            Todos
          </Button>
          {REPORT_CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={filterCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1 whitespace-nowrap"
              onClick={() => setFilterCategory(cat.id)}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
      </div>

      {/* Cartões dos relatórios */}
      {filteredReports.length === 0 ? (
        <GlassCard>
          <EmptyState icon="info" title="Nenhum relatório encontrado" />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map(report => (
            <GlassCard
              key={report.id}
              as="article"
              lift
              padding={20}
              role="button"
              tabIndex={0}
              aria-label={`Abrir relatório ${report.id}: ${report.label}`}
              className="flex cursor-pointer flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--np-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              onClick={() => onSelect(report.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(report.id);
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--np-accent-soft)", color: "var(--np-accent-text)" }}
                  >
                    <report.categoryIcon className="h-4 w-4" />
                  </span>
                  <span className="np-caps truncate">{report.category}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {report.hasChart && <NpBadge tone="accent">Gráfico</NpBadge>}
                  <NpBadge tone="neutral" className="font-mono tabular-nums">{report.id}</NpBadge>
                </div>
              </div>
              <h3 className="np-display text-base leading-snug text-foreground">{report.label}</h3>
              <p className="line-clamp-3 text-xs text-muted-foreground">{REPORT_DESCRIPTIONS[report.id] || ""}</p>
              <div className="mt-auto flex items-center gap-1.5 pt-1 text-sm font-semibold" style={{ color: "var(--np-accent-text)" }}>
                <Eye className="h-4 w-4" />
                Abrir relatório
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveReport({ reportId, dateRange }: { reportId: string; dateRange: DateRange }) {
  const { pode, isLoading: loadingPermissions } = useSalonPermissions();
  if (reportId === COMMISSION_REPORT_ID && (loadingPermissions || !pode("comissao.ver_todas"))) return null;
  switch (reportId) {
    case "0004": return <Report0004 />;
    case "0008": return <Report0008 dateRange={dateRange} />;
    case "0010": return <Report0010 />;
    case "0015": return <Report0015 dateRange={dateRange} />;
    case "0020": return <Report0020 />;
    case "0021": return <Report0021 dateRange={dateRange} />;
    case "0024": return <Report0024 dateRange={dateRange} />;
    case "0028": return <Report0028 dateRange={dateRange} />;
    case "1128": return <Report1128 dateRange={dateRange} />;
    case "0033": return <Report0033 />;
    case "0085": return <Report0085 />;
    case "0175": return <Report0175 dateRange={dateRange} />;
    case "0180": return <Report0180 dateRange={dateRange} />;
    case "0281": return <Report0281 dateRange={dateRange} />;
    default: return <div className="text-center py-8 text-muted-foreground">Relatório não encontrado</div>;
  }
}

function getReportInfo(reportId: string) {
  for (const cat of REPORT_CATEGORIES) {
    const report = cat.reports.find(r => r.id === reportId);
    if (report) return { ...report, category: cat };
  }
  return null;
}

export default function Relatorios() {
  const { salonId } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>(PRESET_RANGES[2].getValue());
  const [activePreset, setActivePreset] = useState("Últimos 30 dias");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Fetch comandas with payments for the period (used by Geral tab)
  const { data: comandas, isLoading: loadingComandas } = useQuery({
    queryKey: ["report-comandas", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select("*, comanda_items(*, service_id, product_id, professional_id), payments(amount, payment_method), clients(name)")
        .eq("salon_id", salonId)
        .gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Fetch appointments
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["report-appointments", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name), professionals(name), clients(name)")
        .eq("salon_id", salonId)
        .gte("scheduled_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("scheduled_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Fetch new clients
  const { data: newClients } = useQuery({
    queryKey: ["report-new-clients", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("clients_staff")
        .select("id, created_at")
        .eq("salon_id", salonId)
        .gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!comandas) return { totalRevenue: 0, totalComandas: 0, avgTicket: 0, newClients: 0 };
    const totalRevenue = comandas.reduce((sum, c) => sum + Number(c.total || 0), 0);
    const totalComandas = comandas.length;
    const avgTicket = totalComandas > 0 ? totalRevenue / totalComandas : 0;
    return { totalRevenue, totalComandas, avgTicket, newClients: newClients?.length || 0 };
  }, [comandas, newClients]);

  // Revenue by day chart data
  const revenueByDay = useMemo(() => {
    if (!comandas) return [];
    const byDay: Record<string, number> = {};
    comandas.forEach(c => {
      const day = format(new Date(c.created_at), "dd/MM");
      byDay[day] = (byDay[day] || 0) + Number(c.total || 0);
    });
    return Object.entries(byDay).map(([day, receita]) => ({ day, receita }));
  }, [comandas]);

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    if (!comandas) return [];
    const methods: Record<string, number> = {};
    comandas.forEach(c => {
      (c.payments as any[])?.forEach((p: any) => {
        const label = { cash: "Dinheiro", pix: "PIX", credit_card: "Crédito", debit_card: "Débito", other: "Outro" }[p.payment_method as string] || p.payment_method;
        methods[label] = (methods[label] || 0) + Number(p.amount || 0);
      });
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [comandas]);

  // Top services
  const topServices = useMemo(() => {
    if (!comandas) return [];
    const services: Record<string, { count: number; revenue: number }> = {};
    comandas.forEach(c => {
      (c.comanda_items as any[])?.forEach((item: any) => {
        if (item.item_type === "service") {
          const name = item.description || "Serviço";
          if (!services[name]) services[name] = { count: 0, revenue: 0 };
          services[name].count += item.quantity;
          services[name].revenue += Number(item.total_price || 0);
        }
      });
    });
    return Object.entries(services)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [comandas]);

  // Top professionals
  const topProfessionals = useMemo(() => {
    if (!comandas) return [];
    const profs: Record<string, { count: number; revenue: number }> = {};
    comandas.forEach(c => {
      (c.comanda_items as any[])?.forEach((item: any) => {
        const profId = item.professional_id || "unknown";
        if (!profs[profId]) profs[profId] = { count: 0, revenue: 0 };
        profs[profId].count += item.quantity;
        profs[profId].revenue += Number(item.total_price || 0);
      });
    });
    return Object.entries(profs)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [comandas]);

  const isLoading = loadingComandas || loadingAppointments;

  const handlePreset = (preset: typeof PRESET_RANGES[0]) => {
    setDateRange(preset.getValue());
    setActivePreset(preset.label);
  };

  const reportInfo = selectedReport ? getReportInfo(selectedReport) : null;

  return (
    <AppLayoutNew>
      <Sensitive block>
      <div className="space-y-6">
        <PageHeader eyebrow="Gestão" title="Relatórios" description="Análise detalhada do desempenho do salão" />

        <Tabs defaultValue="relatorios" className="space-y-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="geral" className="gap-2"><BarChart3 className="h-4 w-4" />Geral</TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-2"><FileText className="h-4 w-4" />Relatórios</TabsTrigger>
            <TabsTrigger value="emails" className="gap-2"><Mail className="h-4 w-4" />E-mails</TabsTrigger>
          </TabsList>

          {/* ===== RELATÓRIOS TAB ===== */}
          <TabsContent value="relatorios" className="space-y-6">
            {selectedReport ? (
              <>
                {/* Back button + date range */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)} className="h-10 gap-2">
                    <ArrowLeft className="h-4 w-4" />Voltar
                  </Button>

                  {reportInfo?.needsDate && (
                    <>
                      <div className="h-6 w-px bg-border" />
                      {PRESET_RANGES.map(preset => (
                        <Button
                          key={preset.label}
                          variant={activePreset === preset.label ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePreset(preset)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="range"
                            selected={{ from: dateRange.from, to: dateRange.to }}
                            onSelect={(range) => {
                              if (range?.from && range?.to) {
                                setDateRange({ from: range.from, to: range.to });
                                setActivePreset("");
                              }
                            }}
                            locale={ptBR}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>

                {/* Report breadcrumb */}
                {reportInfo && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <reportInfo.category.icon className="h-4 w-4" style={{ color: "var(--np-accent-text)" }} />
                    <span>{reportInfo.category.label}</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">#{reportInfo.id} — {reportInfo.label}</span>
                  </div>
                )}

                {/* Active report */}
                <ActiveReport reportId={selectedReport} dateRange={dateRange} />
              </>
            ) : (
              <ReportSelector onSelect={setSelectedReport} />
            )}
          </TabsContent>

          {/* ===== E-MAILS TAB ===== */}
          <TabsContent value="emails">
            <EmailReportsTab />
          </TabsContent>

          {/* ===== GERAL TAB ===== */}
          <TabsContent value="geral" className="space-y-6">
        {/* Date filters */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_RANGES.map(preset => (
              <Button
                key={preset.label}
                variant={activePreset === preset.label ? "default" : "outline"}
                size="sm"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setActivePreset("");
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>



        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Faturamento Total" icon={DollarSign} value={`R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <StatCard title="Comandas Fechadas" icon={ShoppingBag} value={stats.totalComandas} />
              <StatCard title="Ticket Médio" icon={TrendingUp} value={`R$ ${stats.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <StatCard title="Novos Clientes" icon={Users} value={stats.newClients} />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="np-display text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Faturamento por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {revenueByDay.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--np-accent)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--np-accent)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={CHART_TICK} />
                          <YAxis axisLine={false} tickLine={false} tick={CHART_TICK} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                          <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
                          <Area type="monotone" dataKey="receita" stroke="var(--np-accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado para o período selecionado</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="np-display text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Formas de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {paymentBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {paymentBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum pagamento no período</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Services Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="np-display text-lg">Top Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {topServices.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topServices} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} tick={CHART_TICK} />
                        <YAxis type="category" dataKey="name" tick={CHART_TICK} width={100} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]} />
                        <Bar dataKey="revenue" fill="var(--np-accent)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum serviço no período</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appointments summary */}
            <Card>
              <CardHeader>
                <CardTitle className="np-display text-lg">Resumo de Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total", count: appointments?.length || 0, color: "var(--np-accent-text)" },
                    { label: "Concluídos", count: appointments?.filter(a => a.status === "completed").length || 0, color: "var(--np-positive-text)" },
                    { label: "Cancelados", count: appointments?.filter(a => a.status === "cancelled").length || 0, color: "var(--np-danger-text)" },
                    { label: "No-show", count: appointments?.filter(a => a.status === "no_show").length || 0, color: "var(--np-accent-text)" },
                  ].map(item => (
                    <div key={item.label} className="text-center p-4 rounded-xl border border-border bg-muted/40">
                      <p className="np-num text-3xl" style={{ color: item.color }}>{item.count}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
          </TabsContent>
        </Tabs>
      </div>
      </Sensitive>
    </AppLayoutNew>
  );
}
