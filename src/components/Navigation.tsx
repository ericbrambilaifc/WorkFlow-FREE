import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Wallet,
  MinusCircle,
  ShoppingCart,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useApp } from "@/contexts/AppContext";

interface PropsNavegacao {
  activeTab: string;
  onTabChange: (aba: string) => void;
  onLogout?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (estaColapsado: boolean) => void;
}

const Navigation = ({ activeTab, onTabChange, onLogout, isCollapsed, setIsCollapsed }: PropsNavegacao) => {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const { hasPermission: temPermissao } = usePermissions();
  const { user: usuario } = useApp();

  const todosItensNavegacao = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      permission: "dashboard" as const,
    },
    {
      id: "service-orders",
      label: "Ordens de Serviço",
      icon: FileText,
      permission: "serviceOrders" as const,
    },
    {
      id: "clients",
      label: "Clientes",
      icon: Users,
      permission: "clients" as const,
    },
    {
      id: "stock",
      label: "Estoque",
      icon: ShoppingCart,
      permission: "stock" as const,
    },
    {
      id: "invoices",
      label: "Notas Fiscais",
      icon: FileText,
      permission: "invoices" as const,
    },
    {
      id: "appointments",
      label: "Agendamentos",
      icon: Calendar,
      permission: "appointments" as const,
    },
    {
      id: "communication",
      label: "Comunicação",
      icon: MessageSquare,
      permission: "communication" as const,
    },
    {
      id: "expenses",
      label: "Despesas",
      icon: MinusCircle,
      permission: "expenses" as const,
    },
    {
      id: "financial",
      label: "Financeiro",
      icon: Wallet,
      permission: "financial" as const,
    },
    {
      id: "workers",
      label: "Funcionários",
      icon: Wrench,
      permission: "workers" as const,
    },
    {
      id: "users",
      label: "Usuários",
      icon: Users,
      permission: "users" as const,
    },
    {
      id: "reports",
      label: "Relatórios",
      icon: BarChart3,
      permission: "reports" as const,
    }
  ];

  const itensNavegacao = todosItensNavegacao.filter(item => temPermissao(item.permission));

  const tratarLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const classeLarguraNavegacao = isCollapsed ? "w-20" : "w-64";
  const itemEstaAtivo = (idItem: string) => activeTab === idItem;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setMenuMobileAberto(!menuMobileAberto)}
      >
        {menuMobileAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <div
        className={`
        fixed inset-y-0 left-0 z-40 bg-background border-r transform transition-all duration-300 ease-in-out
        ${classeLarguraNavegacao}
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 border-b px-4">
            {!isCollapsed && (
              <>
                <img src="/public/logo-gradiente.png" alt="logo" width={50} />
                <h1 className="text-xl mx-1 font-bold whitespace-nowrap">WorkFlow OS</h1>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-2 ml-auto hover:bg-muted/50"
              aria-label={isCollapsed ? "Expandir navegação" : "Colapsar navegação"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3 py-6">
            <nav className="space-y-2">
              {itensNavegacao.map((item) => {
                const Icone = item.icon;
                const ativo = itemEstaAtivo(item.id);

                return (
                  <Button
                    key={item.id}
                    className={`w-full justify-start h-10 px-3 rounded-md transition-colors ${ativo
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-transparent text-foreground hover:bg-muted"
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    onClick={() => {
                      onTabChange(item.id);
                      setMenuMobileAberto(false);
                    }}
                  >
                    <Icone className="h-5 w-5 mr-3 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t p-3 space-y-2">
            {usuario && !isCollapsed && (
              <div className="px-3 py-2 mb-2 rounded-md bg-muted/50">
                <p className="text-sm font-medium text-foreground truncate">{usuario.name}</p>
                <p className="text-xs text-muted-foreground truncate">{usuario.username}</p>
              </div>
            )}
            {usuario && isCollapsed && (
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                  {usuario.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {temPermissao("settings") && (
              <Button
                variant="ghost"
                className={`w-full justify-start h-10 px-3 rounded-md transition-colors ${activeTab === 'settings' ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-muted"
                  }`}
                onClick={() => {
                  onTabChange('settings');
                  setMenuMobileAberto(false);
                }}
              >
                <Settings className="h-5 w-5 mr-3" />
                {!isCollapsed && "Configurações"}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 h-10 px-3 rounded-md"
              onClick={tratarLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              {!isCollapsed && "Sair"}
            </Button>
          </div>
        </div>
      </div>

      {
        menuMobileAberto && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMenuMobileAberto(false)}
          />
        )
      }
    </>
  );
};

export default Navigation;