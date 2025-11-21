import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { useApp } from "@/contexts/AppContext";

// --- INTERFACES E TIPAGEM ---

/** * Definição completa de um agendamento.
 * Exportada para ser usada no componente Appointments.tsx.
 */
export interface Appointment {
    id: string;
    clientName: string;
    vehicleName: string;
    plate: string;
    service: string;
    date: string;
    time: string;
    status: "Confirmado" | "Pendente" | "Cancelado" | "Concluído";
    reminderSent: boolean;
    notes?: string;
}

/** * Interface para os dados do formulário do modal. 
 * É a mesma que Appointment, mas 'id' é opcional para criação.
 */
export interface AppointmentFormData {
    id?: string; // Tornamos o ID opcional para novos agendamentos
    clientName: string;
    vehicleName: string;
    plate: string;
    service: string;
    date: string;
    time: string;
    status: "Confirmado" | "Pendente" | "Cancelado" | "Concluído";
    notes?: string; // Mantemos notes opcional, se for o caso
}

/** * Valores iniciais para um novo agendamento.
 */
export const initialNewAppointmentData: AppointmentFormData = {
    clientName: "",
    vehicleName: "",
    plate: "",
    service: "",
    // Define a data atual no formato YYYY-MM-DD
    date: format(new Date(), 'yyyy-MM-dd'),
    time: "09:00",
    status: "Pendente",
    notes: ""
};

interface AppointmentModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    currentAppointment: AppointmentFormData;
    setCurrentAppointment: (data: AppointmentFormData) => void;
    onSave: (data: AppointmentFormData) => void;
}

// --- COMPONENTE MODAL ---

