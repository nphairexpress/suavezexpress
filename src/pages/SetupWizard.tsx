import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import SetupProgress from "@/components/setup/SetupProgress";
import SetupSalonStep from "@/components/setup/SetupSalonStep";
import SetupMasterStep from "@/components/setup/SetupMasterStep";
import SetupSupabaseStep from "@/components/setup/SetupSupabaseStep";
import SetupDoneStep from "@/components/setup/SetupDoneStep";
import { Building2, User, Database, CheckCircle2 } from "lucide-react";

export type SetupStep = "supabase" | "salon" | "master" | "done";

export const SETUP_STEPS: { key: SetupStep; label: string; icon: any }[] = [
  { key: "supabase", label: "Banco de Dados", icon: Database },
  { key: "salon", label: "Salão", icon: Building2 },
  { key: "master", label: "Instalação", icon: User },
  { key: "done", label: "Pronto!", icon: CheckCircle2 },
];

export interface SetupData {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseDbPassword: string;
  supabasePat: string;
  // Salon
  salonName: string;
  tradeName: string;
  salonPhone: string;
  salonEmail: string;
  salonCnpj: string;
  // Master
  masterName: string;
  masterEmail: string;
  masterPassword: string;
  // Vercel
  vercelToken: string;
  vercelProjectId: string;
  // Integrations (moved to Settings > Email)
  resendKey: string;
}

export default function SetupWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SetupStep>("supabase");
  const [data, setData] = useState<SetupData>({
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    supabaseDbPassword: "",
    supabasePat: "",
    salonName: "",
    tradeName: "",
    salonPhone: "",
    salonEmail: "",
    salonCnpj: "",
    masterName: "",
    masterEmail: "",
    masterPassword: "",
    vercelToken: "",
    vercelProjectId: "",
    resendKey: "",
  });

  const updateData = (partial: Partial<SetupData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const stepIndex = SETUP_STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">Instalação do Sistema</h1>
          <p className="text-muted-foreground text-sm">Configure seu sistema de gestão para salão de beleza</p>
        </div>

        <SetupProgress steps={SETUP_STEPS} currentIndex={stepIndex} />

        {currentStep === "supabase" && (
          <SetupSupabaseStep data={data} updateData={updateData} onNext={() => setCurrentStep("salon")} />
        )}
        {currentStep === "salon" && (
          <SetupSalonStep data={data} updateData={updateData} onNext={() => setCurrentStep("master")} onBack={() => setCurrentStep("supabase")} />
        )}
        {currentStep === "master" && (
          <SetupMasterStep data={data} updateData={updateData} onNext={() => setCurrentStep("done")} onBack={() => setCurrentStep("salon")} isInstaller />
        )}
        {currentStep === "done" && <SetupDoneStep />}
      </div>
    </div>
  );
}
