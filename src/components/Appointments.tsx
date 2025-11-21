import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Calendar as CalendarIcon, Clock,
  User, Car, Filter, Bell, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Edit, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppointmentModal, Appointment, AppointmentFormData, initialNewAppointmentData } from '@/components/modals/AppointmentsModal';
import { useApp } from "@/contexts/AppContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar';
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

// Formatos customizados para português com formato 24h
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

const Appointments = () => {
  // Garantir que moment está em português
  moment.locale('pt-br');
  
  const { toast } = useToast();
  const { appointments, addAppointment, updateAppointment, deleteAppointment, sendReminder } = useApp();
  const { canEdit } = usePermissions();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState<AppointmentFormData>(initialNewAppointmentData);

  // --- Lógica do Modal de Agendamento ---
  const handleOpenNewAppointmentModal = () => {
    setAppointmentFormData(initialNewAppointmentData);
    setIsModalOpen(true);
  };

  const handleOpenEditAppointmentModal = (appointment: Appointment) => {
    setAppointmentFormData(appointment);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (data: AppointmentFormData) => {
    try {
      if (data.id) {
        await updateAppointment(data.id, data);
        toast({
          title: "Agendamento Atualizado",
          description: `O agendamento de ${data.clientName} foi salvo.`,
        });
      } else {
        await addAppointment(data);
        toast({
          title: "Sucesso!",
          description: `Agendamento para ${data.clientName} criado.`,
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar agendamento",
        variant: "destructive"
      });
    }
  };

  // --- Funções Auxiliares ---
  const getStatusBadge = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      "Confirmado": "default",
      "Pendente": "secondary",
      "Cancelado": "destructive",
      "Concluído": "outline"
    };
    return variants[status] || "default";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      "Confirmado": CheckCircle2,
      "Concluído": CheckCircle2,
      "Cancelado": XCircle,
      "Pendente": Clock
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  function normalizeText(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  const filteredAppointments = appointments.filter(apt => {
    const normalizedSearch = normalizeText(searchTerm);
    const matchesSearch = [apt.clientName, apt.vehicleName, apt.plate, apt.service].some(
      field => normalizeText(field || '').includes(normalizedSearch)
    );
    const matchesStatus = statusFilter === "Todos" || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "Todos", label: "Todos", count: appointments.length },
    { value: "Confirmado", label: "Confirmado", count: appointments.filter(a => a.status === "Confirmado").length },
    { value: "Pendente", label: "Pendente", count: appointments.filter(a => a.status === "Pendente").length },
    { value: "Concluído", label: "Concluído", count: appointments.filter(a => a.status === "Concluído").length },
    { value: "Cancelado", label: "Cancelado", count: appointments.filter(a => a.status === "Cancelado").length }
  ];

  const appointmentsByDate = filteredAppointments.reduce((acc, apt) => {
    const date = apt.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Converter agendamentos para o formato do react-big-calendar
  const calendarEvents = useMemo(() => {
    return filteredAppointments.map((apt) => {
      const [hours, minutes] = apt.time.split(':');
      const startDate = new Date(apt.date + 'T' + hours + ':' + minutes + ':00');
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      return {
        id: apt.id,
        title: `${apt.time} - ${apt.clientName} - ${apt.service}`,
        start: startDate,
        end: endDate,
        resource: apt,
      };
    });
  }, [filteredAppointments]);

  // Função para definir estilos dos eventos baseado no status
  const eventPropGetter = (event: any) => {
    const appointment = event.resource as Appointment;
    let style: { backgroundColor: string; borderColor: string; color: string; borderRadius: string; border: string; padding: string } = {
      backgroundColor: '#6b7280',
      borderColor: '#4b5563',
      color: 'white',
      borderRadius: '4px',
      border: 'none',
      padding: '2px 4px',
    };

    switch (appointment?.status) {
      case 'Confirmado':
        style.backgroundColor = '#3b82f6';
        style.borderColor = '#2563eb';
        break;
      case 'Pendente':
        style.backgroundColor = '#f59e0b';
        style.borderColor = '#d97706';
        break;
      case 'Concluído':
        style.backgroundColor = '#10b981';
        style.borderColor = '#059669';
        break;
      case 'Cancelado':
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
    const appointment = event.resource as Appointment;
    // Só permite editar se tiver permissão
    if (canEdit('appointments')) {
      handleOpenEditAppointmentModal(appointment);
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const selectedDate = moment(slotInfo.start).format('YYYY-MM-DD');
    const selectedTime = moment(slotInfo.start).format('HH:mm');
    setAppointmentFormData({
      ...initialNewAppointmentData,
      date: selectedDate,
      time: selectedTime
    });
    setIsModalOpen(true);
  };

  const handleSendReminder = async (appointmentId: string) => {
    try {
      await sendReminder(appointmentId);
      toast({
        title: "Lembrete Enviado",
        description: "Lembrete enviado com sucesso ao cliente",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar lembrete",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await deleteAppointment(appointmentId);
        toast({
          title: "Agendamento Excluído",
          description: "Agendamento removido com sucesso",
        });
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir agendamento",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <AppointmentModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        currentAppointment={appointmentFormData}
        setCurrentAppointment={setAppointmentFormData}
        onSave={handleSaveAppointment}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie os agendamentos de serviços</p>
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
          {canEdit('appointments') && (
            <Button 
              size="sm"
              onClick={handleOpenNewAppointmentModal}
              title="Criar novo agendamento"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Agendamento</span>
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {/* ... (código Statistics) */}

      {/* Search Bar */}
      {/* ... (código Search Bar) */}

      {/* Status Filter */}
      {/* ... (código Status Filter) */}

      {/* React Big Calendar View */}
      {viewMode === "calendar" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={calendarView === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("month")}
                >
                  Mês
                </Button>
                <Button
                  variant={calendarView === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("week")}
                >
                  Semana
                </Button>
                <Button
                  variant={calendarView === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("day")}
                  className="hidden sm:inline-flex"
                >
                  Dia
                </Button>
                <Button
                  variant={calendarView === "agenda" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("agenda")}
                >
                  Agenda
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (calendarView === "month") {
                      newDate.setMonth(newDate.getMonth() - 1);
                    } else if (calendarView === "week") {
                      newDate.setDate(newDate.getDate() - 7);
                    } else {
                      newDate.setDate(newDate.getDate() - 1);
                    }
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
                    if (calendarView === "month") {
                      newDate.setMonth(newDate.getMonth() + 1);
                    } else if (calendarView === "week") {
                      newDate.setDate(newDate.getDate() + 7);
                    } else {
                      newDate.setDate(newDate.getDate() + 1);
                    }
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
                view={calendarView}
                onView={setCalendarView}
                date={currentDate}
                onNavigate={setCurrentDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable={canEdit('appointments')}
                eventPropGetter={eventPropGetter}
                culture="pt-BR"
                formats={formats}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="grid gap-4">
          {filteredAppointments.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "Todos"
                    ? "Nenhum agendamento encontrado com os filtros aplicados"
                    : "Nenhum agendamento cadastrado"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {(() => {
                            if (!appointment.date) return 'Data inválida';
                            const dateObj = new Date(appointment.date + 'T00:00:00');
                            if (isNaN(dateObj.getTime())) return appointment.date || 'Data inválida';
                            const day = dateObj.getDate().toString().padStart(2, '0');
                            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                            const year = dateObj.getFullYear();
                            return `${day}/${month}/${year}`;
                          })()}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {appointment.time}
                        </Badge>
                        <Badge variant={getStatusBadge(appointment.status)} className="flex items-center gap-1">
                          {getStatusIcon(appointment.status)}
                          {appointment.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{appointment.clientName}</p>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{appointment.vehicleName}</p>
                          <p className="text-xs text-muted-foreground">Placa: {appointment.plate}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{appointment.service}</p>
                          <p className="text-xs text-muted-foreground">Serviço</p>
                        </div>
                      </div>
                    </div>
                    {canEdit('appointments') && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar"
                          onClick={() => handleOpenEditAppointmentModal(appointment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Appointments;
