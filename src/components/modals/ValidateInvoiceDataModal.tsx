import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ValidationError {
  field: string;
  message: string;
  itemId?: string;
  itemName?: string;
}

interface InvoiceDataForm {
  // Dados da empresa
  state_registration?: string;
  municipal_registration?: string;
  
  // Dados dos produtos (por item)
  produtos: Array<{
    itemId: string;
    itemName: string;
    ncm?: string;
    codigo_produto?: string;
  }>;
}

interface ValidateInvoiceDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  errors: string[];
  onConfirm: (data: InvoiceDataForm) => Promise<void>;
}

const ValidateInvoiceDataModal = ({
  open,
  onOpenChange,
  orderId,
  errors,
  onConfirm
}: ValidateInvoiceDataModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InvoiceDataForm>({
    produtos: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Parsear erros para extrair informações
  useEffect(() => {
    if (open && errors.length > 0) {
      const produtos: InvoiceDataForm['produtos'] = [];
      let stateReg = '';
      let municipalReg = '';

      errors.forEach(error => {
        // Inscrição Estadual
        if (error.includes('Inscrição Estadual')) {
          // Será preenchido pelo usuário
        }
        // Inscrição Municipal
        else if (error.includes('Inscrição Municipal')) {
          // Será preenchido pelo usuário
        }
        // Produto sem NCM
        else if (error.includes('sem NCM')) {
          const match = error.match(/Produto "([^"]+)" sem NCM/);
          if (match) {
            const itemName = match[1];
            const existing = produtos.find(p => p.itemName === itemName);
            if (existing) {
              existing.ncm = '';
            } else {
              produtos.push({
                itemId: '',
                itemName: itemName,
                ncm: ''
              });
            }
          }
        }
        // Produto sem código
        else if (error.includes('sem código')) {
          const match = error.match(/Produto "([^"]+)" sem código/);
          if (match) {
            const itemName = match[1];
            const existing = produtos.find(p => p.itemName === itemName);
            if (existing) {
              existing.codigo_produto = '';
            } else {
              produtos.push({
                itemId: '',
                itemName: itemName,
                codigo_produto: ''
              });
            }
          }
        }
      });

      setFormData({
        state_registration: stateReg,
        municipal_registration: municipalReg,
        produtos
      });
    }
  }, [open, errors]);

  const handleSubmit = async () => {
    // Validar campos obrigatórios
    const missingFields: string[] = [];
    
    if (errors.some(e => e.includes('Inscrição Estadual')) && !formData.state_registration?.trim()) {
      missingFields.push('Inscrição Estadual');
    }
    
    if (errors.some(e => e.includes('Inscrição Municipal')) && !formData.municipal_registration?.trim()) {
      missingFields.push('Inscrição Municipal');
    }
    
    formData.produtos.forEach(produto => {
      if (produto.ncm !== undefined && !produto.ncm.trim()) {
        missingFields.push(`NCM do produto "${produto.itemName}"`);
      }
      if (produto.codigo_produto !== undefined && !produto.codigo_produto.trim()) {
        missingFields.push(`Código do produto "${produto.itemName}"`);
      }
    });

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(formData);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao validar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduto = (index: number, field: 'ncm' | 'codigo_produto', value: string) => {
    const updated = [...formData.produtos];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, produtos: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] sm:max-w-[70vh] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Dados Faltantes para Emissão
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para continuar com a emissão das notas fiscais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Alguns dados obrigatórios estão faltando. Preencha-os antes de continuar.
            </AlertDescription>
          </Alert>

          {/* Inscrições da Empresa */}
          {(errors.some(e => e.includes('Inscrição Estadual')) || 
            errors.some(e => e.includes('Inscrição Municipal'))) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados da Empresa
              </h3>
              
              {errors.some(e => e.includes('Inscrição Estadual')) && (
                <div>
                  <Label htmlFor="state_registration">Inscrição Estadual (IE) *</Label>
                  <Input
                    id="state_registration"
                    value={formData.state_registration || ''}
                    onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                    placeholder="Ex: 123.456.789.012 ou ISENTO"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Necessária para emissão de NF-e (produtos). Configure em Configurações &gt; Configurações Fiscais para não precisar preencher toda vez.
                  </p>
                </div>
              )}

              {errors.some(e => e.includes('Inscrição Municipal')) && (
                <div>
                  <Label htmlFor="municipal_registration">Inscrição Municipal *</Label>
                  <Input
                    id="municipal_registration"
                    value={formData.municipal_registration || ''}
                    onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
                    placeholder="Ex: 12345678"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Necessária para emissão de NFS-e (serviços). Configure em Configurações &gt; Configurações Fiscais para não precisar preencher toda vez.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Dados dos Produtos */}
          {formData.produtos.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Dados dos Produtos
              </h3>
              
              {formData.produtos.map((produto, index) => (
                <div key={index} className="p-4 border rounded-md space-y-3 bg-muted/50">
                  <div className="font-medium text-sm">{produto.itemName}</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {produto.ncm !== undefined && (
                      <div>
                        <Label htmlFor={`ncm-${index}`}>NCM (Nomenclatura Comum do Mercosul) *</Label>
                        <Input
                          id={`ncm-${index}`}
                          value={produto.ncm}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                            updateProduto(index, 'ncm', value);
                          }}
                          placeholder="Ex: 87087000"
                          maxLength={8}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Código de 8 dígitos. Consulte em: <a href="https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/ncm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Receita Federal</a>
                        </p>
                      </div>
                    )}
                    
                    {produto.codigo_produto !== undefined && (
                      <div>
                        <Label htmlFor={`codigo-${index}`}>Código do Produto *</Label>
                        <Input
                          id={`codigo-${index}`}
                          value={produto.codigo_produto}
                          onChange={(e) => updateProduto(index, 'codigo_produto', e.target.value)}
                          placeholder="Ex: PROD-001 ou código interno"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Código interno do produto no seu sistema
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Confirmar e Emitir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ValidateInvoiceDataModal;

