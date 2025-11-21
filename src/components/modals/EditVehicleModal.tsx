import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Vehicle } from "@/contexts/AppContext";

interface EditVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

const EditVehicleModal = ({ open, onOpenChange, vehicle }: EditVehicleModalProps) => {
  const { updateVehicle, clients } = useApp();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    plateFormat: 'ABC-1234' as 'ABC-1234' | 'XXX0X00',
    clientId: ''
  });

  // Preencher formulário quando veículo mudar
  useEffect(() => {
    if (vehicle) {
      // Detectar formato da placa
      const plateFormat = vehicle.plate.includes('-') ? 'ABC-1234' : 'XXX0X00';
      
      setFormData({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        plateFormat,
        clientId: vehicle.clientId
      });
    }
  }, [vehicle]);

  // Função para formatar placa
  const formatPlate = (value: string, format: string) => {
    const cleanValue = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    if (format === 'ABC-1234') {
      // Formato ABC-1234
      if (cleanValue.length <= 3) {
        return cleanValue;
      } else if (cleanValue.length <= 7) {
        return cleanValue.slice(0, 3) + '-' + cleanValue.slice(3);
      } else {
        return cleanValue.slice(0, 3) + '-' + cleanValue.slice(3, 7);
      }
    } else {
      // Formato XXX0X00
      if (cleanValue.length <= 7) {
        return cleanValue;
      } else {
        return cleanValue.slice(0, 7);
      }
    }
  };

  const handlePlateChange = (value: string) => {
    const formatted = formatPlate(value, formData.plateFormat);
    setFormData({ ...formData, plate: formatted });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicle) return;

    if (!formData.brand || !formData.model || !formData.plate || !formData.clientId) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    updateVehicle(vehicle.id, formData);

    toast({
      title: "Sucesso",
      description: "Veículo atualizado com sucesso!",
    });

    onOpenChange(false);
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client">Cliente</Label>
              <Select
                value={String(formData.clientId)}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Honda, Toyota, Ford..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Civic, Corolla, Ka..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min="1990"
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plateFormat">Formato da Placa</Label>
              <Select
                value={formData.plateFormat}
                onValueChange={(value: 'ABC-1234' | 'XXX0X00') => {
                  setFormData({ ...formData, plateFormat: value, plate: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABC-1234">ABC-1234 (Antigo)</SelectItem>
                  <SelectItem value="XXX0X00">XXX0X00 (Mercosul)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => handlePlateChange(e.target.value)}
                placeholder={formData.plateFormat === 'ABC-1234' ? 'ABC-1234' : 'XXX0X00'}
                maxLength={formData.plateFormat === 'ABC-1234' ? 8 : 7}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVehicleModal;