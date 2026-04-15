import { Calendar, UserPlus, Receipt, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    icon: Calendar,
    label: "Novo Agendamento",
    description: "Agendar atendimento",
    variant: "default" as const,
    path: "/agenda",
  },
  {
    icon: UserPlus,
    label: "Novo Cliente",
    description: "Cadastrar cliente",
    variant: "outline" as const,
    path: "/clientes?novo=true",
  },
  {
    icon: Receipt,
    label: "Nova Comanda",
    description: "Iniciar venda",
    variant: "outline" as const,
    path: "/comandas?nova=true",
  },
  {
    icon: Package,
    label: "Entrada Estoque",
    description: "Registrar entrada",
    variant: "outline" as const,
    path: "/estoque",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          className="h-auto gap-3 px-4 py-3"
          onClick={() => navigate(action.path)}
        >
          <action.icon className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">{action.label}</div>
            <div className="text-xs opacity-80">{action.description}</div>
          </div>
        </Button>
      ))}
    </div>
  );
}
