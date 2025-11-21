import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Search, Send, MessageSquare, Mail, Clock, 
  Filter, BarChart3,
  CheckCircle2, XCircle, Loader2, Car, CheckCircle, AlertCircle
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VersionRestrictionNotice } from "@/components/VersionRestrictionNotice";

interface Message {
  id: string;
  type: "WhatsApp" | "SMS" | "Email";
  direction: "sent" | "received";
  recipient: string;
  recipientName?: string;
  subject?: string;
  content: string;
  status: "Enviado" | "Pendente" | "Falhou" | "Entregue" | "Lido";
  messageType: string;
  isWithin24hWindow: boolean;
  sentAt: string | null;
  clientId?: string;
  clientName?: string;
  serviceOrderId?: string;
  createdAt: string;
}

interface Statistics {
  totalSent: number;
  whatsappCount: number;
  smsCount: number;
  emailCount: number;
  sentCount: number;
  pendingCount: number;
  failedCount: number;
  openRate: string;
  freeMessagesCount: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CommunicationMarketing = () => {
  const { clients } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("Todos");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<string>("");
  const [serviceOrderSearch, setServiceOrderSearch] = useState("");
  const [showServiceOrderDropdown, setShowServiceOrderDropdown] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Função para formatar o ID da ordem de serviço com zeros à esquerda (formato OS-XXXXX)
  const formatOrderId = (id: string): string => {
    const numbers = id.replace(/\D/g, '');
    if (numbers.length > 0) {
      const numId = parseInt(numbers.substring(0, 5), 10) || 1;
      return `OS-${String(numId).padStart(5, '0')}`;
    } else {
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash = hash & hash;
      }
      const numId = Math.abs(hash) % 99999 || 1;
      return `OS-${String(numId).padStart(5, '0')}`;
    }
  };
  const [statistics, setStatistics] = useState<Statistics>({
    totalSent: 0,
    whatsappCount: 0,
    smsCount: 0,
    emailCount: 0,
    sentCount: 0,
    pendingCount: 0,
    failedCount: 0,
    openRate: "0%",
    freeMessagesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);

  // Filtrar ordens de serviço para busca
  const filteredServiceOrders = useMemo(() => {
    return serviceOrders
      .filter(order => {
        if (!serviceOrderSearch.trim()) return false;
        const searchLower = serviceOrderSearch.toLowerCase();
        const orderNumber = formatOrderId(order.id).toLowerCase();
        const clientName = (order.clientName || '').toLowerCase();
        
        // Buscar por número da ordem ou nome do cliente
        return orderNumber.includes(searchLower) || clientName.includes(searchLower);
      })
      .sort((a, b) => {
        // Se a busca contém texto (provavelmente nome do cliente), ordenar por data mais recente primeiro
        const searchLower = serviceOrderSearch.toLowerCase();
        const isSearchingByName = searchLower && !searchLower.match(/^os-?\d*$/);
        
        if (isSearchingByName) {
          const dateA = new Date(a.createdAt || a.date).getTime();
          const dateB = new Date(b.createdAt || b.date).getTime();
          return dateB - dateA; // Mais recente primeiro
        }
        // Se buscando por número, manter ordem original
        return 0;
      });
  }, [serviceOrders, serviceOrderSearch]);

  const handleServiceOrderSearchChange = (value: string) => {
    setServiceOrderSearch(value);
    setShowServiceOrderDropdown(value.trim().length > 0);

    // Se o usuário apagar tudo, limpa a seleção
    if (!value.trim()) {
      setSelectedServiceOrder("");
    } else {
      // Se o usuário está digitando algo diferente da ordem selecionada, limpa a seleção
      const selected = serviceOrders.find(o => o.id === selectedServiceOrder);
      if (selected) {
        const orderNumber = formatOrderId(selected.id);
        const displayText = `${orderNumber} | ${selected.clientName || 'Sem cliente'}`;
        if (value !== orderNumber && value !== selected.clientName && value !== displayText) {
          setSelectedServiceOrder("");
        }
      }
    }
  };

  const handleServiceOrderSelect = (orderId: string) => {
    const selected = serviceOrders.find(o => o.id === orderId);
    if (selected) {
      setSelectedServiceOrder(orderId);
      const orderNumber = formatOrderId(selected.id);
      setServiceOrderSearch(`${orderNumber} | ${selected.clientName || 'Sem cliente'}`);
      setShowServiceOrderDropdown(false);
    }
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowServiceOrderDropdown(false);
    };

    if (showServiceOrderDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showServiceOrderDropdown]);

