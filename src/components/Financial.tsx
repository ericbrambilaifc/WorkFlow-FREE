import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Wrench, CheckCircle, Loader } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useEffect, useState } from "react";

const Financial = () => {
  const { transactions, serviceOrders, expenses, getClientById, getVehicleById } = useApp();
  const [growthData, setGrowthData] = useState({ growth: 0, currentRevenue: 0, previousRevenue: 0 });

  // Buscar dados de crescimento do backend
  useEffect(() => {
    const fetchGrowth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/financial/growth`, {
          credentials: 'include',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setGrowthData(data);
          console.log('📈 Dados de crescimento:', data);
        } else {
          console.error('Erro ao buscar crescimento:', response.status);
        }
      } catch (error) {
        console.error('Erro ao buscar crescimento:', error);
      }
    };

    fetchGrowth();
  }, [transactions]); // Recarregar quando transações mudarem

  // Debug: verificar dados carregados
  console.log('📊 Financial - Transações carregadas:', transactions.length);
  console.log('📊 Financial - Transações:', transactions);
  console.log('📊 Financial - Despesas carregadas:', expenses.length);
  console.log('📊 Financial - Despesas:', expenses);
  console.log('📊 Financial - Ordens de serviço:', serviceOrders.length);

  // Calcular dados do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Converter valores para número e calcular receita mensal
  // 1. Receita de transações manuais
  const revenueTransactions = transactions.filter(t => {
    if (!t || !t.date) return false;
    const transactionDate = new Date(t.date);
    return t.type === 'Receita' && 
           transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  const revenueFromTransactions = revenueTransactions.reduce((sum, t) => {
    const value = Number(t.value) || 0;
    console.log('💰 Receita - Transação:', t.description, 'Valor:', t.value, 'Convertido:', value);
    return sum + value;
  }, 0);

  // 2. Receita de ordens de serviço finalizadas no mês atual
  const revenueFromOrders = serviceOrders.filter(order => {
    if (!order || !order.date || order.status !== 'Finalizada') return false;
    const orderDate = new Date(order.date);
    return orderDate.getMonth() === currentMonth && 
           orderDate.getFullYear() === currentYear;
  }).reduce((sum, order) => {
    const value = Number(order.value || 0);
    console.log('💰 Receita - Ordem:', order.id, 'Valor:', order.value, 'Convertido:', value);
    return sum + value;
  }, 0);

  // Somar receitas de ambas as fontes
  const monthlyRevenue = revenueFromTransactions + revenueFromOrders;

  // Calcular despesas mensais: incluir transactions com type 'Despesa' E expenses
  const expenseTransactions = transactions.filter(t => {
    if (!t || !t.date) return false;
    const transactionDate = new Date(t.date);
    return t.type === 'Despesa' && 
           transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  const expenseFromTransactions = expenseTransactions.reduce((sum, t) => {
    const value = Math.abs(Number(t.value) || 0);
    console.log('💸 Despesa - Transação:', t.description, 'Valor:', t.value, 'Convertido:', value);
    return sum + value;
  }, 0);

  // Calcular despesas da tabela expenses
  const expenseFromExpensesTable = expenses.filter(e => {
    if (!e || !e.date) return false;
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === currentMonth && 
           expenseDate.getFullYear() === currentYear;
  }).reduce((sum, e) => {
    const value = Math.abs(Number(e.amount) || 0);
    console.log('💸 Despesa - Expense:', e.description, 'Valor:', e.amount, 'Convertido:', value);
    return sum + value;
  }, 0);

  // Somar despesas de ambas as fontes
  const monthlyExpenses = expenseFromTransactions + expenseFromExpensesTable;

  console.log('📊 Receita mensal calculada:', monthlyRevenue);
  console.log('📊 Receita de transações:', revenueFromTransactions);
  console.log('📊 Receita de ordens:', revenueFromOrders);
  console.log('📊 Despesas mensais calculadas:', monthlyExpenses);

  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

  // Calcular estatísticas de ordens de serviço
  // Ordens abertas são aquelas com status 'Em andamento' ou 'Aguardando peças'
  const openOrders = serviceOrders.filter(order => {
    return order && order.status && order.status !== 'Finalizada';
  }).length;
  
  // Ordens finalizadas no mês atual
  const completedOrders = serviceOrders.filter(order => {
    if (!order || !order.date || order.status !== 'Finalizada') return false;
    const orderDate = new Date(order.date);
    return orderDate.getMonth() === currentMonth && 
           orderDate.getFullYear() === currentYear;
  }).length;

  console.log('📊 Ordens abertas:', openOrders);
  console.log('📊 Ordens finalizadas este mês:', completedOrders);

  // Função auxiliar para formatar valores monetários
  const formatCurrency = (value: number): string => {
    if (isNaN(value) || !isFinite(value)) {
      return '0,00';
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const stats = [
    {
      title: "Receita Mensal",
      value: `R$ ${formatCurrency(monthlyRevenue)}`,
      change: growthData.previousRevenue > 0
        ? `${growthData.growth >= 0 ? '+' : ''}${growthData.growth.toFixed(1).replace('.', ',')}% em relação ao mês anterior`
        : "Novo registro mensal",
      icon: TrendingUp,
      positive: true,
      color: "text-success"
    },
    {
      title: "Despesas Mensais",
      value: `R$ ${formatCurrency(monthlyExpenses)}`,
      change: "Dentro do orçamento previsto",
      icon: TrendingDown,
      positive: false,
      color: "text-destructive"
    },
    {
      title: "Lucro Líquido",
      value: `R$ ${formatCurrency(monthlyProfit)}`,
      change: `Margem de ${isNaN(profitMargin) ? '0,0' : profitMargin.toFixed(1).replace('.', ',')}%`,
      icon: DollarSign,
      positive: true,
      color: "text-primary"
    },
    {
      title: "Crescimento",
      value: `${growthData.growth >= 0 ? '+' : ''}${growthData.growth.toFixed(1).replace('.', ',')}%`,
      change: growthData.previousRevenue > 0 
        ? `Em relação ao mês anterior`
        : "Sem dados anteriores para comparar",
      icon: Calendar,
      positive: growthData.growth >= 0,
      color: growthData.growth >= 0 ? "text-success" : "text-destructive"
    },
    {
      title: "Ordens Abertas",
      value: openOrders.toString(),
      change: "Aguardando finalização",
      icon: Loader,
      positive: false,
      color: "text-warning"
    },
    {
      title: "Ordens Finalizadas",
      value: completedOrders.toString(),
      change: "Concluídas este mês",
      icon: CheckCircle,
      positive: true,
      color: "text-success"
    }
  ];

  // Pegar as últimas 5 ordens de serviço finalizadas
  const recentOrders = serviceOrders
    .filter(order => order.status === 'Finalizada')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getTypeColor = (type: string) => {
    return type === "Receita" ? "text-success" : "text-destructive";
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      "Recebido": "default",
      "Pago": "default", 
      "Pendente": "secondary"
    };
    return variants[status] || "default";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground">Controle completo das finanças da oficina</p>
      </div>

      {/* Summary Cards - Primeira linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.slice(0, 3).map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <p className={`text-xs ${stat.positive ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards - Segunda linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.slice(3, 6).map((stat, index) => (
          <Card key={index + 3} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <p className={`text-xs ${stat.positive ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Service Orders */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold text-foreground">
            Ordens de Serviço Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ainda não há ordens de serviço finalizadas</p>
            ) : (
              recentOrders.map((order) => {
                const client = getClientById(order.clientId);
                const vehicle = getVehicleById(order.vehicleId);
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">
                          {order.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {order.priority}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{client?.name || 'Cliente não encontrado'}</p>
                      <p className="text-sm text-muted-foreground">{order.service}</p>
                      {vehicle && (
                        <p className="text-xs text-muted-foreground">
                          {vehicle.brand} {vehicle.model} - {vehicle.plate}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">
                        R$ {Number(order.value || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Financial;