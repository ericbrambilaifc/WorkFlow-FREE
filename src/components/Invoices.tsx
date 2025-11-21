import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, FileText, DollarSign,
  User, CheckCircle2, XCircle,
  ClipboardList, Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp, Invoice as InvoiceType } from "@/contexts/AppContext";
import InvoiceModal from "@/components/modals/InvoiceModal";
import { VersionRestrictionNotice } from "@/components/VersionRestrictionNotice";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ncm?: string;
  subtotal: number;
}

export interface InvoiceFormData {
  id: string | null;
  type: "NF-e" | "NFS-e";
  clientName: string;
  documentNumber: string;
  issueDate: string;
  totalValue: number;
  status: "Rascunho" | "Emitida" | "Autorizada" | "Cancelada" | "Rejeitada";
  key: string;
  xmlLink?: string;
  items: InvoiceItem[];
  cfop: string;
  operationNature: string;
  taxes: {
    icms: number;
    iss: number;
    pis: number;
    cofins: number;
  };
  client: {
    name: string;
    documentNumber: string;
    documentType: "cpf" | "cnpj";
    email: string;
    phone: string;
    address: {
      zipCode: string;
      street: string;
      number: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
  additionalInfo: string;
}

export type InvoiceLocal = InvoiceFormData & {
  id: string;
};

export const initialNewInvoiceData: InvoiceFormData = {
  id: null,
  type: "NF-e",
  clientName: "",
  documentNumber: "",
  issueDate: new Date().toISOString().split('T')[0],
  totalValue: 0.00,
  status: "Rascunho",
  key: "",
  items: [],
  cfop: "",
  operationNature: "",
  taxes: {
    icms: 0,
    iss: 0,
    pis: 0,
    cofins: 0,
  },
  client: {
    name: "",
    documentNumber: "",
    documentType: "cpf",
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
  additionalInfo: "",
};

// MOCK_INVOICES removido - agora usa dados do backend
const MOCK_INVOICES: InvoiceLocal[] = [
  {
    id: "N1",
    clientName: "João Silva",
    documentNumber: "12345678900",
    key: "43231170000000000000000000000000000000000001",
    type: "NFS-e",
    issueDate: new Date().toISOString().split('T')[0],
    totalValue: 350.50,
    status: "Autorizada",
    xmlLink: "/xml/nfs_12345.xml",
    items: [],
    cfop: "5933",
    operationNature: "Prestação de serviço",
    taxes: { icms: 0, iss: 5, pis: 0.65, cofins: 3 },
    client: {
      name: "João Silva",
      documentNumber: "12345678900",
      documentType: "cpf",
      email: "joao@email.com",
      phone: "11999999999",
      address: {
        zipCode: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
    },
    additionalInfo: "",
  },
  {
    id: "N2",
    clientName: "Maria Santos",
    documentNumber: "12345678000190",
    key: "43231170000000000000000000000000000000000002",
    type: "NF-e",
    issueDate: new Date().toISOString().split('T')[0],
    totalValue: 120.00,
    status: "Emitida",
    xmlLink: "",
    items: [],
    cfop: "5102",
    operationNature: "Venda de mercadoria",
    taxes: { icms: 18, iss: 0, pis: 1.65, cofins: 7.6 },
    client: {
      name: "Maria Santos",
      documentNumber: "12345678000190",
      documentType: "cnpj",
      email: "maria@email.com",
      phone: "11988888888",
      address: {
        zipCode: "04547000",
        street: "Rua Funchal",
        number: "200",
        complement: "Sala 10",
        neighborhood: "Vila Olímpia",
        city: "São Paulo",
        state: "SP",
      },
    },
    additionalInfo: "",
  },
  {
    id: "N3",
    clientName: "Pedro Costa",
    documentNumber: "98765432100",
    key: "43231170000000000000000000000000000000000003",
    type: "NFS-e",
    issueDate: "2025-10-30",
    totalValue: 980.99,
    status: "Cancelada",
    xmlLink: "/xml/nfs_54321.xml",
    items: [],
    cfop: "5933",
    operationNature: "Prestação de serviço",
    taxes: { icms: 0, iss: 5, pis: 0.65, cofins: 3 },
    client: {
      name: "Pedro Costa",
      documentNumber: "98765432100",
      documentType: "cpf",
      email: "pedro@email.com",
      phone: "11977777777",
      address: {
        zipCode: "01310100",
        street: "Avenida Paulista",
        number: "500",
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
    },
    additionalInfo: "Nota cancelada por solicitação do cliente",
  },
];

const Invoices = () => {
  const { toast } = useToast();
  const { invoices, getInvoices, emitInvoice, cancelInvoice } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [typeFilter, setTypeFilter] = useState<string>("Todos");
  
  // URL base da API
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const getAuthToken = () => localStorage.getItem('authToken');

  // Estados para o Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState<InvoiceFormData>(initialNewInvoiceData);

  // Carregar invoices ao montar o componente
  useEffect(() => {
    getInvoices();
  }, []);

  // Lógica do Modal de Emissão

  // 1. Abre modal para NOVA emissão
  const handleOpenNewInvoiceModal = () => {
    setInvoiceFormData(initialNewInvoiceData);
    setIsModalOpen(true);
  };

  // 2. Ação de 'Emitir' ou 'Salvar'
  const handleSaveInvoice = async (data: InvoiceFormData) => {
    // Por enquanto, apenas recarregar a lista
    await getInvoices();
    setIsModalOpen(false);
  };

  // Funções Auxiliares (Design)

  const getStatusBadge = (status: InvoiceType['status']) => {
    const variants = {
      "authorized": "default" as const,
      "issued": "secondary" as const,
      "cancelled": "destructive" as const,
      "rejected": "destructive" as const,
      "denied": "destructive" as const,
      "draft": "outline" as const,
    };
    return variants[status] || "secondary";
  };

  const getStatusLabel = (status: InvoiceType['status']) => {
    const labels = {
      "authorized": "Autorizada",
      "issued": "Emitida",
      "cancelled": "Cancelada",
      "rejected": "Rejeitada",
      "denied": "Negada",
      "draft": "Rascunho",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: InvoiceType['status']) => {
    const icons = {
      "authorized": CheckCircle2,
      "issued": ClipboardList,
      "cancelled": XCircle,
      "rejected": XCircle,
      "denied": XCircle,
      "draft": FileText,
    };
    const Icon = icons[status] || ClipboardList;
    return <Icon className="h-4 w-4" />;
  };

  const getInvoiceTypeLabel = (type: string) => {
    if (type.toLowerCase() === 'nfse' || type === 'NFS-e') {
      return 'Nota Fiscal de Serviço Eletrônica – NFS-e';
    }
    return 'Nota Fiscal Eletrônica – NF-e';
  };

  const getInvoiceTypeFullTitle = (type: string) => {
    if (type.toLowerCase() === 'nfse' || type === 'NFS-e') {
      return 'Nota Fiscal de Serviços';
    }
    return 'Nota Fiscal de Produtos';
  };

  // Função para formatar o ID da ordem de serviço com zeros à esquerda
  const formatOrderId = (id: string | number | undefined): string => {
    if (!id) return 'N/A';
    
    let numId: number;

    if (typeof id === 'number') {
      numId = id;
    } else {
      // Se for string (UUID), extrai todos os números e forma um número
      const numbers = id.replace(/\D/g, ''); // Remove tudo que não é dígito
      if (numbers.length > 0) {
        // Pega os primeiros 5 dígitos ou todos se tiver menos
        numId = parseInt(numbers.substring(0, 5), 10) || 1;
      } else {
        // Fallback: usa hash simples do string
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
          hash = ((hash << 5) - hash) + id.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        numId = Math.abs(hash) % 99999 || 1;
      }
    }

    return `OS-${String(numId).padStart(5, '0')}`;
  };

  const getInvoiceTypeShortLabel = (type: string) => {
    if (type.toLowerCase() === 'nfse' || type === 'NFS-e') {
      return 'NFS-e';
    }
    return 'NF-e';
  };

  // Função para imprimir nota fiscal
  const handlePrintInvoice = (invoice: InvoiceType) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir a janela de impressão",
        variant: "destructive",
      });
      return;
    }

    // Formatar endereço do cliente
    const clientAddress = [
      invoice.address_street,
      invoice.address_number,
      invoice.address_complement,
      invoice.address_neighborhood,
      invoice.address_city && invoice.address_state 
        ? `${invoice.address_city} - ${invoice.address_state}`
        : invoice.address_city || invoice.address_state,
      invoice.address_zip_code ? `CEP: ${invoice.address_zip_code}` : ''
    ].filter(Boolean).join(', ');

    // Formatar data de emissão
    const issueDate = invoice.issue_date 
      ? new Date(invoice.issue_date).toLocaleDateString('pt-BR')
      : 'N/A';

    // Formatar data de autorização se existir
    const authDate = invoice.authorization_date
      ? new Date(invoice.authorization_date).toLocaleDateString('pt-BR')
      : null;

    // Formatar itens da nota
    const itemsHtml = invoice.items && invoice.items.length > 0
      ? invoice.items.map((item, index) => {
          // Usar os nomes corretos dos campos (snake_case do banco)
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unit_price || 0);
          const subtotal = Number(item.subtotal || 0);
          
          // Formatar quantidade: se for inteiro, mostrar sem decimais; senão, mostrar até 3 casas
          const formattedQuantity = quantity % 1 === 0 
            ? quantity.toString() 
            : quantity.toFixed(3).replace('.', ',').replace(/0+$/, '').replace(/,$/, '');
          
          return `
            <tr>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.item_number || index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.description || 'N/A'}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${formattedQuantity}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">R$ ${unitPrice.toFixed(2).replace('.', ',')}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="5" style="text-align: center; padding: 8px; border: 1px solid #ddd;">Nenhum item cadastrado</td></tr>';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${getInvoiceTypeLabel(invoice.type)} N° ${invoice.number}</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
              font-size: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
            }
            .invoice-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section h3 {
              border-bottom: 2px solid #333;
              padding-bottom: 5px;
              margin-bottom: 10px;
              font-size: 14px;
              text-transform: uppercase;
            }
            .field {
              margin-bottom: 5px;
              display: flex;
            }
            .label {
              font-weight: bold;
              min-width: 120px;
              color: #333;
            }
            .value {
              color: #000;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              background: #f5f5f5;
              padding: 10px;
              border: 1px solid #ddd;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
            }
            .items-table td {
              padding: 8px;
              border: 1px solid #ddd;
              font-size: 11px;
            }
            .totals {
              margin-top: 20px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 5px;
            }
            .total-label {
              font-weight: bold;
              min-width: 150px;
              text-align: right;
              padding-right: 10px;
            }
            .total-value {
              min-width: 120px;
              text-align: right;
            }
            .total-final {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 10px;
              border-radius: 3px;
              font-weight: bold;
              font-size: 11px;
              margin-left: 10px;
            }
            .status-authorized {
              background: #d4edda;
              color: #155724;
            }
            .status-issued {
              background: #d1ecf1;
              color: #0c5460;
            }
            .status-draft {
              background: #fff3cd;
              color: #856404;
            }
            .status-cancelled {
              background: #f8d7da;
              color: #721c24;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${getInvoiceTypeLabel(invoice.type)}</div>
            <div class="subtitle">${formatOrderId(invoice.service_order_id_display || invoice.service_order_id)} - Série ${invoice.series}</div>
            ${invoice.access_key ? `<div style="font-size: 10px; margin-top: 5px;">Chave de Acesso: ${invoice.access_key}</div>` : ''}
          </div>

          <div class="invoice-info">
            <div class="section">
              <h3>Dados da Nota</h3>
              <div class="field">
                <span class="label">Tipo:</span>
                <span class="value">${getInvoiceTypeLabel(invoice.type)}</span>
              </div>
              <div class="field">
                <span class="label">Número:</span>
                <span class="value">${invoice.number}</span>
              </div>
              <div class="field">
                <span class="label">Série:</span>
                <span class="value">${invoice.series}</span>
              </div>
              <div class="field">
                <span class="label">Data de Emissão:</span>
                <span class="value">${issueDate}</span>
              </div>
              ${authDate ? `
              <div class="field">
                <span class="label">Data de Autorização:</span>
                <span class="value">${authDate}</span>
              </div>
              ` : ''}
              ${invoice.protocol_number ? `
              <div class="field">
                <span class="label">Protocolo:</span>
                <span class="value">${invoice.protocol_number}</span>
              </div>
              ` : ''}
              <div class="field">
                <span class="label">Status:</span>
                <span class="value">
                  ${getStatusLabel(invoice.status)}
                  <span class="status-badge status-${invoice.status}">${getStatusLabel(invoice.status)}</span>
                </span>
              </div>
            </div>

            <div class="section">
              <h3>Cliente (Destinatário)</h3>
              <div class="field">
                <span class="label">Nome:</span>
                <span class="value">${invoice.clientName || 'N/A'}</span>
              </div>
              ${invoice.cpf ? `
              <div class="field">
                <span class="label">CPF/CNPJ:</span>
                <span class="value">${invoice.cpf}</span>
              </div>
              ` : ''}
              ${invoice.clientEmail ? `
              <div class="field">
                <span class="label">E-mail:</span>
                <span class="value">${invoice.clientEmail}</span>
              </div>
              ` : ''}
              ${invoice.clientPhone ? `
              <div class="field">
                <span class="label">Telefone:</span>
                <span class="value">${invoice.clientPhone}</span>
              </div>
              ` : ''}
              ${clientAddress ? `
              <div class="field">
                <span class="label">Endereço:</span>
                <span class="value">${clientAddress}</span>
              </div>
              ` : ''}
            </div>
          </div>

          ${invoice.operation_nature ? `
          <div class="section">
            <h3>Natureza da Operação</h3>
            <p>${invoice.operation_nature}</p>
          </div>
          ` : ''}

          ${invoice.items && invoice.items.length > 0 ? `
          <div class="section">
            <h3>Itens da Nota Fiscal</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 5%;">Item</th>
                  <th style="width: 50%;">Descrição</th>
                  <th style="width: 10%; text-align: center;">Qtd</th>
                  <th style="width: 15%; text-align: right;">Valor Unit.</th>
                  <th style="width: 20%; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="totals">
            <div class="total-row">
              <span class="total-label">Subtotal:</span>
              <span class="total-value">R$ ${Number(invoice.subtotal || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="total-row">
              <span class="total-label">Impostos:</span>
              <span class="total-value">R$ ${Number(invoice.total_taxes || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="total-row total-final">
              <span class="total-label">TOTAL:</span>
              <span class="total-value">R$ ${Number(invoice.total_amount || 0).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          ${invoice.additional_info ? `
          <div class="section">
            <h3>Informações Adicionais</h3>
            <p>${invoice.additional_info}</p>
          </div>
          ` : ''}

          ${invoice.cancellation_reason ? `
          <div class="section">
            <h3>Motivo do Cancelamento</h3>
            <p style="color: #721c24; font-weight: bold;">${invoice.cancellation_reason}</p>
            ${invoice.cancellation_date ? `<p style="font-size: 10px;">Data: ${new Date(invoice.cancellation_date).toLocaleDateString('pt-BR')}</p>` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p><strong>WorkFlow OS</strong> - Sistema de Gestão para Oficinas</p>
            <p>Desenvolvido pela Forward Up</p>
            <p>Data de impressão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Aguarda o carregamento e imprime
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    toast({
      title: "Impressão",
      description: "Abrindo nota fiscal para impressão",
    });
  };

  // Lógica de Filtro

  function normalizeText(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  const filteredInvoices = invoices.filter(inv => {
    const normalizedSearch = normalizeText(searchTerm);
    
    // Formatar número da OS para busca
    const orderIdFormatted = formatOrderId(inv.service_order_id_display || inv.service_order_id);
    
    const matchesSearch = [
      inv.clientName || '',
      inv.access_key || '',
      inv.number?.toString() || '',
      orderIdFormatted, // Número da OS formatado (ex: OS-00001)
      normalizeText(orderIdFormatted), // Versão normalizada para busca
      inv.service_order_id_display || inv.service_order_id || '', // ID original também
    ].some(field => normalizeText(field).includes(normalizedSearch));
    
    const matchesStatus = statusFilter === "Todos" || inv.status === statusFilter;
    
    // Filtro por tipo de nota
    const invoiceType = inv.type?.toLowerCase() || '';
    const matchesType = typeFilter === "Todos" || 
      (typeFilter === "NF-e" && (invoiceType === 'nfe' || invoiceType === 'nf-e')) ||
      (typeFilter === "NFS-e" && (invoiceType === 'nfse' || invoiceType === 'nfs-e'));
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusOptions = [
    { value: "Todos", label: "Todos", count: invoices.length },
    { value: "authorized", label: "Autorizada", count: invoices.filter(a => a.status === "authorized").length },
    { value: "issued", label: "Emitida", count: invoices.filter(a => a.status === "issued").length },
    { value: "cancelled", label: "Cancelada", count: invoices.filter(a => a.status === "cancelled").length },
    { value: "draft", label: "Rascunho", count: invoices.filter(a => a.status === "draft").length },
  ];

  return (
    <>
      <VersionRestrictionNotice featureName="Notas Fiscais" />
      <div className="space-y-6">
      {/* MODAL DE EMISSÃO */}
      <InvoiceModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        currentInvoice={invoiceFormData}
        setCurrentInvoice={setInvoiceFormData}
        onSave={handleSaveInvoice}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Emissão de Notas Fiscais</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie suas NF-e (Produtos) e NFS-e (Serviços)</p>
        </div>
        <Button 
          className="gap-2 w-full sm:w-auto opacity-50 cursor-not-allowed" 
          onClick={() => {}}
          disabled={true}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Emitir Nova Nota</span>
          <span className="sm:hidden">Nova Nota</span>
        </Button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
                placeholder="Buscar por cliente, nº da ordem de serviço..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Filtro por Tipo de Nota */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground self-center">Tipo:</span>
          {[
            { value: "Todos", label: "Todos" },
            { value: "NF-e", label: "Nota Fiscal de Produtos" },
            { value: "NFS-e", label: "Nota Fiscal de Serviços" },
          ].map((option) => {
            const count = option.value === "Todos" 
              ? invoices.length 
              : invoices.filter(inv => {
                  const invoiceType = inv.type?.toLowerCase() || '';
                  return option.value === "NF-e" 
                    ? (invoiceType === 'nfe' || invoiceType === 'nf-e')
                    : (invoiceType === 'nfse' || invoiceType === 'nfs-e');
                }).length;
            
            return (
              <Button
                key={option.value}
                variant={typeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(option.value)}
                className="whitespace-nowrap"
              >
                <span className="hidden sm:inline">{option.label} ({count})</span>
                <span className="sm:hidden">{option.value === "Todos" ? "Todos" : option.value} ({count})</span>
              </Button>
            );
          })}
        </div>

        {/* Filtro por Status */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground self-center">Status:</span>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
              className="whitespace-nowrap"
            >
              <span className="hidden sm:inline">{option.label} ({option.count})</span>
              <span className="sm:hidden">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de Notas Fiscais */}
      <div className="grid gap-4">
        {filteredInvoices.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Nenhuma nota fiscal encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices
            .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
            .map((invoice) => {
              return (
              <Card 
                key={invoice.id} 
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row items-start w-full gap-4 lg:gap-0">

                    {/* COLUNA 1 — Dados da nota */}
                    <div className="flex-1 w-full lg:max-w-[450px] space-y-2">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">
                          {getInvoiceTypeFullTitle(invoice.type)} - {formatOrderId(invoice.service_order_id_display || invoice.service_order_id)}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Badge variant={getStatusBadge(invoice.status)} className="flex items-center gap-1 text-xs">
                          {getStatusIcon(invoice.status)}
                          <span className="hidden sm:inline">{getStatusLabel(invoice.status)}</span>
                          <span className="sm:hidden">{getStatusLabel(invoice.status).slice(0, 3)}</span>
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3" />
                          R$ {Number(invoice.total_amount || 0).toFixed(2).replace('.', ',')}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{invoice.clientName || 'Cliente não encontrado'}</p>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-[280px] flex items-center justify-start lg:justify-center">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground break-words">
                            {invoice.access_key ? (
                              <>
                                <span className="hidden sm:inline">Chave: {invoice.access_key.slice(0, 10)}...</span>
                                <span className="sm:hidden">Chave: {invoice.access_key.slice(0, 8)}...</span>
                              </>
                            ) : 'Rascunho'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Emissão: {new Date(invoice.issue_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>


                    {/* COLUNA 3 — Botões (sempre à direita) */}
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:ml-auto justify-start lg:justify-end">
                      {/* Botão de Impressão - sempre visível */}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Funcionalidade indisponível na versão de teste"
                        onClick={() => {}}
                        className="flex-shrink-0 opacity-50 cursor-not-allowed"
                        disabled={true}
                      >
                        <Printer className="h-4 w-4" />
                        <span className="sr-only">Imprimir</span>
                      </Button>
                      {invoice.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Funcionalidade indisponível na versão de teste"
                          onClick={() => {}}
                          className="flex-shrink-0 opacity-50 cursor-not-allowed"
                          disabled={true}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">Emitir</span>
                        </Button>
                      )}
                      {/* Botão de XML - aparece quando houver XML disponível */}
                      {(invoice.status === 'authorized' || invoice.status === 'issued') && invoice.xml_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Funcionalidade indisponível na versão de teste"
                          onClick={() => {}}
                          className="flex-shrink-0 opacity-50 cursor-not-allowed"
                          disabled={true}
                        >
                          <ClipboardList className="h-4 w-4" />
                          <span className="sr-only">Baixar XML</span>
                        </Button>
                      )}
                      {/* Botão de PDF - aparece quando houver PDF disponível */}
                      {(invoice.status === 'authorized' || invoice.status === 'issued') && invoice.pdf_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Funcionalidade indisponível na versão de teste"
                          onClick={() => {}}
                          className="flex-shrink-0 opacity-50 cursor-not-allowed"
                          disabled={true}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">Baixar PDF</span>
                        </Button>
                      )}
                      {invoice.status === 'issued' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Funcionalidade indisponível na versão de teste"
                          onClick={() => {}}
                          className="flex-shrink-0 opacity-50 cursor-not-allowed"
                          disabled={true}
                        >
                          <Search className="h-4 w-4" />
                          <span className="sr-only">Consultar Status</span>
                        </Button>
                      )}
                      {(invoice.status === 'issued' || invoice.status === 'authorized') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Funcionalidade indisponível na versão de teste"
                          onClick={() => {}}
                          className="flex-shrink-0 opacity-50 cursor-not-allowed"
                          disabled={true}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Cancelar Nota</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
        )}
      </div>
    </div>
    </>
  );
};

export default Invoices;