export const AppointmentModal = ({
    isOpen,
    setIsOpen,
    currentAppointment,
    setCurrentAppointment,
    onSave
}: AppointmentModalProps) => {
    const { clients, vehicles, getVehiclesByClientId } = useApp();
    
    // Função para converter string de data para Date object
    const parseDate = (dateString: string | undefined): Date | undefined => {
        if (!dateString) return undefined;
        // Se a data vier em formato ISO (com T), pegar apenas a parte da data
        const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const dateObj = new Date(dateOnly + 'T00:00:00');
        return isNaN(dateObj.getTime()) ? undefined : dateObj;
    };

    // Estado local para a data como Date object
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
        parseDate(currentAppointment.date) || new Date()
    );

    // Estados para busca de cliente
    const [clientSearch, setClientSearch] = React.useState(currentAppointment.clientName || '');
    const [showClientDropdown, setShowClientDropdown] = React.useState(false);
    const [selectedClientId, setSelectedClientId] = React.useState<string>('');

    // Atualiza a data quando currentAppointment mudar
    React.useEffect(() => {
        const parsedDate = parseDate(currentAppointment.date);
        if (parsedDate) {
            setSelectedDate(parsedDate);
        } else if (!currentAppointment.date) {
            setSelectedDate(new Date());
        }
    }, [currentAppointment.date]);

    // Atualiza clientSearch quando currentAppointment.clientName mudar
    React.useEffect(() => {
        setClientSearch(currentAppointment.clientName || '');
        
        // Se houver nome do cliente, tentar encontrar o ID correspondente
        if (currentAppointment.clientName) {
            const foundClient = clients.find(c => c.name === currentAppointment.clientName);
            if (foundClient) {
                setSelectedClientId(foundClient.id);
            }
        } else {
            setSelectedClientId('');
        }
    }, [currentAppointment.clientName, clients]);

    // Obter veículos do cliente selecionado
    const selectedClientVehicles = selectedClientId ? getVehiclesByClientId(selectedClientId) : [];

    // Preparar clientes com veículos para busca
    const clientsWithVehicles = clients.map(client => ({
        ...client,
        vehicles: getVehiclesByClientId(client.id)
    }));

    // Filtrar clientes baseado na busca
    const filteredClients = clientsWithVehicles.filter(client => {
        if (!clientSearch.trim()) return false;

        const searchLower = clientSearch.toLowerCase();

        // Função para verificar se o texto começa com a busca
        const matchesText = (text: string, search: string) => {
            const textLower = text.toLowerCase();
            return textLower.startsWith(search);
        };

        const matchesClient =
            matchesText(client.name, searchLower) ||
            matchesText(client.email, searchLower);

        const matchesVehicle = client.vehicles.some(vehicle => {
            const vehicleText = `${vehicle.brand} ${vehicle.model} ${vehicle.plate}`;
            return matchesText(vehicleText, searchLower);
        });

        return matchesClient || matchesVehicle;
    });

    // Handler para mudança na busca de cliente
    const handleClientSearchChange = (value: string) => {
        setClientSearch(value);
        setShowClientDropdown(value.trim().length > 0);

        // Atualizar clientName no currentAppointment
        handleChange('clientName', value);

        // Se o usuário apagar tudo, limpa a seleção
        if (!value.trim()) {
            setSelectedClientId('');
            setCurrentAppointment({
                ...currentAppointment,
                clientName: '',
                vehicleName: '',
                plate: ''
            });
        } else {
            // Se o usuário está digitando algo diferente do cliente selecionado, limpa a seleção
            const selectedClient = clients.find(client => client.id === selectedClientId);
            if (selectedClient && value !== selectedClient.name) {
                setSelectedClientId('');
                setCurrentAppointment({
                    ...currentAppointment,
                    clientName: value,
                    vehicleName: '',
                    plate: ''
                });
            }
        }
    };

    // Handler para seleção de cliente
    const handleClientSelect = (clientId: string) => {
        const selectedClient = clients.find(client => client.id === clientId);
        if (selectedClient) {
            setSelectedClientId(clientId);
            setClientSearch(selectedClient.name);
            setShowClientDropdown(false);

            const clientVehicles = getVehiclesByClientId(clientId);
            
            // Se o cliente tiver apenas um veículo, preencher automaticamente
            if (clientVehicles.length === 1) {
                const vehicle = clientVehicles[0];
                setCurrentAppointment({
                    ...currentAppointment,
                    clientName: selectedClient.name,
                    vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
                    plate: vehicle.plate
                });
            } else {
                // Se tiver vários ou nenhum, limpar veículo e placa
                setCurrentAppointment({
                    ...currentAppointment,
                    clientName: selectedClient.name,
                    vehicleName: '',
                    plate: ''
                });
            }
        }
    };

    // Handler para seleção de veículo
    const handleVehicleSelect = (vehicleId: string) => {
        const selectedVehicle = vehicles.find(v => v.id === vehicleId);
        if (selectedVehicle) {
            setCurrentAppointment({
                ...currentAppointment,
                vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.year}`,
                plate: selectedVehicle.plate
            });
        }
    };

    // Sincronizar clientSearch quando o modal abrir
    useEffect(() => {
        if (isOpen) {
            setClientSearch(currentAppointment.clientName || '');
            // Tentar encontrar o cliente pelo nome
            if (currentAppointment.clientName) {
                const foundClient = clients.find(c => c.name === currentAppointment.clientName);
                if (foundClient) {
                    setSelectedClientId(foundClient.id);
                }
            }
        }
    }, [isOpen, currentAppointment.clientName, clients]);

    // Fechar dropdown quando clicar fora
    useEffect(() => {
        const handleClickOutside = () => {
            setShowClientDropdown(false);
        };

        if (showClientDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showClientDropdown]);

    // Atualiza um campo específico do formulário
    const handleChange = (field: keyof AppointmentFormData, value: string) => {
        setCurrentAppointment({ ...currentAppointment, [field]: value });
    };

    // Verifica se estamos em modo de edição (ID existe) ou criação (ID não existe)
    const isEditing = !!currentAppointment.id;

    const handleSubmit = () => {
        // Validação básica
        if (!currentAppointment.clientName || !currentAppointment.service || !selectedDate || !currentAppointment.time) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        // Atualiza a data no formato string antes de salvar
        const appointmentToSave = {
            ...currentAppointment,
            date: format(selectedDate, 'yyyy-MM-dd')
        };

        onSave(appointmentToSave); // Envia os dados para o componente pai
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Altere os dados do agendamento existente." : "Preencha os dados para criar um novo agendamento."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    {/* Cliente */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="client" className="text-right">Cliente <span className="text-red-500">*</span></Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="client"
                                placeholder="Digite o nome do cliente..."
                                value={clientSearch}
                                onChange={(e) => handleClientSearchChange(e.target.value)}
                                onFocus={() => setShowClientDropdown(clientSearch.trim().length > 0)}
                            />
                            {showClientDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {filteredClients.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-gray-500">
                                            Nenhum cliente encontrado.
                                        </div>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <div
                                                key={client.id}
                                                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClientSelect(client.id);
                                                }}
                                            >
                                                {client.name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Veículo - Select (apenas quando cliente selecionado e tiver veículos) */}
                    {selectedClientId && selectedClientVehicles.length > 0 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="vehicle" className="text-right">Veículo <span className="text-red-500">*</span></Label>
                            <div className="col-span-3">
                                <Select
                                    value={vehicles.find(v => 
                                        v.plate === currentAppointment.plate && 
                                        getVehiclesByClientId(selectedClientId).some(cv => cv.id === v.id)
                                    )?.id || ""}
                                    onValueChange={handleVehicleSelect}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um veículo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedClientVehicles.map((vehicle) => (
                                            <SelectItem key={vehicle.id} value={vehicle.id}>
                                                {vehicle.brand} {vehicle.model} {vehicle.year} - {vehicle.plate}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Mensagem quando cliente não tem veículos */}
                    {selectedClientId && selectedClientVehicles.length === 0 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Veículo</Label>
                            <div className="col-span-3 text-sm text-muted-foreground">
                                Este cliente não possui veículos cadastrados.
                            </div>
                        </div>
                    )}

                    {/* Campo de placa (apenas leitura, preenchido automaticamente) */}
                    {currentAppointment.plate && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="plate" className="text-right">Placa</Label>
                            <Input
                                id="plate"
                                value={currentAppointment.plate}
                                readOnly
                                className="col-span-3 bg-muted cursor-not-allowed"
                            />
                        </div>
                    )}

                    {/* Serviço */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="service" className="text-right">Serviço <span className="text-red-500">*</span></Label>
                        <Input
                            id="service"
                            placeholder="Descrição do Serviço"
                            value={currentAppointment.service}
                            onChange={(e) => handleChange('service', e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* Data */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Data <span className="text-red-500">*</span></Label>
                        <div className="col-span-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? (
                                            (() => {
                                                const day = selectedDate.getDate().toString().padStart(2, '0');
                                                const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                                                const year = selectedDate.getFullYear();
                                                return `${day}/${month}/${year}`;
                                            })()
                                        ) : (
                                            <span>Selecione uma data</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            if (date) {
                                                setSelectedDate(date);
                                                handleChange('date', format(date, 'yyyy-MM-dd'));
                                            }
                                        }}
                                        locale={ptBR}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Hora */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">Hora <span className="text-red-500">*</span></Label>
                        <div className="col-span-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !currentAppointment.time && "text-muted-foreground"
                                        )}
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        {currentAppointment.time ? (
                                            (() => {
                                                const [hours, minutes] = currentAppointment.time.split(':');
                                                const hour = parseInt(hours);
                                                const minute = parseInt(minutes);
                                                const formattedHour = hour.toString().padStart(2, '0');
                                                const formattedMinute = minute.toString().padStart(2, '0');
                                                return `${formattedHour}:${formattedMinute}`;
                                            })()
                                        ) : (
                                            <span>Selecione uma hora</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4" align="start">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="flex flex-col items-center gap-2">
                                                <Label className="text-xs text-muted-foreground">Hora</Label>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            const [hours, minutes] = (currentAppointment.time || "09:00").split(':');
                                                            const newHour = Math.max(0, Math.min(23, parseInt(hours) - 1));
                                                            handleChange('time', `${newHour.toString().padStart(2, '0')}:${minutes}`);
                                                        }}
                                                    >
                                                        -
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="23"
                                                        value={currentAppointment.time ? parseInt(currentAppointment.time.split(':')[0]) : 9}
                                                        onChange={(e) => {
                                                            const hours = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                                                            const minutes = currentAppointment.time ? currentAppointment.time.split(':')[1] : "00";
                                                            handleChange('time', `${hours.toString().padStart(2, '0')}:${minutes}`);
                                                        }}
                                                        className="w-16 text-center text-lg font-semibold"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            const [hours, minutes] = (currentAppointment.time || "09:00").split(':');
                                                            const newHour = Math.max(0, Math.min(23, parseInt(hours) + 1));
                                                            handleChange('time', `${newHour.toString().padStart(2, '0')}:${minutes}`);
                                                        }}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold mt-6">:</span>
                                            <div className="flex flex-col items-center gap-2">
                                                <Label className="text-xs text-muted-foreground">Minuto</Label>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            const [hours, minutes] = (currentAppointment.time || "09:00").split(':');
                                                            const newMinute = Math.max(0, Math.min(59, parseInt(minutes) - 1));
                                                            handleChange('time', `${hours}:${newMinute.toString().padStart(2, '0')}`);
                                                        }}
                                                    >
                                                        -
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="59"
                                                        step="1"
                                                        value={currentAppointment.time ? parseInt(currentAppointment.time.split(':')[1]) : 0}
                                                        onChange={(e) => {
                                                            const minutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                                            const hours = currentAppointment.time ? currentAppointment.time.split(':')[0] : "09";
                                                            handleChange('time', `${hours}:${minutes.toString().padStart(2, '0')}`);
                                                        }}
                                                        className="w-16 text-center text-lg font-semibold"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            const [hours, minutes] = (currentAppointment.time || "09:00").split(':');
                                                            const newMinute = Math.max(0, Math.min(59, parseInt(minutes) + 1));
                                                            handleChange('time', `${hours}:${newMinute.toString().padStart(2, '0')}`);
                                                        }}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                                            {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                                                <Button
                                                    key={time}
                                                    variant={currentAppointment.time === time ? "default" : "outline"}
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={() => handleChange('time', time)}
                                                >
                                                    {time}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                        <Select
                            value={currentAppointment.status}
                            // O TypeScript infere o tipo correto (Confirmado, Pendente, etc.)
                            onValueChange={(value) => handleChange('status', value)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione o Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Confirmado">Confirmado</SelectItem>
                                <SelectItem value="Concluído">Concluído</SelectItem>
                                <SelectItem value="Cancelado">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notas */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="notes" className="text-right pt-2">Notas</Label>
                        <Textarea
                            id="notes"
                            placeholder="Observações do agendamento..."
                            value={currentAppointment.notes || ""}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} type="submit">
                        {isEditing ? "Salvar Alterações" : "Criar Agendamento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};