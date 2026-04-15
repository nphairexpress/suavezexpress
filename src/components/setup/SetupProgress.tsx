import { CheckCircle2 } from "lucide-react";

interface Step {
  key: string;
  label: string;
  icon: any;
}

interface SetupProgressProps {
  steps: Step[];
  currentIndex: number;
}

export default function SetupProgress({ steps, currentIndex }: SetupProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
              i <= currentIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={`text-sm hidden sm:inline ${
              i <= currentIndex ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-6 h-0.5 ${i < currentIndex ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
