import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NewStockItemModal from "./modals/NewStockItemModal";
import EditStockItemModal from "./modals/EditStockItemModal";
import {
    Plus, Search, Package, AlertTriangle, TrendingDown,
    Filter, Edit, Trash2, History, DollarSign, Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from 'xlsx';

const detectCategory = (itemName: string): string => {
    const name = itemName.toLowerCase();
    if (name.includes('óleo') || name.includes('oleo')) return 'Lubrificantes';
    if (name.includes('filtro')) return 'Filtros';
    if (name.includes('pneu')) return 'Pneus';
    if (name.includes('bateria')) return 'Baterias';
    if (name.includes('pastilha') || name.includes('freio')) return 'Freios';
    if (name.includes('fluido')) return 'Fluidos';
    if (name.includes('vela') || name.includes('ignição') || name.includes('ignicao')) return 'Ignição';
    if (name.includes('correia')) return 'Correias';
    if (name.includes('amortecedor')) return 'Suspensão';
    if (name.includes('lâmpada') || name.includes('lampada')) return 'Iluminação';
    return 'Diversos';
};

const Inventory = () => {
    const { toast } = useToast();
    const { canEdit } = usePermissions();

    // MUDANÇA: usar o contexto ao invés de estado local
    const {
        stockItems: inventory,
        purchaseHistory,
        addStockItem,
        deleteStockItem,
        bulkImportStockItems,
    } = useApp();

    // Debug: log quando o inventário mudar
    console.log('📦 Inventory component - stockItems:', {
        count: inventory.length,
        items: inventory
    });

    // Debug: verificar purchaseHistory quando mudar
    useEffect(() => {
        console.log('🛒 Purchase History no componente Stock:', {
            count: purchaseHistory?.length || 0,
            hasData: purchaseHistory && purchaseHistory.length > 0,
            firstItem: purchaseHistory && purchaseHistory.length > 0 ? purchaseHistory[0] : null,
            allItems: purchaseHistory || []
        });
    }, [purchaseHistory]);

    const [activeTab, setActiveTab] = useState<"inventory" | "history">("inventory");
    const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
    const [stockFilter, setStockFilter] = useState<string>("Todos");

    const getStockStatus = (item: any) => {
        const percentage = (item.quantity / item.minQuantity) * 100;
        if (percentage <= 50) return { status: "critical", label: "Crítico", color: "destructive" };
        if (percentage <= 100) return { status: "low", label: "Baixo", color: "secondary" };
        return { status: "ok", label: "Normal", color: "default" };
    };

    function normalizeText(text: string): string {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    const filteredInventory = inventory.filter(item => {
        const normalizedSearch = normalizeText(searchTerm);
        const matchesSearch = [item.name, item.code, item.category, item.supplier].some(
            field => normalizeText(field || '').includes(normalizedSearch)
        );
        const matchesCategory = categoryFilter === "Todas" || item.category === categoryFilter;

        let matchesStock = true;
        if (stockFilter === "Crítico") {
            matchesStock = getStockStatus(item).status === "critical";
        } else if (stockFilter === "Baixo") {
            matchesStock = getStockStatus(item).status === "low";
        } else if (stockFilter === "Normal") {
            matchesStock = getStockStatus(item).status === "ok";
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    // MUDANÇA: handleAddItem agora é async e chama a API
    const handleAddItem = async (newItem: any) => {
        try {
            await addStockItem(newItem);
            setIsNewItemModalOpen(false);
            toast({
                title: "Sucesso!",
                description: `O item "${newItem.name}" foi adicionado ao estoque.`,
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível adicionar o item. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    // Categorias fixas do sistema
    const fixedCategories = [
        "Peças de Motor",
        "Sistema de Freios",
        "Suspensão e Direção",
        "Sistema Elétrico",
        "Transmissão",
        "Pneus e Rodas",
        "Escapamento",
        "Ar Condicionado",
        "Acessórios e Consumíveis"
    ];
    
    // Categorias dinâmicas dos itens existentes
    const dynamicCategories = Array.from(new Set(inventory.map(item => item.category)));
    
    // Combinar categorias fixas com dinâmicas, removendo duplicatas
    const allCategories = ["Todas", ...new Set([...fixedCategories, ...dynamicCategories])];
    const categories = allCategories;

    const categoryOptions = categories.map(cat => ({
        value: cat,
        label: cat,
        count: cat === "Todas" ? inventory.length : inventory.filter(i => i.category === cat).length
    }));

    const stockOptions = [
        { value: "Todos", label: "Todos", count: inventory.length },
        {
            value: "Crítico",
            label: "Crítico",
            count: inventory.filter(i => getStockStatus(i).status === "critical").length
        },
        {
            value: "Baixo",
            label: "Baixo",
            count: inventory.filter(i => getStockStatus(i).status === "low").length
        },
        {
            value: "Normal",
            label: "Normal",
            count: inventory.filter(i => getStockStatus(i).status === "ok").length
        }
    ];

    // Valor total investido no estoque (soma de TODAS as compras)
    // IMPORTANTE: Este valor representa o DINHEIRO JÁ GASTO em compras
    // NÃO diminui quando itens são vendidos/usados - apenas a quantidade física diminui
    // O dinheiro já foi investido, independente de quanto ainda está em estoque
    const totalInventoryValue = (purchaseHistory || []).reduce((sum, purchase) => {
        // Tentar múltiplos campos possíveis do backend
        const purchaseTotal = Number(
            purchase.totalAmount || 
            purchase.totalPrice || 
            (purchase.quantity * purchase.unitPrice) || 
            0
        );
        return sum + purchaseTotal;
    }, 0);
    
    // Valor da quantidade atual em estoque (opcional - para referência)
    const currentStockValue = inventory.reduce((sum, item) => {
        const itemValue = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        return sum + itemValue;
    }, 0);
    
    // Debug: verificar cálculo do valor total
    console.log('💰 Valor Total Investido no Estoque:', {
        totalInvested: totalInventoryValue,
        currentStockValue: currentStockValue,
        purchaseHistoryCount: purchaseHistory?.length || 0,
        purchaseHistorySample: purchaseHistory?.slice(0, 2) || [],
        calculatedFrom: 'sum of all purchases (investment)'
    });
    const criticalItems = inventory.filter(i => getStockStatus(i).status === "critical").length;
    const lowStockItems = inventory.filter(i => getStockStatus(i).status === "low").length;

    // MUDANÇA: handleDeleteItem agora é async e chama a API
    const handleDeleteItem = async (itemId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este item do estoque?')) {
            try {
                await deleteStockItem(itemId);
                toast({
                    title: "Item Excluído",
                    description: "Item removido do estoque com sucesso.",
                });
            } catch (error) {
                toast({
                    title: "Erro",
                    description: "Não foi possível excluir o item.",
                    variant: "destructive"
                });
            }
        }
    };

    // MUDANÇA: handleFileImport agora é async e usa bulkImportStockItems
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const fixEncoding = (text: string): string => {
                    if (!text || typeof text !== 'string') return text;

                    const byteMap: { [key: string]: string } = {
                        'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä', 'Ã¥': 'å',
                        'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
                        'Ã­': 'í', 'Ã¬': 'ì', 'Ã®': 'î', 'Ã¯': 'ï',
                        'Ã³': 'ó', 'Ã²': 'ò', 'Ã´': 'ô', 'Ãµ': 'õ', 'Ã¶': 'ö',
                        'Ãº': 'ú', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü',
                        'Ã§': 'ç', 'Ã±': 'ñ', 'Ã½': 'ý', 'Ã¿': 'ÿ',
                        'Ã\x81': 'Á', 'Ã\x80': 'À', 'Ã\x82': 'Â', 'Ã\x83': 'Ã', 'Ã\x84': 'Ä', 'Ã\x85': 'Å',
                        'Ã\x89': 'É', 'Ã\x88': 'È', 'Ã\x8A': 'Ê', 'Ã\x8B': 'Ë',
                        'Ã\x8D': 'Í', 'Ã\x8C': 'Ì', 'Ã\x8E': 'Î', 'Ã\x8F': 'Ï',
                        'Ã\x93': 'Ó', 'Ã\x92': 'Ò', 'Ã\x94': 'Ô', 'Ã\x95': 'Õ', 'Ã\x96': 'Ö',
                        'Ã\x9A': 'Ú', 'Ã\x99': 'Ù', 'Ã\x9B': 'Û', 'Ã\x9C': 'Ü',
                        'Ã\x87': 'Ç', 'Ã\x91': 'Ñ', 'Ã\x9D': 'Ý',
                        'Â°': '°', 'Âª': 'ª', 'Âº': 'º', 'Â§': '§',
                        'Â¡': '¡', 'Â¿': '¿', 'Â«': '«', 'Â»': '»',
                        'Â¢': '¢', 'Â£': '£', 'Â¤': '¤', 'Â¥': '¥',
                        'Â¦': '¦', 'Â¨': '¨', 'Â©': '©', 'Â®': '®',
                        'Â±': '±', 'Â²': '²', 'Â³': '³', 'Âµ': 'µ',
                        'Â¶': '¶', 'Â·': '·', 'Â¹': '¹', 'Â¼': '¼',
                        'Â½': '½', 'Â¾': '¾', 'Ã\x97': '×', 'Ã\x9F': 'ß',
                        'Ã\x9E': 'Þ', 'Ã¾': 'þ', 'Ã°': 'ð', 'Ã\x90': 'Ð',
                        'Ã¦': 'æ', 'Ã\x86': 'Æ',
                        'Å\x92': 'Œ', 'Å\x93': 'œ',
                        'Å ': 'Š', 'Å¡': 'š',
                        'Å½': 'Ž', 'Å¾': 'ž',
                        'ï¿½': '', '\ufffd': '', 'Â': ''
                    };

                    let result = text;
                    for (const [wrong, correct] of Object.entries(byteMap)) {
                        if (result.includes(wrong)) {
                            result = result.split(wrong).join(correct);
                        }
                    }
                    return result;
                };

                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    toast({
                        title: "Arquivo Vazio",
                        description: "O arquivo não contém dados para importação.",
                        variant: "destructive"
                    });
                    event.target.value = '';
                    return;
                }

                const firstRow: any = jsonData[0];
                const columnNames = Object.keys(firstRow);

                const descricaoCol = columnNames[0];
                const codigoCol = columnNames[1];
                const localCol = columnNames[2];
                const quantidadeCol = columnNames[3];
                const precoCol = columnNames[4];
                const fornecedorCol = columnNames[6];
                const dataCol = columnNames[7];

                const parseExcelDate = (dateValue: any): string => {
                    if (!dateValue) return new Date().toISOString().split('T')[0];
                    if (typeof dateValue === 'number') {
                        const date = new Date((dateValue - 25569) * 86400 * 1000);
                        return date.toISOString().split('T')[0];
                    }
                    if (typeof dateValue === 'string') {
                        const parts = dateValue.split('/');
                        if (parts.length === 3) {
                            const [day, month, year] = parts;
                            return new Date(`${year}-${month}-${day}`).toISOString().split('T')[0];
                        }
                    }
                    return new Date().toISOString().split('T')[0];
                };

                const importedItems = jsonData.map((row: any) => {
                    const name = fixEncoding(row[descricaoCol] || '');
                    const code = fixEncoding(row[codigoCol] || '');
                    const location = fixEncoding(row[localCol] || '');
                    const supplier = fixEncoding(row[fornecedorCol] || '');
                    const quantity = Number(row[quantidadeCol]) || 0;
                    const unitPrice = Number(row[precoCol]) || 0;
                    const lastPurchase = parseExcelDate(row[dataCol]);

                    return {
                        name,
                        code,
                        location,
                        quantity,
                        minQuantity: Math.floor(quantity * 0.3) || 10,
                        unitPrice,
                        supplier,
                        lastPurchase,
                        category: detectCategory(name)
                    };
                });

                // MUDANÇA: usar bulkImportStockItems do contexto
                const result = await bulkImportStockItems(importedItems);

                toast({
                    title: "Importação Concluída!",
                    description: `${result.success} item(ns) adicionados. ${result.errors.length} erro(s).`,
                });

                event.target.value = '';

            } catch (error) {
                console.error("Erro ao importar arquivo:", error);
                toast({
                    title: "Erro na Importação",
                    description: `Erro: ${error}`,
                    variant: "destructive"
                });
            }
        };

        reader.onerror = () => {
            toast({
                title: "Erro ao Ler Arquivo",
                description: "Não foi possível ler o arquivo selecionado.",
                variant: "destructive"
            });
        };

        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6">
            <NewStockItemModal
                isOpen={isNewItemModalOpen}
                onClose={() => setIsNewItemModalOpen(false)}
                onAddItem={handleAddItem}
            />
            <EditStockItemModal
                isOpen={isEditItemModalOpen}
                onClose={() => {
                    setIsEditItemModalOpen(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Estoque & Peças</h1>
                    <p className="text-muted-foreground">Gerencie o estoque de peças e materiais</p>
                </div>
                <div className="flex gap-2">
                    <input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileImport}
                        className="hidden"
                    />
                    {canEdit('stock') && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => document.getElementById('file-upload')?.click()}
                                title="Importar Arquivo"
                            >
                                <Upload className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Importar Arquivo</span>
                            </Button>
                            <Button 
                                size="sm"
                                onClick={() => setIsNewItemModalOpen(true)}
                                title="Adicionar Item"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Adicionar Item</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-2">
                    <div className="flex gap-2">
                        <Button
                            variant={activeTab === "inventory" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("inventory")}
                            className="flex-1"
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Estoque
                        </Button>
                        <Button
                            variant={activeTab === "history" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab("history")}
                            className="flex-1"
                        >
                            <History className="h-4 w-4 mr-2" />
                            Histórico de Compras
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total de Itens</p>
                                <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
                            </div>
                            <Package className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Estoque Crítico</p>
                                <p className="text-2xl font-bold text-foreground">{criticalItems}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-yellow-50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
                                <p className="text-2xl font-bold text-foreground">{lowStockItems}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Valor Total Investido</p>
                                <p className="text-2xl font-bold text-foreground">
                                    R$ {totalInventoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {purchaseHistory && purchaseHistory.length > 0 
                                        ? `Soma de ${purchaseHistory.length} compra(s) realizada(s)`
                                        : 'Nenhuma compra registrada ainda'}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {activeTab === "inventory" && (
                <>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    placeholder="Buscar por nome, código ou fornecedor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">Filtrar por Categoria:</span>
                                </div>
                                <Select
                                    value={categoryFilter}
                                    onValueChange={setCategoryFilter}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filtrar por Categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                                <span className="ml-2 text-xs opacity-50">({option.count})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">Filtrar por Estoque:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {stockOptions.map((option) => (
                                        <Button
                                            key={option.value}
                                            variant={stockFilter === option.value ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setStockFilter(option.value)}
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
                    </div>

                    <div className="grid gap-4">
                        {filteredInventory.length === 0 ? (
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-8 text-center">
                                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">
                                        {searchTerm || categoryFilter !== "Todas" || stockFilter !== "Todos"
                                            ? "Nenhum item encontrado com os filtros aplicados"
                                            : "Nenhum item no estoque"}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredInventory.map((item) => {
                                const stockStatus = getStockStatus(item);
                                return (
                                    <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                                        {item.name}
                                                        <Badge
                                                            variant={stockStatus.color as "default" | "secondary" | "destructive" | "outline"}
                                                            className="flex items-center gap-1"
                                                        >
                                                            {stockStatus.status === "critical" && <AlertTriangle className="h-3 w-3" />}
                                                            {stockStatus.label}
                                                        </Badge>
                                                        <Badge variant="outline">{item.category}</Badge>
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Código: {item.code} • Local: {item.location}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {canEdit('stock') && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm" 
                                                                title="Editar"
                                                                onClick={() => {
                                                                    setSelectedItem(item);
                                                                    setIsEditItemModalOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                title="Excluir"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Quantidade</p>
                                                    <p className="text-lg font-bold text-foreground">{item.quantity}</p>
                                                    <p className="text-xs text-muted-foreground">Mín: {item.minQuantity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Preço Unitário</p>
                                                    <p className="text-lg font-bold text-gray-600">
                                                        R$ {Number(item.unitPrice || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Valor Total</p>
                                                    <p className="text-lg font-bold text-blue-600">
                                                        R$ {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Fornecedor</p>
                                                    <p className="text-sm text-foreground">{item.supplier}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Última Compra</p>
                                                    <p className="text-sm text-foreground">
                                                        {new Date(item.lastPurchase).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>

                                            
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {activeTab === "history" && (
                <div className="grid gap-4">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Histórico de Compras
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {purchaseHistory.map((purchase) => (
                                    <div key={purchase.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{purchase.itemName}</p>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Package className="h-3 w-3" />
                                                    {purchase.quantity} unidades
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <History className="h-3 w-3" />
                                                    {new Date(purchase.date).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span>{purchase.supplier}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Valor Unit.</p>
                                            <p className="text-sm font-medium">R$ {Number(purchase.unitPrice || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="text-right ml-6">
                                            <p className="text-sm text-muted-foreground">Total</p>
                                            <p className="text-lg font-bold text-green-600">R$ {Number((purchase as any).totalPrice || purchase.totalAmount || 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Inventory;