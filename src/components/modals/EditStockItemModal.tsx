import { ptBR } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { StockItem } from "@/contexts/AppContext";

interface EditStockItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: StockItem | null;
}

const EditStockItemModal = ({ isOpen, onClose, item }: EditStockItemModalProps) => {
    const { updateStockItem } = useApp();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        location: "",
        quantity: 0,
        minQuantity: 0,
        unitPrice: 0.00,
        supplier: "",
        category: "Ignição",
        lastPurchase: new Date(),
    });

    // Preencher formulário quando item mudar
    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || "",
                code: item.code || "",
                location: item.location || "",
                quantity: item.quantity || 0,
                minQuantity: item.minQuantity || 0,
                unitPrice: Number(item.unitPrice || 0),
                supplier: item.supplier || "",
                category: item.category || "Ignição",
                lastPurchase: item.lastPurchase ? new Date(item.lastPurchase) : new Date(),
            });
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        if (!item) return;

        // Validação básica
        if (!formData.name || !formData.code || formData.quantity < 0 || formData.unitPrice <= 0) {
            toast({
                title: "Erro",
                description: "Por favor, preencha todos os campos obrigatórios (Nome, Código, Preço > 0).",
                variant: "destructive"
            });
            return;
        }

        try {
            await updateStockItem(item.id, {
                name: formData.name,
                code: formData.code,
                category: formData.category,
                quantity: formData.quantity,
                minQuantity: formData.minQuantity,
                unitPrice: formData.unitPrice,
                supplier: formData.supplier,
                lastPurchase: formData.lastPurchase.toISOString().split('T')[0],
                location: formData.location,
            });

            toast({
                title: "Sucesso!",
                description: `O item "${formData.name}" foi atualizado com sucesso.`,
            });

            onClose();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível atualizar o item. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" /> Editar Item de Estoque
                    </DialogTitle>
                    <DialogDescription>
                        Atualize as informações do produto.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
                    {/* Linha 1: Nome e Código */}
                    <div className="space-y-1">
                        <Label htmlFor="name">Nome do Item</Label>
                        <Input id="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="code">Código/SKU</Label>
                        <Input id="code" value={formData.code} onChange={handleChange} required />
                    </div>

                    {/* Linha 2: Categoria e Localização */}
                    <div className="space-y-1">
                        <Label htmlFor="category">Categoria</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Selecione a Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ignição">Ignição</SelectItem>
                                <SelectItem value="Filtros">Filtros</SelectItem>
                                <SelectItem value="Lubrificantes">Lubrificantes</SelectItem>
                                <SelectItem value="Freios">Freios</SelectItem>
                                <SelectItem value="Pneus">Pneus</SelectItem>
                                <SelectItem value="Baterias">Baterias</SelectItem>
                                <SelectItem value="Fluidos">Fluidos</SelectItem>
                                <SelectItem value="Correias">Correias</SelectItem>
                                <SelectItem value="Suspensão">Suspensão</SelectItem>
                                <SelectItem value="Iluminação">Iluminação</SelectItem>
                                <SelectItem value="Diversos">Diversos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="location">Localização (Ex: Prateleira A-20)</Label>
                        <Input id="location" value={formData.location} onChange={handleChange} />
                    </div>

                    {/* Linha 3: Preço Unitário e Fornecedor */}
                    <div className="space-y-1">
                        <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
                        <Input
                            id="unitPrice"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.unitPrice}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="supplier">Fornecedor</Label>
                        <Input id="supplier" value={formData.supplier} onChange={handleChange} />
                    </div>

                    {/* Linha 4: Quantidade Inicial e Mínima */}
                    <div className="space-y-1">
                        <Label htmlFor="quantity">Quantidade em Estoque</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min={0}
                            value={formData.quantity}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="minQuantity">Quantidade Mínima de Alerta</Label>
                        <Input
                            id="minQuantity"
                            type="number"
                            min={0}
                            value={formData.minQuantity}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Linha 5: Data da Última Compra */}
                    <div className="space-y-1 col-span-2">
                        <Label htmlFor="lastPurchase">Data da Última Compra</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !formData.lastPurchase && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.lastPurchase ? (
                                        format(formData.lastPurchase, "PPP", { locale: ptBR })
                                    ) : (
                                        <span>Selecione uma data</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.lastPurchase}
                                    onSelect={(date) => {
                                        if (date) {
                                            setFormData((prev) => ({ ...prev, lastPurchase: date }));
                                        }
                                    }}
                                    locale={ptBR}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditStockItemModal;

