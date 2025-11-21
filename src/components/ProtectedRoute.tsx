import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface PropsRotaProtegida {
  children: ReactNode;
  module: keyof ReturnType<typeof usePermissions>['permissions'];
  fallback?: ReactNode;
}

export const ProtectedRoute = ({ children, module, fallback }: PropsRotaProtegida) => {
  const { hasPermission: temPermissao } = usePermissions();
  const { user: usuario } = useApp();

  if (!usuario) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Você precisa estar autenticado para acessar esta página.</p>
        </CardContent>
      </Card>
    );
  }

  if (!temPermissao(module)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar este módulo.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Entre em contato com o administrador do sistema para solicitar acesso.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

