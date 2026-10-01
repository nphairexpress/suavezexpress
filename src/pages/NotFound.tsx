import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { GlassCard, Icon } from "@design-system";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="np-app np-bg flex min-h-screen items-center justify-center p-4 text-foreground">
      <GlassCard tone="strong" radius="xl" className="w-full max-w-md text-center" padding={32}>
        <div className="np-display np-num text-6xl text-[color:var(--np-accent-display)]">404</div>
        <p className="mt-3 mb-6 text-lg text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="np-btn np-btn--primary np-btn--block !text-[color:var(--np-text-on-accent)] !no-underline">
          <Icon name={ArrowLeft} size={18} />
          Voltar ao início
        </a>
      </GlassCard>
    </div>
  );
};

export default NotFound;
