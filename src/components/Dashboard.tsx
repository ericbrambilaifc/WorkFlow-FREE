import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, TrendingUp, DollarSign, Loader, Check, UserCheck, Receipt, AlertCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import NewServiceOrderModal from "@/components/modals/NewServiceOrderModal";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { clients, workers, serviceOrders, transactions, expenses, getClientById, getVehicleById, user } = useApp();
  const { canViewDashboardCard, canEdit } = usePermissions();
  const { toast } = useToast();
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Função para formatar o ID da ordem de serviço com zeros à esquerda
  const formatOrderId = (id: string | number): string => {
    let numId: number;
    
    if (typeof id === 'number') {
      numId = id;
    } else {
      // Se for string (UUID), extrai todos os números e forma um número
      const numbers = id.replace(/\D/g, ''); // Remove tudo que não é dígito
      if (numbers.length > 0) {
        // Pega os primeiros 5 dígitos ou todos se tiver menos
        numId = parseInt(numbers.substring(0, 5), 10) || 1;
      } else {
        // Fallback: usa hash simples do string
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
          hash = ((hash << 5) - hash) + id.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        numId = Math.abs(hash) % 99999 || 1;
      }
    }
    
    return `OS-${String(numId).padStart(5, '0')}`;
  };

  // Calcular estatísticas dinâmicas
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyRevenue = transactions
    .filter(t => t.type === 'Receita' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const paidExpenses = expenses.filter(expense => expense.status === 'paid');
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const overdueExpenses = expenses.filter(expense => expense.status === 'overdue');

  const totalPaidExpenses = paidExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const totalPendingExpenses = pendingExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const totalOverdueExpenses = overdueExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const openOrders = serviceOrders.filter(order => order.status !== 'Finalizada').length;
  const completedOrders = serviceOrders.filter(order => order.status === 'Finalizada').length;
  const activeWorkers = workers.filter(worker => worker.status === 'active');
  const totalWorkerOrders = workers.reduce((acc, worker) => acc + worker.totalOrders, 0);
  const totalWorkerCompleted = workers.reduce((acc, worker) => acc + worker.completedOrders, 0);

  // Calcular crescimento (exemplo: baseado em ordens concluídas vs abertas)
  const growthPercentage = openOrders > 0 ? ((completedOrders / (completedOrders + openOrders)) * 100).toFixed(1) : "0.0";
  const growthValue = monthlyRevenue - totalExpenses;

  const stats = [
    {
      title: "Ordens Abertas",
      value: openOrders.toString(),
      change: "+2%",
      icon: Loader,
      positive: true
    },
    {
      title: "Ordens Concluídas",
      value: totalWorkerCompleted.toString(),
      change: "",
      icon: Check,
      positive: true
    },
    {
      title: "Clientes Ativos",
      value: clients.length.toString(),
      change: "+5%",
      icon: Users,
      positive: true
    },
    {
      title: "Funcionários Ativos",
      value: activeWorkers.length.toString(),
      change: "+2%",
      icon: UserCheck,
      positive: true
    },

  ];

  // Pegar as últimas 4 ordens de serviço
  const recentOrders = serviceOrders
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)
    .map(order => {
      const client = getClientById(order.clientId);
      const vehicle = getVehicleById(order.vehicleId);
      return {
        ...order,
        clientName: client?.name || 'Cliente não encontrado',
        vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : 'Veículo não encontrado'
      };
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em andamento": return "text-warning";
      case "Finalizada": return "text-success";
      case "Aguardando peças": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Hero Section */}
      {canViewDashboardCard('heroSection') && (
        <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 sm:p-6 md:p-8 overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
              WorkFlow OS - Gestão para Oficinas
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4 sm:mb-6">
              Controle completo das suas ordens de serviço. Desenvolvido pela Ramus Digital.
            </p>
            {canEdit('serviceOrders') && !(user?.role?.toLowerCase() === 'mecanico' || user?.role?.toLowerCase() === 'mecânico') && (
              <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => setShowNewOrderModal(true)}>
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Nova Ordem de Serviço</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Estatísticas de Despesas - Top Row */}
      {(canViewDashboardCard('expensesPaid') || canViewDashboardCard('expensesPending') || canViewDashboardCard('expensesOverdue') || canViewDashboardCard('growth')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {canViewDashboardCard('expensesPaid') && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
                <Check className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  R$ {totalPaidExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paidExpenses.length} despesas pagas
                </p>
              </CardContent>
            </Card>
          )}

          {canViewDashboardCard('expensesPending') && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Pendentes</CardTitle>
                <Loader className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                  R$ {totalPendingExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pendingExpenses.length} despesas pendentes
                </p>
              </CardContent>
            </Card>
          )}

          {canViewDashboardCard('expensesOverdue') && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Vencidas</CardTitle>
                <AlertCircle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  R$ {totalOverdueExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overdueExpenses.length} despesas vencidas
                </p>
              </CardContent>
            </Card>
          )}

          {canViewDashboardCard('growth') && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {growthPercentage}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Taxa de conclusão
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats Grid - Middle Row */}
      {(canViewDashboardCard('openOrders') || canViewDashboardCard('completedOrders') || canViewDashboardCard('activeClients') || canViewDashboardCard('activeWorkers')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => {
            const cardKeyMap: Record<string, string> = {
              'Ordens Abertas': 'openOrders',
              'Ordens Concluídas': 'completedOrders',
              'Clientes Ativos': 'activeClients',
              'Funcionários Ativos': 'activeWorkers'
            };
            const cardKey = cardKeyMap[stat.title];
            
            if (!cardKey || !canViewDashboardCard(cardKey)) {
              return null;
            }

            return (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                  {stat.change && (
                    <p className={`text-xs ${stat.positive ? 'text-success' : 'text-destructive'} font-medium`}>
                      {stat.change} em relação ao mês anterior
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent Orders */}
      {canViewDashboardCard('recentOrders') && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Ordens de Serviço Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">
                          {formatOrderId(order.id)} - {order.clientName}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {order.vehicleName} • {order.service}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="font-medium text-foreground text-sm sm:text-base">
                      R$ {Number(order.value || 0).toFixed(2)}
                    </p>
                    <p className={`text-xs sm:text-sm ${getStatusColor(order.status)}`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <NewServiceOrderModal 
        open={showNewOrderModal} 
        onOpenChange={setShowNewOrderModal}
      />
    </div>
  );
};

export default Dashboard;