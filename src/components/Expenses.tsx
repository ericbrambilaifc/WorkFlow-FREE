import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, DollarSign, Calendar as CalendarIcon, CreditCard, AlertCircle, CheckCircle, Clock, Zap, ChevronLeft, ChevronRight, Edit, Trash, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import NewExpenseModal from "@/components/modals/NewExpenseModal";
import EditExpenseModal from "@/components/modals/EditExpenseModal";
import { Expense } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';

// Configurar moment para português
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

// Traduções dos meses
const meses = {
  0: 'Janeiro', 1: 'Fevereiro', 2: 'Março', 3: 'Abril',
  4: 'Maio', 5: 'Junho', 6: 'Julho', 7: 'Agosto',
  8: 'Setembro', 9: 'Outubro', 10: 'Novembro', 11: 'Dezembro'
};

// Traduções dos dias da semana
const diasSemana = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua',
  4: 'Qui', 5: 'Sex', 6: 'Sáb'
};

const diasSemanaCompleto = {
  0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
  4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
};

// Formatos customizados para português
const formats = {
  monthHeaderFormat: (date: Date) => {
    const month = meses[date.getMonth()];
    const year = date.getFullYear();
    return `${month} de ${year}`;
  },
  dayHeaderFormat: (date: Date) => {
    const diaSemana = diasSemanaCompleto[date.getDay()];
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = meses[date.getMonth()];
    return `${diaSemana}, ${dia} de ${mes}`;
  },
  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
    const diaInicio = start.getDate().toString().padStart(2, '0');
    const mesInicio = meses[start.getMonth()];
    const diaFim = end.getDate().toString().padStart(2, '0');
    const mesFim = meses[end.getMonth()];
    const anoFim = end.getFullYear();
    return `${diaInicio} de ${mesInicio} - ${diaFim} de ${mesFim} de ${anoFim}`;
  },
  dayFormat: (date: Date) => date.getDate().toString().padStart(2, '0'),
  weekdayFormat: (date: Date) => diasSemana[date.getDay()],
  timeGutterFormat: (date: Date) => moment(date).format('HH:mm'),
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
  eventTimeRangeStartFormat: ({ start }: { start: Date }) => moment(start).format('HH:mm'),
  eventTimeRangeEndFormat: ({ end }: { end: Date }) => moment(end).format('HH:mm'),
  agendaTimeFormat: (date: Date) => moment(date).format('HH:mm'),
  agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
};

