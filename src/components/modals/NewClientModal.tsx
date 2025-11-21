import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Car, User, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useCEP } from "@/hooks/useCEP";

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewClientModal = ({ open, onOpenChange }: NewClientModalProps) => {
  const { addClient, addClientWithVehicle } = useApp();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: {
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    }
  });

  // Hook para buscar CEP via backend
  const { data: cepData, loading: isLoadingCep, error: cepError, buscar: buscarCEP } = useCEP();

  // Estados do Brasil
  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const [includeVehicle, setIncludeVehicle] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: ''
  });

  // Buscar CEP via backend
  const handleSearchCep = async (zipCode: string) => {
    const cleanCep = zipCode.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    const endereco = await buscarCEP(cleanCep);

    if (endereco) {
      // Preencher campos do formulário com os dados retornados
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          zipCode: cleanCep,
          street: endereco.logradouro || "",
          neighborhood: endereco.bairro || "",
          city: endereco.localidade || "",
          state: endereco.uf || "",
        },
      });
    } else if (cepError) {
      // Mostrar erro se houver
      toast({
        title: "Erro ao buscar CEP",
        description: cepError,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Erro",
        description: "Nome, email e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (includeVehicle && (!vehicleData.brand || !vehicleData.model || !vehicleData.plate)) {
      toast({
        title: "Erro",
        description: "Todos os campos do veículo são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Converter endereço para JSON string para salvar no banco
      const addressJson = JSON.stringify(formData.address);
      
      const clientData = {
        ...formData,
        address: addressJson
      };

      // ✅ Usar o novo endpoint que cria cliente + veículo numa única chamada
      if (includeVehicle) {
        await addClientWithVehicle(clientData, vehicleData);
        toast({
          title: "Sucesso",
          description: "Cliente e veículo adicionados com sucesso!",
        });
      } else {
        await addClient(clientData);
        toast({
          title: "Sucesso",
          description: "Cliente adicionado com sucesso!",
        });
      }

      // Resetar formulário
      setFormData({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        address: {
          zipCode: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
        }
      });
      setVehicleData({
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        plate: ''
      });
      setIncludeVehicle(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar cliente",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      address: {
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      }
    });
    setVehicleData({
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: ''
    });
    setIncludeVehicle(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Informações do Cliente */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h3 className="font-medium">Informações do Cliente</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setFormData({ ...formData, cpf: value });
                      }
                    }}
                    placeholder="123.456.789-01"
                    maxLength={14}
                  />
                </div>
              </div>
              
              {/* Endereço */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-4">Endereço</h3>
                <div className="grid gap-4">
                  <div className="flex gap-2">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="zipCode">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="zipCode"
                          value={formData.address.zipCode}
                          onChange={(e) => {
                            const zipCode = e.target.value.replace(/\D/g, "");
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                zipCode,
                              },
                            });
                            if (zipCode.length === 8) {
                              handleSearchCep(zipCode);
                            }
                          }}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {isLoadingCep && (
                          <Loader2 className="h-4 w-4 animate-spin mt-8" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Logradouro</Label>
                      <Input
                        id="street"
                        value={formData.address.street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: {
                              ...formData.address,
                              street: e.target.value,
                            },
                          })
                        }
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.address.number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: {
                              ...formData.address,
                              number: e.target.value,
                            },
                          })
                        }
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.address.complement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            complement: e.target.value,
                          },
                        })
                      }
                      placeholder="Apto, Bloco, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.address.neighborhood}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: {
                              ...formData.address,
                              neighborhood: e.target.value,
                            },
                          })
                        }
                        placeholder="Centro"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.address.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: {
                              ...formData.address,
                              city: e.target.value,
                            },
                          })
                        }
                        placeholder="São Paulo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">UF</Label>
                    <Select
                      value={formData.address.state}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          address: {
                            ...formData.address,
                            state: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox para incluir veículo */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeVehicle"
                checked={includeVehicle}
                onCheckedChange={(checked) => setIncludeVehicle(checked as boolean)}
              />
              <Label htmlFor="includeVehicle">Incluir veículo</Label>
            </div>

            {/* Informações do Veículo */}
            {includeVehicle && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <h3 className="font-medium">Informações do Veículo</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="brand">Marca</Label>
                      <Input
                        id="brand"
                        value={vehicleData.brand}
                        onChange={(e) => setVehicleData({ ...vehicleData, brand: e.target.value })}
                        placeholder="Honda, Toyota, Ford..."
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="model">Modelo</Label>
                      <Input
                        id="model"
                        value={vehicleData.model}
                        onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                        placeholder="Civic, Corolla, Ka..."
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="year">Ano</Label>
                      <Input
                        id="year"
                        type="number"
                        value={vehicleData.year}
                        onChange={(e) => setVehicleData({ ...vehicleData, year: parseInt(e.target.value) })}
                        min="1990"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="plate">Placa</Label>
                      <Input
                        id="plate"
                        value={vehicleData.plate}
                        onChange={(e) => setVehicleData({ ...vehicleData, plate: e.target.value.toUpperCase() })}
                        placeholder="ABC-1234"
                        maxLength={8}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar Cliente</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewClientModal;