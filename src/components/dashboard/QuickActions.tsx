import { Calendar, UserPlus, Receipt, Package } from "lucide-react";
import { Button } from "@design-system";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    icon: Calendar,
    label: "Novo Agendamento",
    description: "Agendar atendimento",
    variant: "primary" as const,
    path: "/agenda",
  },
  {
    icon: UserPlus,
    label: "Novo Cliente",
    description: "Cadastrar cliente",
    variant: "secondary" as const,
    path: "/clientes?novo=true",
  },
  {
    icon: Receipt,
    label: "Nova Comanda",
    description: "Iniciar venda",
    variant: "secondary" as const,
    path: "/comandas?nova=true",
  },
  {
    icon: Package,
    label: "Entrada Estoque",
    description: "Registrar entrada",
    variant: "secondary" as const,
    path: "/estoque",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          icon={action.icon}
          block
          className="justify-start"
          style={{ height: "auto", minHeight: 52, paddingTop: 12, paddingBottom: 12 }}
          onClick={() => navigate(action.path)}
        >
          <span className="text-left" style={{ lineHeight: 1.3, whiteSpace: "normal" }}>
            <span className="block">{action.label}</span>
            <span className="block text-xs" style={{ opacity: 0.8, fontWeight: 400 }}>{action.description}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}
