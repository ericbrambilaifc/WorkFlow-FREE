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
import { Plus, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// --- TIPOS ---

// MUDANÇA: Remover 'id' da interface (a API gera o ID)
interface InventoryItem {
    name: string;
    code: string;
    category: string;
    quantity: number;
    minQuantity: number;
    unitPrice: number;
    supplier: string;
    lastPurchase: string;
    location: string;
}

interface NewStockItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddItem: (item: InventoryItem) => void;
}

// --- COMPONENTE ---

const NewStockItemModal = ({ isOpen, onClose, onAddItem }: NewStockItemModalProps) => {
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSave = () => {
        // Validação básica
        if (!formData.name || !formData.code || formData.quantity < 0 || formData.unitPrice <= 0) {
            alert("Por favor, preencha todos os campos obrigatórios (Nome, Código, Preço > 0).");
            return;
        }

        // MUDANÇA: Não gerar ID aqui, a API fará isso
        const newItem: InventoryItem = {
            name: formData.name,
            code: formData.code,
            category: formData.category,
            quantity: formData.quantity,
            minQuantity: formData.minQuantity,
            unitPrice: formData.unitPrice,
            supplier: formData.supplier,
            lastPurchase: formData.lastPurchase.toISOString().split('T')[0],
            location: formData.location,
        };

        onAddItem(newItem);

        // Resetar o formulário
        setFormData({
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
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" /> Novo Item de Estoque
                    </DialogTitle>
                    <DialogDescription>
                        Preencha todas as informações sobre o produto.
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
                        <Label htmlFor="quantity">Quantidade Inicial em Estoque</Label>
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
                    <Button onClick={handleSave}>Salvar Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewStockItemModal;