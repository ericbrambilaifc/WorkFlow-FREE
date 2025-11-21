import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceFormData, InvoiceItem } from "@/components/Invoices";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";

interface InvoiceModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentInvoice: InvoiceFormData;
  setCurrentInvoice: (data: InvoiceFormData) => void;
  onSave: (data: InvoiceFormData) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  setIsOpen,
  currentInvoice,
  setCurrentInvoice,
  onSave
}) => {
  const { toast } = useToast();
  const { clients } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("client");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // CFOPs comuns para oficina mecânica
  const cfopOptions = [
    { value: "5102", label: "5102 - Venda de mercadoria adquirida de terceiros" },
    { value: "5933", label: "5933 - Prestação de serviço tributado pelo ISSQN" },
    { value: "5949", label: "5949 - Outra saída de mercadoria ou prestação de serviço" },
  ];


  // Filtrar clientes para busca
  const filteredClients = clients.filter((client) => {
    if (!clientSearch.trim()) return false;

    const searchLower = clientSearch.toLowerCase();

    // Função para verificar se o texto começa com a busca
    const matchesText = (text: string, search: string) => {
      const textLower = text.toLowerCase();
      return textLower.startsWith(search);
    };

    return (
      matchesText(client.name, searchLower) ||
      matchesText(client.email, searchLower) ||
      (client.cpf && matchesText(client.cpf, searchLower))
    );
  });

  // Handler para mudança na busca de cliente
  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setShowClientDropdown(value.trim().length > 0);

    // Se o usuário apagar tudo, limpa a seleção
    if (!value.trim()) {
      setCurrentInvoice({
        ...currentInvoice,
        client: {
          ...currentInvoice.client,
          name: "",
          documentNumber: "",
          email: "",
          phone: "",
          address: {
            zipCode: "",
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
          },
        },
      });
    } else {
      // Se o usuário está digitando algo diferente do cliente selecionado, atualiza apenas o nome
      // (mantém outros campos caso o usuário esteja editando manualmente)
      if (value !== currentInvoice.client.name) {
        setCurrentInvoice({
          ...currentInvoice,
          client: {
            ...currentInvoice.client,
            name: value,
          },
        });
      }
    }
  };

  // Handler para selecionar cliente
  const handleClientSelect = (client: typeof clients[0]) => {
    // Determinar tipo de documento baseado no CPF
    const documentType = client.cpf && client.cpf.length === 11 ? "cpf" : "cnpj";
    
    // Tentar extrair endereço do campo address (pode estar em formato string ou objeto)
    let addressData = {
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    };

    // Se o address for um objeto, usar diretamente
    if (client.address && typeof client.address === "object") {
      addressData = {
        zipCode: client.address.zipCode || "",
        street: client.address.street || "",
        number: client.address.number || "",
        complement: client.address.complement || "",
        neighborhood: client.address.neighborhood || "",
        city: client.address.city || "",
        state: client.address.state || "",
      };
    } 
    // Se o address for uma string, tentar parsear JSON
    else if (client.address && typeof client.address === "string") {
      try {
        const parsed = JSON.parse(client.address);
        addressData = {
          zipCode: parsed.zipCode || parsed.cep || "",
          street: parsed.street || parsed.logradouro || "",
          number: parsed.number || parsed.numero || "",
          complement: parsed.complement || parsed.complemento || "",
          neighborhood: parsed.neighborhood || parsed.bairro || "",
          city: parsed.city || parsed.cidade || "",
          state: parsed.state || parsed.uf || "",
        };
      } catch {
        // Se não for JSON válido, deixar vazio
      }
    }

    setCurrentInvoice({
      ...currentInvoice,
      client: {
        name: client.name,
        documentNumber: client.cpf || "",
        documentType,
        email: client.email || "",
        phone: client.phone || "",
        address: addressData,
      },
    });

    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowClientDropdown(false);
    };

    if (showClientDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showClientDropdown]);

  // Sincronizar clientSearch com currentInvoice.client.name quando o modal abrir ou quando mudar externamente
  useEffect(() => {
    if (isOpen) {
      if (currentInvoice.client.name) {
        setClientSearch(currentInvoice.client.name);
      } else {
        setClientSearch("");
      }
    }
  }, [isOpen, currentInvoice.client.name]);


  // Adicionar item
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      ncm: "",
      subtotal: 0,
    };

    setCurrentInvoice({
      ...currentInvoice,
      items: [...currentInvoice.items, newItem],
    });
  };

  // Remover item
  const handleRemoveItem = (itemId: string) => {
    setCurrentInvoice({
      ...currentInvoice,
      items: currentInvoice.items.filter((item) => item.id !== itemId),
    });
  };

  // Atualizar item
  const handleUpdateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = currentInvoice.items.map((item) => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        // Calcular subtotal
        updatedItem.subtotal = updatedItem.quantity * updatedItem.unitPrice;
        return updatedItem;
      }
      return item;
    });

    setCurrentInvoice({
      ...currentInvoice,
      items: updatedItems,
    });
  };

  // Calcular total de impostos
  const calculateTaxesTotal = (subtotal: number) => {
    const { icms, iss, pis, cofins } = currentInvoice.taxes;
    const icmsAmount = (subtotal * icms) / 100;
    const issAmount = (subtotal * iss) / 100;
    const pisAmount = (subtotal * pis) / 100;
    const cofinsAmount = (subtotal * cofins) / 100;
    return icmsAmount + issAmount + pisAmount + cofinsAmount;
  };

  // Calcular total da nota (usado para exibição)
  const getTotalValue = () => {
    const itemsTotal = currentInvoice.items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxesTotal = calculateTaxesTotal(itemsTotal);
    return itemsTotal + taxesTotal;
  };

  // Validação antes de salvar
  const validateForm = (): boolean => {
    if (!currentInvoice.client.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome do cliente é obrigatório.",
        variant: "destructive",
      });
      setActiveTab("client");
      return false;
    }

    if (!currentInvoice.client.documentNumber.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "CPF/CNPJ do cliente é obrigatório.",
        variant: "destructive",
      });
      setActiveTab("client");
      return false;
    }

    if (currentInvoice.items.length === 0) {
      toast({
        title: "Campo obrigatório",
        description: "Adicione pelo menos um item à nota.",
        variant: "destructive",
      });
      setActiveTab("items");
      return false;
    }

    const hasInvalidItem = currentInvoice.items.some(
      (item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0
    );

    if (hasInvalidItem) {
      toast({
        title: "Item inválido",
        description: "Preencha todos os campos dos itens corretamente.",
        variant: "destructive",
      });
      setActiveTab("items");
      return false;
    }

    if (!currentInvoice.cfop) {
      toast({
        title: "Campo obrigatório",
        description: "CFOP é obrigatório.",
        variant: "destructive",
      });
      setActiveTab("fiscal");
      return false;
    }

    if (!currentInvoice.operationNature.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Natureza da Operação é obrigatória.",
        variant: "destructive",
      });
      setActiveTab("fiscal");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Calcular total final antes de salvar
      const totalValue = getTotalValue();
      
      // Sincronizar clientName e documentNumber com client
      const invoiceData: InvoiceFormData = {
        ...currentInvoice,
        clientName: currentInvoice.client.name,
        documentNumber: currentInvoice.client.documentNumber,
        totalValue,
      };

      await onSave(invoiceData);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a nota fiscal.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {currentInvoice.id ? "Editar Nota Fiscal" : "Emitir Nova Nota Fiscal"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para emitir ou salvar um rascunho.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="client">1. Cliente</TabsTrigger>
              <TabsTrigger value="items">2. Itens</TabsTrigger>
              <TabsTrigger value="fiscal">3. Dados Fiscais</TabsTrigger>
            </TabsList>

            {/* TAB 1: DADOS DO CLIENTE */}
            <TabsContent value="client" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {/* Tipo de Nota */}
              <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Nota <span className="text-red-500">*</span></Label>
                <Select
                  value={currentInvoice.type}
                    onValueChange={(value) =>
                      setCurrentInvoice({ ...currentInvoice, type: value as "NF-e" | "NFS-e" })
                    }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NF-e">NF-e (Produto)</SelectItem>
                    <SelectItem value="NFS-e">NFS-e (Serviço)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                {/* Dados Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                    <Label htmlFor="clientName">Nome do Cliente <span className="text-red-500">*</span></Label>
                    <div className="relative">
                <Input
                  id="clientName"
                        value={clientSearch}
                        onChange={(e) => handleClientSearchChange(e.target.value)}
                        onFocus={() => setShowClientDropdown(clientSearch.trim().length > 0)}
                        placeholder="Digite o nome do cliente..."
                        required
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
                                  handleClientSelect(client);
                                }}
                              >
                                <div className="font-medium">{client.name}</div>
                                {client.email && (
                                  <div className="text-xs text-gray-500">{client.email}</div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento <span className="text-red-500">*</span></Label>
                    <Select
                      value={currentInvoice.client.documentType}
                      onValueChange={(value) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          client: {
                            ...currentInvoice.client,
                            documentType: value as "cpf" | "cnpj",
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                    <Label htmlFor="documentNumber">CPF/CNPJ <span className="text-red-500">*</span></Label>
                <Input
                  id="documentNumber"
                      value={currentInvoice.client.documentNumber}
                      onChange={(e) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          client: {
                            ...currentInvoice.client,
                            documentNumber: e.target.value.replace(/\D/g, ""),
                          },
                        })
                      }
                      placeholder={
                        currentInvoice.client.documentType === "cpf"
                          ? "000.000.000-00"
                          : "00.000.000/0000-00"
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentInvoice.client.email}
                      onChange={(e) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          client: { ...currentInvoice.client, email: e.target.value },
                        })
                      }
                      placeholder="cliente@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={currentInvoice.client.phone}
                    onChange={(e) =>
                      setCurrentInvoice({
                        ...currentInvoice,
                        client: {
                          ...currentInvoice.client,
                          phone: e.target.value.replace(/\D/g, ""),
                        },
                      })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: ITENS */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Itens da Nota Fiscal</h3>
                <Button type="button" onClick={handleAddItem} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>

              {currentInvoice.items.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {currentInvoice.items.map((item, index) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-semibold">Item {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label>Descrição <span className="text-red-500">*</span></Label>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                handleUpdateItem(item.id, "description", e.target.value)
                              }
                              placeholder="Ex: Troca de óleo, Peça X, etc."
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Quantidade <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "quantity",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                required
                              />
                            </div>

              <div className="space-y-2">
                              <Label>Valor Unitário (R$) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                                min="0"
                  step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "unitPrice",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Subtotal (R$)</Label>
                              <Input
                                value={item.subtotal.toFixed(2).replace(".", ",")}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                          </div>

                          {currentInvoice.type === "NF-e" && (
                            <div className="space-y-2">
                              <Label>NCM (Nomenclatura Comum do Mercosul)</Label>
                              <Input
                                value={item.ncm || ""}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, "ncm", e.target.value)
                                }
                                placeholder="Ex: 8708.99.00"
                                maxLength={8}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Resumo dos Itens */}
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Subtotal dos Itens:</span>
                        <span className="font-semibold">
                          R$ {currentInvoice.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: DADOS FISCAIS */}
            <TabsContent value="fiscal" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cfop">CFOP <span className="text-red-500">*</span></Label>
                    <Select
                      value={currentInvoice.cfop}
                      onValueChange={(value) =>
                        setCurrentInvoice({ ...currentInvoice, cfop: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o CFOP" />
                      </SelectTrigger>
                      <SelectContent>
                        {cfopOptions.map((cfop) => (
                          <SelectItem key={cfop.value} value={cfop.value}>
                            {cfop.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operationNature">Natureza da Operação <span className="text-red-500">*</span></Label>
                    <Input
                      id="operationNature"
                      value={currentInvoice.operationNature}
                      onChange={(e) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          operationNature: e.target.value,
                        })
                      }
                      placeholder="Ex: Venda de mercadoria, Prestação de serviço"
                      required
                />
              </div>
            </div>

                {/* Impostos */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4">Impostos (%)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentInvoice.type === "NF-e" && (
                      <div className="space-y-2">
                        <Label htmlFor="icms">ICMS (%)</Label>
                        <Input
                          id="icms"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={currentInvoice.taxes.icms}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              taxes: {
                                ...currentInvoice.taxes,
                                icms: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {currentInvoice.type === "NFS-e" && (
                      <div className="space-y-2">
                        <Label htmlFor="iss">ISS (%)</Label>
                        <Input
                          id="iss"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={currentInvoice.taxes.iss}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              taxes: {
                                ...currentInvoice.taxes,
                                iss: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="pis">PIS (%)</Label>
                      <Input
                        id="pis"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={currentInvoice.taxes.pis}
                        onChange={(e) =>
                          setCurrentInvoice({
                            ...currentInvoice,
                            taxes: {
                              ...currentInvoice.taxes,
                              pis: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cofins">COFINS (%)</Label>
                      <Input
                        id="cofins"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={currentInvoice.taxes.cofins}
                        onChange={(e) =>
                          setCurrentInvoice({
                            ...currentInvoice,
                            taxes: {
                              ...currentInvoice.taxes,
                              cofins: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Informações Adicionais / Observações</Label>
                  <Textarea
                    id="additionalInfo"
                    value={currentInvoice.additionalInfo}
                    onChange={(e) =>
                      setCurrentInvoice({
                        ...currentInvoice,
                        additionalInfo: e.target.value,
                      })
                    }
                    placeholder="Informações complementares sobre a nota fiscal..."
                    rows={4}
                  />
          </div>

                {/* Resumo Final */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal dos Itens:</span>
                        <span>
                          R$ {currentInvoice.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total de Impostos:</span>
                        <span>
                          R$ {calculateTaxesTotal(currentInvoice.items.reduce((sum, item) => sum + item.subtotal, 0)).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Valor Total da Nota:</span>
                        <span className="text-primary">
                          R$ {getTotalValue().toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : currentInvoice.id ? (
                "Salvar Alterações"
              ) : (
                "Emitir Nota"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
