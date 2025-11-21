import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Expense } from "@/contexts/AppContext";

interface EditExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}

const EditExpenseModal = ({ open, onOpenChange, expense }: EditExpenseModalProps) => {
  const { updateExpense } = useApp();
  const { toast } = useToast();

  // Função para calcular status baseado na data de vencimento
  const calculateStatusFromDate = (date: Date, currentStatus: 'paid' | 'pending' | 'overdue'): 'paid' | 'pending' | 'overdue' => {
    // Se já está pago, mantém como pago
    if (currentStatus === 'paid') {
      return 'paid';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return 'overdue';
    }
    return 'pending';
  };

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    date: new Date(),
    paymentMethod: '',
    status: 'pending' as 'paid' | 'pending' | 'overdue',
    notes: ''
  });

  // Preencher formulário quando despesa mudar ou quando o modal abrir
  useEffect(() => {
    if (expense && open) {
      const expenseDate = expense.date ? new Date(expense.date) : new Date();
      // Recalcular status baseado na data, mas manter como pago se já estiver pago
      const calculatedStatus = calculateStatusFromDate(expenseDate, expense.status);
      
      setFormData({
        description: expense.description || '',
        amount: Number(expense.amount) || 0,
        category: expense.category || '',
        date: expenseDate,
        paymentMethod: expense.paymentMethod || '',
        status: calculatedStatus,
        notes: expense.notes || ''
      });
    } else if (!open) {
      // Resetar formulário quando o modal fechar
      setFormData({
        description: '',
        amount: 0,
        category: '',
        date: new Date(),
        paymentMethod: '',
        status: 'pending',
        notes: ''
      });
    }
  }, [expense?.id, open, expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expense) return;

    if (!formData.description || !formData.amount || !formData.category || !formData.paymentMethod) {
      toast({
        title: "Erro",
        description: "Todos os campos obrigatórios devem ser preenchidos",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateExpense(expense.id, {
        ...formData,
        date: format(formData.date, 'yyyy-MM-dd'),
        // Se for uma despesa automática, remover o flag automático ao editar
        ...(expense.isAutomatic && { isAutomatic: false, autoType: null })
      });

      toast({
        title: "Sucesso",
        description: "Despesa atualizada com sucesso!",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar despesa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const categories = [
    'Aluguel',
    'Energia',
    'Água',
    'Internet',
    'Telefone',
    'Combustível',
    'Manutenção',
    'Equipamentos',
    'Fornecedores',
    'Impostos',
    'Salários',
    'Folha de Pagamento',
    'Estoque',
    'Outros'
  ];

  const paymentMethods = [
    'Dinheiro',
    'PIX',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Transferência',
    'Boleto',
    'Cheque',
    'Sistema',
    'Folha de Pagamento'
  ];

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição <span className="text-red-500">*</span></Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Aluguel da oficina"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Valor (R$) <span className="text-red-500">*</span></Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                disabled={expense?.isAutomatic}
                className={expense?.isAutomatic ? "bg-muted cursor-not-allowed" : ""}
              />
              {expense?.isAutomatic && (
                <p className="text-xs text-muted-foreground">
                  O valor de despesas automáticas não pode ser alterado manualmente.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria <span className="text-red-500">*</span></Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Data de Vencimento <span className="text-red-500">*</span></Label>
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
                        const newStatus = calculateStatusFromDate(date, formData.status);
                        setFormData({ ...formData, date, status: newStatus });
                      }
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento <span className="text-red-500">*</span></Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'paid' | 'pending' | 'overdue') => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.status === 'overdue' 
                  ? 'Esta despesa está vencida' 
                  : formData.status === 'pending'
                  ? 'Esta despesa está pendente'
                  : 'Esta despesa foi paga'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
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

export default EditExpenseModal;