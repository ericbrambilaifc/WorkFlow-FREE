import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useApp, ServiceOrderItem } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface NewServiceOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewServiceOrderModal = ({ open, onOpenChange }: NewServiceOrderModalProps) => {
  const { addServiceOrder, clients, workers, vehicles, getVehiclesByClientId, stockItems, getServiceOrderLimitStats } = useApp();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clientId: '',
    vehicleId: '',
    workerId: '',
    service: '',
    status: 'Em andamento' as 'Em andamento' | 'Aguardando peças' | 'Finalizada',
    laborCost: 0, // Mão de obra
    priority: 'Normal' as 'Alta' | 'Normal' | 'Baixa',
    date: new Date()
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ServiceOrderItem[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  const selectedClientVehicles = formData.clientId ? getVehiclesByClientId(formData.clientId) : [];
  const selectedClient = clients.find(client => client.id === formData.clientId);
  const activeWorkers = workers.filter(worker => worker.status === 'active');

  // Calcular valor total: soma das peças + mão de obra
  const calculateTotalValue = () => {
    const itemsTotal = selectedItems.reduce((sum, item) => {
      return sum + (item.quantity * Number(item.unitPrice || 0));
    }, 0);
    return itemsTotal + Number(formData.laborCost || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.vehicleId || !formData.service) {
      toast({
        title: "Erro",
        description: "Cliente, veículo e descrição do serviço são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validar limite antes de criar
    try {
      const limitStats = await getServiceOrderLimitStats();
      // Só validar se o total for maior que 0 e o limite estiver excedido
      if (limitStats.total > 0 && limitStats.used >= limitStats.total) {
        toast({
          title: "Limite excedido",
          description: `Você está usando ${limitStats.used} de ${limitStats.total} ordens disponíveis. Crie mais ordens no dashboard ou delete ordens existentes.`,
          variant: "destructive",
        });
        return;
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao verificar limite de ordens",
        variant: "destructive",
      });
      return;
    }

    const totalValue = calculateTotalValue();

    try {
      await addServiceOrder({
        ...formData,
        value: totalValue, // Valor calculado automaticamente
        date: format(formData.date, 'yyyy-MM-dd'),
        items: selectedItems.length > 0 ? selectedItems : undefined
      });

      toast({
        title: "Sucesso",
        description: "Ordem de serviço criada com sucesso!",
      });

      setFormData({
        clientId: '',
        vehicleId: '',
        workerId: '',
        service: '',
        status: 'Em andamento',
        laborCost: 0,
        priority: 'Normal',
        date: new Date()
      });
      setSelectedItems([]);
      setClientSearch('');
      setStockSearch('');

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a ordem de serviço",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      vehicleId: '',
      workerId: '',
      service: '',
      status: 'Em andamento',
      laborCost: 0,
      priority: 'Normal',
      date: new Date()
    });
    setClientSearch('');
    setSelectedItems([]);
    setStockSearch('');
  };

  // Filtrar itens de estoque disponíveis
  const availableStockItems = stockItems.filter(item => {
    if (!stockSearch.trim()) return false;
    const searchLower = stockSearch.toLowerCase();
    return item.name.toLowerCase().includes(searchLower) ||
           item.code.toLowerCase().includes(searchLower) ||
           item.category.toLowerCase().includes(searchLower);
  }).filter(item => item.quantity > 0); // Apenas itens com estoque disponível

  const handleAddStockItem = (stockItemId: string) => {
    const stockItem = stockItems.find(item => item.id === stockItemId);
    if (!stockItem) return;

    // Verificar se o item já foi adicionado
    if (selectedItems.some(item => item.stockItemId === stockItemId)) {
      toast({
        title: "Aviso",
        description: "Este item já foi adicionado à ordem",
        variant: "default",
      });
      return;
    }

    const newItem: ServiceOrderItem = {
      stockItemId: stockItem.id,
      quantity: 1,
      unitPrice: Number(stockItem.unitPrice || 0),
      tipo: 'PRODUTO' // Padrão: PRODUTO, usuário pode alterar
    };

    setSelectedItems([...selectedItems, newItem]);
    setStockSearch('');
    setShowStockDropdown(false);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const item = selectedItems[index];
    const stockItem = stockItems.find(si => si.id === item.stockItemId);
    if (stockItem && quantity > stockItem.quantity) {
      toast({
        title: "Erro",
        description: `Quantidade disponível: ${stockItem.quantity}`,
        variant: "destructive",
      });
      return;
    }
    const updatedItems = [...selectedItems];
    updatedItems[index] = { ...item, quantity };
    setSelectedItems(updatedItems);
  };

  const handleUpdateItemType = (index: number, tipo: 'PRODUTO' | 'SERVICO') => {
    const updatedItems = [...selectedItems];
    updatedItems[index] = { ...updatedItems[index], tipo };
    setSelectedItems(updatedItems);
  };



  const clientsWithVehicles = clients.map(client => ({
    ...client,
    vehicles: getVehiclesByClientId(client.id)
  }));

  const filteredClients = clientsWithVehicles.filter(client => {
    if (!clientSearch.trim()) return false;

    const searchLower = clientSearch.toLowerCase();

    // Função para verificar se o texto começa com a busca
    const matchesText = (text: string, search: string) => {
      const textLower = text.toLowerCase();
      
      // Verifica se o texto começa com a busca
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

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setShowClientDropdown(value.trim().length > 0);

    // Se o usuário apagar tudo, limpa a seleção
    if (!value.trim()) {
      setFormData(prev => ({
        ...prev,
        clientId: '',
        vehicleId: ''
      }));
    } else {
      // Se o usuário está digitando algo diferente do cliente selecionado, limpa a seleção
      const selectedClient = clients.find(client => client.id === formData.clientId);
      if (selectedClient && value !== selectedClient.name) {
        setFormData(prev => ({
          ...prev,
          clientId: '',
          vehicleId: ''
        }));
      }
    }
  };

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    setFormData(prev => ({
      ...prev,
      clientId,
      vehicleId: ''
    }));
    setClientSearch(selectedClient?.name || '');
    setShowClientDropdown(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowClientDropdown(false);
      setShowStockDropdown(false);
    };

    if (showClientDropdown || showStockDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showClientDropdown, showStockDropdown]);


  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client">Cliente</Label>
              <div className="relative">
                <Input
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
                          onClick={() => handleClientSelect(client.id)}
                        >
                          {client.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vehicle">Veículo</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
                disabled={!formData.clientId}
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

            <div className="grid gap-2">
              <Label htmlFor="worker">Funcionário Responsável</Label>
              <Select
                value={formData.workerId}
                onValueChange={(value) => setFormData({ ...formData, workerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {activeWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} - {worker.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="service">Descrição do Serviço</Label>
              <Textarea
                id="service"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="Descreva o serviço a ser realizado..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="laborCost">Mão de Obra (R$)</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.laborCost}
                  onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? (
                        format(formData.date, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, date });
                        }
                      }}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'Em andamento' | 'Aguardando peças' | 'Finalizada') => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Aguardando peças">Aguardando peças</SelectItem>
                    <SelectItem value="Finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={formData.priority} onValueChange={(value: 'Alta' | 'Normal' | 'Baixa') => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stockItems">Peças Utilizadas</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar peça por nome, código ou categoria..."
                  value={stockSearch}
                  onChange={(e) => {
                    setStockSearch(e.target.value);
                    setShowStockDropdown(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => setShowStockDropdown(stockSearch.trim().length > 0)}
                />
                {showStockDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {availableStockItems.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Nenhuma peça encontrada.
                      </div>
                    ) : (
                      availableStockItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                          onClick={() => handleAddStockItem(item.id)}
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.code} • {item.category} • Estoque: {item.quantity}
                            </div>
                          </div>
                          <div className="text-xs font-medium text-green-600">
                            R$ {Number(item.unitPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedItems.length > 0 && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {selectedItems.map((item, index) => {
                    const stockItem = stockItems.find(si => si.id === item.stockItemId);
                    return (
                      <div key={index} className="flex flex-col gap-2 p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">{stockItem?.name || 'Item'}</span>
                              <Badge variant="outline" className="text-xs">{stockItem?.category}</Badge>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              R$ {Number(item.unitPrice || 0).toFixed(2)} un.
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-600">Tipo (obrigatório)</Label>
                            <Select
                              value={item.tipo || 'PRODUTO'}
                              onValueChange={(value: 'PRODUTO' | 'SERVICO') => handleUpdateItemType(index, value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PRODUTO">PRODUTO (NF-e)</SelectItem>
                                <SelectItem value="SERVICO">SERVICO (NFS-e)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              max={stockItem?.quantity || 1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-20 h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Total</Label>
                            <div className="h-8 flex items-center">
                              <span className="text-sm font-medium">
                                R$ {(item.quantity * Number(item.unitPrice || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resumo de valores */}
              <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Peças:</span>
                    <span className="font-medium">
                      R$ {selectedItems.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mão de Obra:</span>
                    <span className="font-medium">
                      R$ {Number(formData.laborCost || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-blue-300 pt-2 mt-2">
                    <span>Total a Pagar:</span>
                    <span className="text-blue-600">
                      R$ {calculateTotalValue().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Cancelar
            </Button>
            <Button type="submit">Criar Ordem</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewServiceOrderModal;