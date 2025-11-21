import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApp, ServiceOrder } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmitInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder | null;
}

const EmitInvoiceModal = ({ open, onOpenChange, order }: EmitInvoiceModalProps) => {
  const { clients, getClientById, stockItems, createInvoice } = useApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fiscalSettings, setFiscalSettings] = useState<any>(null);

  const [invoiceData, setInvoiceData] = useState({
    clientName: '',
    clientAddress: '',
    clientCpfCnpj: '',
    serviceDescription: '',
    totalValue: 0,
    items: [] as Array<{ name: string; quantity: number; unitPrice: number; total: number }>
  });

  // Carregar configurações fiscais ao abrir o modal
  useEffect(() => {
    if (open) {
      loadFiscalSettings();
    }
  }, [open]);

  const loadFiscalSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/fiscal-settings/nfse`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setFiscalSettings(result.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações fiscais:', error);
    }
  };

  useEffect(() => {
    if (order && open) {
      const client = getClientById(order.clientId);
      
      // Montar endereço completo - verificar campos diretos ou dentro do objeto address
      const addressParts = [];
      
      // Verificar se address é objeto ou string
      let addressData: any = {};
      if (client?.address) {
        if (typeof client.address === 'string') {
          try {
            addressData = JSON.parse(client.address);
          } catch {
            // Se não for JSON, usar como string simples
            addressParts.push(client.address);
          }
        } else {
          addressData = client.address;
        }
      }
      
      // Usar campos diretos do cliente (do banco) ou do objeto address
      const street = (client as any)?.address_street || addressData?.street || addressData?.address_street;
      const number = (client as any)?.address_number || addressData?.number || addressData?.address_number;
      const complement = (client as any)?.address_complement || addressData?.complement || addressData?.address_complement;
      const neighborhood = (client as any)?.address_neighborhood || addressData?.neighborhood || addressData?.address_neighborhood;
      const city = (client as any)?.address_city || addressData?.city || addressData?.address_city;
      const state = (client as any)?.address_state || addressData?.state || addressData?.address_state;
      const zipCode = (client as any)?.address_zip_code || addressData?.zipCode || addressData?.address_zip_code;
      
      if (street) addressParts.push(street);
      if (number) addressParts.push(`Nº ${number}`);
      if (complement) addressParts.push(complement);
      if (neighborhood) addressParts.push(neighborhood);
      if (city) addressParts.push(city);
      if (state) addressParts.push(state);
      if (zipCode) {
        const zip = String(zipCode).replace(/\D/g, '');
        const formattedZip = zip.length === 8 
          ? `${zip.slice(0, 5)}-${zip.slice(5)}` 
          : zip;
        addressParts.push(`CEP: ${formattedZip}`);
      }
      
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Endereço não cadastrado';

      // Montar lista de peças utilizadas
      const itemsList = order.items?.map(item => {
        const stockItem = stockItems.find(si => si.id === item.stockItemId);
        return {
          name: stockItem?.name || item.stockItemName || 'Item não encontrado',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
          total: item.quantity * Number(item.unitPrice || 0)
        };
      }) || [];

      // Formatar CPF
      let formattedCpf = '';
      if (client?.cpf) {
        const cpfNumbers = String(client.cpf).replace(/\D/g, '');
        if (cpfNumbers.length === 11) {
          formattedCpf = `CPF: ${cpfNumbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`;
        } else {
          formattedCpf = `CPF: ${client.cpf}`;
        }
      }

      setInvoiceData({
        clientName: client?.name || 'Cliente não encontrado',
        clientAddress: fullAddress,
        clientCpfCnpj: formattedCpf,
        serviceDescription: order.service,
        totalValue: Number(order.value || 0),
        items: itemsList
      });
    }
  }, [order, open, clients, getClientById, stockItems]);

  const handleEmitInvoice = async () => {
    if (!order) return;

    // Validar que temos um clientId válido
    if (!order.clientId || typeof order.clientId !== 'string' || order.clientId.trim() === '') {
      toast({
        title: "Erro de Validação",
        description: "ID do cliente inválido. Por favor, verifique a ordem de serviço.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Calcular valores
      const itemsTotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
      const laborCost = invoiceData.totalValue - itemsTotal;

      // Preparar itens da nota fiscal (peças)
      const invoiceItems = invoiceData.items
        .filter(item => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.unitPrice) || 0;
          return qty > 0 && price > 0;
        })
        .map((item, index) => {
          const quantity = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const total = quantity * unitPrice;
          
          return {
            itemNumber: index + 1,
            type: 'service' as const,
            description: (item.name || '').trim() || 'Item sem descrição',
            quantity: quantity,
            unitPrice: unitPrice,
            discount: 0,
            subtotal: total,
            total: total,
            unit: 'UN',
          };
        });

      // Adicionar mão de obra como item se houver valor
      if (laborCost > 0.01) { // Usar 0.01 para evitar problemas de ponto flutuante
        const laborPrice = Number(laborCost.toFixed(2));
        invoiceItems.push({
          itemNumber: invoiceItems.length + 1,
          type: 'service' as const,
          description: ('Mão de obra - ' + (invoiceData.serviceDescription || 'Prestação de serviço')).trim(),
          quantity: 1,
          unitPrice: laborPrice,
          discount: 0,
          subtotal: laborPrice,
          total: laborPrice,
          unit: 'UN',
        });
      }

      // Se não houver itens, criar um item com o serviço completo
      if (invoiceItems.length === 0) {
        const totalValue = Number(invoiceData.totalValue) || 0;
        if (totalValue <= 0) {
          throw new Error('O valor total da ordem de serviço deve ser maior que zero');
        }
        invoiceItems.push({
          itemNumber: 1,
          type: 'service' as const,
          description: (invoiceData.serviceDescription || 'Prestação de serviço').trim(),
          quantity: 1,
          unitPrice: totalValue,
          discount: 0,
          subtotal: totalValue,
          total: totalValue,
          unit: 'UN',
        });
      }

      // Validar que temos pelo menos um item válido
      if (invoiceItems.length === 0 || invoiceItems.some(item => {
        return !item.description || item.description.length < 3 || 
               item.quantity <= 0 || item.unitPrice <= 0;
      })) {
        throw new Error('É necessário ter pelo menos um item válido com descrição, quantidade e preço');
      }

      // Calcular impostos usando configurações fiscais
      const subtotal = Number(invoiceData.totalValue) || 0;
      let totalTaxes = 0;
      
      if (fiscalSettings) {
        const issAmount = (subtotal * (fiscalSettings.default_iss || 0)) / 100;
        const pisAmount = (subtotal * (fiscalSettings.default_pis || 0)) / 100;
        const cofinsAmount = (subtotal * (fiscalSettings.default_cofins || 0)) / 100;
        totalTaxes = issAmount + pisAmount + cofinsAmount;
      }

      // Criar a nota fiscal
      const newInvoice = await createInvoice({
        type: 'nfse',
        clientId: order.clientId,
        serviceOrderId: order.id,
        operationNature: fiscalSettings?.default_operation_nature || 'Prestação de serviço',
        cfop: fiscalSettings?.default_cfop || null,
        items: invoiceItems,
        totalAmount: subtotal + totalTaxes,
        subtotal: subtotal,
        totalTaxes: totalTaxes,
        additionalInfo: `Serviço: ${invoiceData.serviceDescription}`,
      });

      toast({
        title: "Nota Fiscal Criada",
        description: `Nota fiscal para ${invoiceData.clientName} criada com sucesso!`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao criar nota fiscal:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar nota fiscal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const itemsTotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
  const laborCost = Math.max(0, invoiceData.totalValue - itemsTotal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Dados do Cliente</h3>
            <div className="grid gap-4">
              <div>
                <Label>Nome do Cliente</Label>
                <Input value={invoiceData.clientName} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Endereço</Label>
                <Textarea 
                  value={invoiceData.clientAddress} 
                  readOnly 
                  className="bg-muted min-h-[80px]" 
                />
              </div>
              {invoiceData.clientCpfCnpj && (
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input value={invoiceData.clientCpfCnpj} readOnly className="bg-muted" />
                </div>
              )}
            </div>
          </div>

          {/* Descrição do Serviço */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Descrição do Serviço</h3>
            <div>
              <Label>Serviço Realizado</Label>
              <Textarea 
                value={invoiceData.serviceDescription} 
                readOnly 
                className="bg-muted min-h-[100px]" 
              />
            </div>
          </div>

          {/* Peças Utilizadas */}
          {invoiceData.items.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Peças Utilizadas
              </h3>
              <div className="border rounded-md">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Item</th>
                        <th className="text-center p-3 text-sm font-medium">Qtd</th>
                        <th className="text-right p-3 text-sm font-medium">Preço Unit.</th>
                        <th className="text-right p-3 text-sm font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3 text-sm">{item.name}</td>
                          <td className="p-3 text-sm text-center">{item.quantity}</td>
                          <td className="p-3 text-sm text-right">
                            R$ {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-right font-medium">
                            R$ {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Resumo de Valores */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Resumo de Valores</h3>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 space-y-2">
              {invoiceData.items.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Peças:</span>
                  <span className="font-medium">R$ {itemsTotal.toFixed(2)}</span>
                </div>
              )}
              {laborCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mão de Obra:</span>
                  <span className="font-medium">R$ {laborCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-blue-300 pt-2 mt-2">
                <span>Valor Total:</span>
                <span className="text-blue-600">R$ {invoiceData.totalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEmitInvoice} className="gap-2">
            <FileText className="h-4 w-4" />
            Emitir Nota Fiscal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmitInvoiceModal;