const Expenses = () => {
  const { expenses, deleteExpense, updateExpense, updateAutomaticExpenses, stockItems, workers } = useApp();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtrar despesas baseado no termo de pesquisa
  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para obter a chave do mês (YYYY-MM)
  const getMonthKey = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Função para formatar o nome do mês
  const formatMonthName = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    // Capitalizar primeira letra
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  // Agrupar despesas por mês
  const expensesByMonth = useMemo(() => {
    const grouped: Record<string, Expense[]> = {};
    
    filteredExpenses.forEach(expense => {
      const monthKey = getMonthKey(expense.date);
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(expense);
    });

    // Ordenar despesas dentro de cada mês por data (mais recente primeiro)
    Object.keys(grouped).forEach(monthKey => {
      grouped[monthKey].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
    });

    // Ordenar meses (mais recente primeiro)
    const sortedMonths = Object.keys(grouped).sort((a, b) => {
      return b.localeCompare(a);
    });

    return { grouped, sortedMonths };
  }, [filteredExpenses]);

  // Calcular totais por mês
  const getMonthTotal = (monthExpenses: Expense[]): number => {
    return monthExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  };

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Converter despesas para o formato do react-big-calendar
  const calendarEvents = useMemo(() => {
    return filteredExpenses.map((expense) => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(9, 0, 0, 0); // Definir horário padrão (9h)
      const endDate = new Date(expenseDate);
      endDate.setHours(10, 0, 0, 0); // Duração de 1 hora

      return {
        id: expense.id,
        title: `${formatCurrency(Number(expense.amount) || 0)} - ${expense.description}`,
        start: expenseDate,
        end: endDate,
        resource: expense,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExpenses]);

  // Função para definir estilos dos eventos baseado no status
  const eventPropGetter = (event: any) => {
    const expense = event.resource as Expense;
    let style: { backgroundColor: string; borderColor: string; color: string; borderRadius: string; border: string; padding: string } = {
      backgroundColor: '#6b7280',
      borderColor: '#4b5563',
      color: 'white',
      borderRadius: '4px',
      border: 'none',
      padding: '2px 4px',
    };

    switch (expense?.status) {
      case 'paid':
        style.backgroundColor = '#10b981';
        style.borderColor = '#059669';
        break;
      case 'pending':
        style.backgroundColor = '#f59e0b';
        style.borderColor = '#d97706';
        break;
      case 'overdue':
        style.backgroundColor = '#ef4444';
        style.borderColor = '#dc2626';
        break;
      default:
        style.backgroundColor = '#6b7280';
        style.borderColor = '#4b5563';
    }

    return { style };
  };

  const handleSelectEvent = (event: any) => {
    const expense = event.resource as Expense;
    handleEditExpense(expense);
  };

  // Calcular estatísticas
  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const paidExpenses = expenses.filter(expense => expense.status === 'paid');
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const overdueExpenses = expenses.filter(expense => expense.status === 'overdue');

  const totalPaid = paidExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const totalPending = pendingExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const totalOverdue = overdueExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleCloseEditModal = (open: boolean) => {
    setShowEditExpenseModal(open);
    if (!open) {
      setSelectedExpense(null);
    }
  };

  // Atualizar despesas automáticas automaticamente quando necessário
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const updateAutomatic = async () => {
      try {
        await updateAutomaticExpenses();
      } catch (error) {
        console.error('Erro ao atualizar despesas automáticas:', error);
      }
    };

    // Atualizar quando o componente carrega ou quando há mudanças relevantes
    const scheduleUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Usar um pequeno delay para evitar múltiplas chamadas rápidas
      timeoutId = setTimeout(() => {
        if (isMounted) {
          updateAutomatic();
        }
      }, 500);
    };

    // Atualizar imediatamente ao carregar
    updateAutomatic();

    // Agendar atualização quando há mudanças no estoque ou funcionários
    scheduleUpdate();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockItems.length, workers.length]);

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm('Tem certeza que deseja excluir essa despesa?')) {
      deleteExpense(expenseId);
      toast({
        title: "Despesa removida",
        description: "Despesa removida com sucesso.",
      });
    }
  };

  const handleMarkAsPaid = async (expense: Expense) => {
    if (expense.status === 'paid') {
      toast({
        title: "Despesa já está paga",
        description: "Esta despesa já foi marcada como paga.",
        variant: "default",
      });
      return;
    }

    try {
      await updateExpense(expense.id, { status: 'paid' });
      toast({
        title: "Despesa marcada como paga",
        description: "A despesa foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao marcar despesa como paga:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar despesa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Despesas</h1>
          <p className="text-muted-foreground">Gerencie todas as despesas da oficina</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
            title={viewMode === "calendar" ? "Ver Lista" : "Ver Calendário"}
          >
            <CalendarIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{viewMode === "calendar" ? "Ver Lista" : "Ver Calendário"}</span>
          </Button>
          {canEdit('expenses') && (
            <Button size="sm" onClick={() => setShowNewExpenseModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} despesas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {paidExpenses.length} despesas pagas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {pendingExpenses.length} despesas pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">
              {overdueExpenses.length} despesas vencidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar despesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Visualização do Calendário */}
      {viewMode === "calendar" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div style={{ height: '600px' }}>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view="month"
                date={currentDate}
                onNavigate={setCurrentDate}
                onSelectEvent={handleSelectEvent}
                selectable={false}
                eventPropGetter={eventPropGetter}
                culture="pt-BR"
                formats={formats}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Despesas por Mês */}
      {viewMode === "list" && (
      <div className="space-y-6">
        {expensesByMonth.sortedMonths.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma despesa corresponde à sua busca.' : 'Comece adicionando sua primeira despesa.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          expensesByMonth.sortedMonths.map((monthKey) => {
            const monthExpenses = expensesByMonth.grouped[monthKey];
            const monthTotal = getMonthTotal(monthExpenses);
            const monthName = formatMonthName(monthKey);

            return (
              <div key={monthKey} className="space-y-4">
                {/* Cabeçalho do Mês */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h2 className="text-xl font-semibold">{monthName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {monthExpenses.length} {monthExpenses.length === 1 ? 'despesa' : 'despesas'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total do mês</p>
                    <p className="text-lg font-bold">{formatCurrency(monthTotal)}</p>
                  </div>
                </div>

                {/* Lista de Despesas do Mês */}
                <div className="grid gap-4">
                  {monthExpenses.map((expense) => (
                    <Card 
                      key={expense.id} 
                      className="border-0 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row items-start w-full gap-4 lg:gap-0">
                          {/* Coluna 1 - Informações principais */}
                          <div className="flex-1 w-full lg:max-w-[450px] space-y-2">
                            <div className="space-y-1">
                              <h3 className="text-base font-semibold text-foreground">
                                {expense.description}
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              {expense.isAutomatic && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 text-xs">
                                  <Zap className="h-3 w-3" />
                                  <span className="hidden sm:inline">Automática</span>
                                  <span className="sm:hidden">Auto</span>
                                </Badge>
                              )}
                              <Badge variant={getStatusVariant(expense.status)} className="flex items-center gap-1 text-xs">
                                {getStatusIcon(expense.status)}
                                <span className="hidden sm:inline">{getStatusText(expense.status)}</span>
                                <span className="sm:hidden">{getStatusText(expense.status).slice(0, 3)}</span>
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(Number(expense.amount) || 0)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                                <span>{formatDate(expense.date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 flex-shrink-0" />
                                <span>{expense.paymentMethod}</span>
                              </div>
                              <div>
                                <span className="capitalize">{expense.category}</span>
                              </div>
                            </div>

                            {expense.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {expense.notes}
                              </p>
                            )}
                          </div>

                          {/* Coluna 2 - Botões de ação */}
                          <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:ml-auto justify-start lg:justify-end">
                            {expense.status !== 'paid' && canEdit('expenses') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(expense)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Pago</span>
                                <span className="sm:hidden">Pago</span>
                              </Button>
                            )}
                            {canEdit('expenses') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExpense(expense)}
                                  className="flex-shrink-0"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Editar</span>
                                  <span className="sm:hidden">Editar</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Excluir</span>
                                  <span className="sm:hidden">Excluir</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Modais */}
      <NewExpenseModal
        open={showNewExpenseModal}
        onOpenChange={setShowNewExpenseModal}
      />
      <EditExpenseModal
        open={showEditExpenseModal}
        onOpenChange={handleCloseEditModal}
        expense={selectedExpense}
      />
    </div>
  );
};

export default Expenses;