  const [newMessage, setNewMessage] = useState({
    type: "WhatsApp" as "WhatsApp" | "SMS" | "Email",
    clientId: "",
    recipient: "",
    content: "",
    subject: ""
  });
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Não buscar dados - funcionalidade indisponível na versão de teste
  useEffect(() => {
    setLoading(false);
  }, []);

  // Não carregar dados - funcionalidade indisponível na versão de teste

  const fetchServiceOrders = async () => {
    // Funcionalidade indisponível na versão de teste
    setServiceOrders([]);
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      "WhatsApp": MessageSquare,
      "SMS": MessageSquare,
      "Email": Mail
    };
    const Icon = icons[type as keyof typeof icons] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeBadge = (type: string): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      "WhatsApp": "default",
      "SMS": "secondary",
      "Email": "outline"
    };
    return variants[type] || "default";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      "Enviado": CheckCircle2,
      "Pendente": Loader2,
      "Falhou": XCircle,
      "Entregue": CheckCircle,
      "Lido": CheckCircle2
    };
    const Icon = icons[status as keyof typeof icons] || CheckCircle2;
    return <Icon className={`h-4 w-4 ${status === "Pendente" ? "animate-spin" : ""}`} />;
  };

  function normalizeText(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  const filteredMessages = messages.filter(msg => {
    const normalizedSearch = normalizeText(searchTerm);
    const matchesSearch = [
      msg.recipient, 
      msg.recipientName || '', 
      msg.content, 
      msg.clientName || ''
    ].some(
      field => normalizeText(field || '').includes(normalizedSearch)
    );
    const matchesType = typeFilter === "Todos" || msg.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeOptions = [
    { value: "Todos", label: "Todos", count: messages.length },
    { value: "WhatsApp", label: "WhatsApp", count: messages.filter(m => m.type === "WhatsApp").length },
    { value: "SMS", label: "SMS", count: messages.filter(m => m.type === "SMS").length },
    { value: "Email", label: "Email", count: messages.filter(m => m.type === "Email").length }
  ];

  // Filtrar clientes para busca
  const filteredClients = clients.filter(client => {
    if (!clientSearch.trim()) return false;
    const searchLower = clientSearch.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      (client.phone && client.phone.toLowerCase().includes(searchLower))
    );
  });

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setShowClientDropdown(value.trim().length > 0);

    // Se o usuário apagar tudo, limpa a seleção
    if (!value.trim()) {
      setNewMessage(prev => ({
        ...prev,
        clientId: "",
        recipient: ""
      }));
    } else {
      // Se o usuário está digitando algo diferente do cliente selecionado, limpa a seleção
      const selectedClient = clients.find(client => client.id === newMessage.clientId);
      if (selectedClient && value !== selectedClient.name) {
        setNewMessage(prev => ({
          ...prev,
          clientId: "",
          recipient: ""
        }));
      }
    }
  };

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      // Preencher automaticamente o destinatário baseado no tipo de mensagem
      let recipient = "";
      if (newMessage.type === "Email") {
        recipient = selectedClient.email || "";
      } else {
        // WhatsApp ou SMS
        recipient = selectedClient.phone || "";
      }

      setNewMessage(prev => ({
        ...prev,
        clientId: clientId,
        recipient: recipient
      }));
      setClientSearch(selectedClient.name);
      setShowClientDropdown(false);
    }
  };

  // Atualizar destinatário quando mudar o tipo de mensagem
  useEffect(() => {
    if (newMessage.clientId) {
      const selectedClient = clients.find(client => client.id === newMessage.clientId);
      if (selectedClient) {
        let recipient = "";
        if (newMessage.type === "Email") {
          recipient = selectedClient.email || "";
        } else {
          recipient = selectedClient.phone || "";
        }
        setNewMessage(prev => ({
          ...prev,
          recipient: recipient
        }));
      }
    }
  }, [newMessage.type, newMessage.clientId, clients]);

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

  const handleCreateMessage = async () => {
    // Funcionalidade indisponível na versão de teste
  };

  const handleSendQuickMessage = async (type: 'vehicle_ready' | 'service_confirmation' | 'pickup_reminder') => {
    // Funcionalidade indisponível na versão de teste
  };

  return (
    <>
      <VersionRestrictionNotice featureName="Comunicação" />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunicação</h1>
          <p className="text-muted-foreground">Gerencie sua comunicação com seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 opacity-50 cursor-not-allowed" 
            onClick={() => {}}
            disabled={true}
          >
            <Car className="h-4 w-4" />
            Mensagens Rápidas
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Enviado</p>
                <p className="text-2xl font-bold text-foreground">{statistics.totalSent}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Entrega</p>
                <p className="text-2xl font-bold text-foreground">{statistics.openRate}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mensagens Grátis</p>
                <p className="text-2xl font-bold text-foreground">{statistics.freeMessagesCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Dentro de 24h</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{statistics.pendingCount}</p>
              </div>
              <Loader2 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por destinatário ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Type Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtrar por Tipo:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => (
              <Button
                key={option.value}
                variant={typeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(option.value)}
                className="text-xs"
              >
                {option.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {option.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Carregando mensagens...</p>
          </CardContent>
        </Card>
      ) : filteredMessages.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma mensagem encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece enviando mensagens para seus clientes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMessages.map((message) => (
            <Card key={message.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Badge variant={getTypeBadge(message.type)} className="flex items-center gap-1">
                        {getTypeIcon(message.type)}
                        {message.type}
                      </Badge>
                      {message.recipientName || message.recipient}
                      {message.isWithin24hWindow && message.type === 'WhatsApp' && (
                        <Badge variant="secondary" className="text-xs">
                          💬 Grátis (24h)
                        </Badge>
                      )}
                    </CardTitle>
                    {message.clientName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {message.clientName}
                      </p>
                    )}
                    {message.messageType !== 'manual' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tipo: {
                          message.messageType === 'vehicle_ready' ? 'Veículo Pronto' :
                          message.messageType === 'service_confirmation' ? 'Confirmação de Serviço' :
                          message.messageType === 'pickup_reminder' ? 'Lembrete de Retirada' :
                          message.messageType
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(message.status)}
                    <Badge variant={message.status === "Enviado" ? "default" : message.status === "Pendente" ? "secondary" : "destructive"}>
                      {message.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {message.subject && (
                  <p className="text-sm font-medium text-foreground mb-2">
                    Assunto: {message.subject}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-3">{message.content}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {message.sentAt 
                    ? new Date(message.sentAt).toLocaleString('pt-BR')
                    : new Date(message.createdAt).toLocaleString('pt-BR')
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Mensagens Rápidas */}
      <Dialog open={showQuickActions} onOpenChange={setShowQuickActions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mensagens Rápidas</DialogTitle>
            <DialogDescription>
              Envie mensagens úteis aos seus clientes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceOrder">Ordem de Serviço</Label>
              {serviceOrders.length === 0 ? (
                <div className="p-4 border rounded-md bg-gray-50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Nenhuma ordem de serviço disponível.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                    className="mt-2 opacity-50 cursor-not-allowed"
                    disabled={true}
                  >
                    Recarregar Ordens
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="serviceOrder"
                    placeholder="Busque pelo número da ordem ou nome do cliente..."
                    value={serviceOrderSearch}
                    onChange={(e) => handleServiceOrderSearchChange(e.target.value)}
                    onFocus={() => setShowServiceOrderDropdown(serviceOrderSearch.trim().length > 0)}
                  />
                  {showServiceOrderDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredServiceOrders.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Nenhuma ordem encontrada.
                        </div>
                      ) : (
                        filteredServiceOrders.map((order) => {
                          const orderNumber = formatOrderId(order.id);
                          return (
                            <div
                              key={order.id}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                              onClick={() => handleServiceOrderSelect(order.id)}
                            >
                              <div className="font-medium">
                                {orderNumber} | {order.clientName || 'Sem cliente'}
                              </div>
                              {order.service && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  {order.service}
                                </div>
                              )}
                              {order.status && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Status: {order.status} - R$ {Number(order.value || 0).toFixed(2)}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start opacity-50 cursor-not-allowed"
                onClick={() => {}}
                disabled={true}
              >
                <Car className="h-4 w-4 mr-2" />
                Aviso de Veículo Pronto
              </Button>
              <Button
                variant="outline"
                className="justify-start opacity-50 cursor-not-allowed"
                onClick={() => {}}
                disabled={true}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmação de Serviço
              </Button>
              <Button
                variant="outline"
                className="justify-start opacity-50 cursor-not-allowed"
                onClick={() => {}}
                disabled={true}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Lembrete de Retirada
              </Button>
            </div>
  
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickActions(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default CommunicationMarketing;
